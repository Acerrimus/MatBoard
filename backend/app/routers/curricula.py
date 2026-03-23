from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user, get_supabase_client

router = APIRouter(tags=["curricula"])


class CreateCurriculumBody(BaseModel):
    name: str
    description: Optional[str] = None


class CreateChainBody(BaseModel):
    name: str


class SetChainMovesBody(BaseModel):
    move_ids: list[str]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _require_coach(supabase, user):
    resp = (
        supabase.table("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("role", "coach")
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=403, detail="Not a coach in any club")
    return resp.data[0]["club_id"]


async def _require_curriculum_owner(supabase, curriculum_id, club_id):
    resp = (
        supabase.table("curricula")
        .select("*")
        .eq("id", curriculum_id)
        .eq("club_id", club_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return resp.data[0]


async def _require_chain_owner(supabase, chain_id, club_id):
    resp = (
        supabase.table("curriculum_chains")
        .select("*, curricula!inner(club_id)")
        .eq("id", chain_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Chain not found")
    if resp.data[0]["curricula"]["club_id"] != club_id:
        raise HTTPException(status_code=403, detail="Not your club's chain")
    return resp.data[0]


# ── List curricula ─────────────────────────────────────────────────────────────

@router.get("/")
async def list_curricula(
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    resp = (
        supabase.table("curricula")
        .select("*")
        .eq("club_id", club_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


# ── Get curriculum with chains and moves ───────────────────────────────────────

@router.get("/{curriculum_id}")
async def get_curriculum(
    curriculum_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    curriculum = await _require_curriculum_owner(supabase, curriculum_id, club_id)

    chains_resp = (
        supabase.table("curriculum_chains")
        .select("id, name, position")
        .eq("curriculum_id", curriculum_id)
        .order("position")
        .execute()
    )

    chains = []
    for chain in chains_resp.data:
        chain_moves_resp = (
            supabase.table("curriculum_chain_moves")
            .select("move_id, position")
            .eq("chain_id", chain["id"])
            .order("position")
            .execute()
        )

        move_ids = [cm["move_id"] for cm in chain_moves_resp.data]
        moves_map = {}
        if move_ids:
            moves_resp = (
                supabase.table("moves")
                .select("id, name, slug, from_position:positions!from_position_id(id, name, slug), to_position:positions!to_position_id(id, name, slug)")
                .in_("id", move_ids)
                .execute()
            )
            moves_map = {m["id"]: m for m in moves_resp.data}

        moves = []
        for cm in chain_moves_resp.data:
            move = moves_map.get(cm["move_id"])
            if move:
                moves.append({**move, "position": cm["position"]})

        chains.append({
            "id": chain["id"],
            "name": chain["name"],
            "position": chain["position"],
            "moves": moves,
        })

    return {
        **curriculum,
        "chains": chains,
    }


# ── Create curriculum ─────────────────────────────────────────────────────────

@router.post("/")
async def create_curriculum(
    body: CreateCurriculumBody,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    resp = (
        supabase.table("curricula")
        .insert({
            "club_id": club_id,
            "created_by": user.id,
            "name": body.name,
            "description": body.description,
        })
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create curriculum")
    return resp.data[0]


# ── Delete curriculum ─────────────────────────────────────────────────────────

@router.delete("/{curriculum_id}")
async def delete_curriculum(
    curriculum_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_curriculum_owner(supabase, curriculum_id, club_id)
    supabase.table("curricula").delete().eq("id", curriculum_id).execute()
    return {"deleted": True}


# ── Add chain to curriculum ───────────────────────────────────────────────────

@router.post("/{curriculum_id}/chains")
async def add_chain(
    curriculum_id: str,
    body: CreateChainBody,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_curriculum_owner(supabase, curriculum_id, club_id)

    # Get next position
    existing = (
        supabase.table("curriculum_chains")
        .select("position")
        .eq("curriculum_id", curriculum_id)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    next_pos = (existing.data[0]["position"] + 1) if existing.data else 0

    resp = (
        supabase.table("curriculum_chains")
        .insert({
            "curriculum_id": curriculum_id,
            "name": body.name,
            "position": next_pos,
        })
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create chain")
    return resp.data[0]


# ── Delete chain ──────────────────────────────────────────────────────────────

@router.delete("/{curriculum_id}/chains/{chain_id}")
async def delete_chain(
    curriculum_id: str,
    chain_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_chain_owner(supabase, chain_id, club_id)
    supabase.table("curriculum_chains").delete().eq("id", chain_id).execute()
    return {"deleted": True}


# ── Set moves in a chain (replace all) ────────────────────────────────────────

@router.put("/{curriculum_id}/chains/{chain_id}/moves")
async def set_chain_moves(
    curriculum_id: str,
    chain_id: str,
    body: SetChainMovesBody,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_chain_owner(supabase, chain_id, club_id)

    # Clear existing
    supabase.table("curriculum_chain_moves").delete().eq("chain_id", chain_id).execute()

    # Insert new
    if body.move_ids:
        rows = [
            {"chain_id": chain_id, "move_id": mid, "position": i}
            for i, mid in enumerate(body.move_ids)
        ]
        supabase.table("curriculum_chain_moves").insert(rows).execute()

    return {"updated": True}


# ── Add single move to chain ─────────────────────────────────────────────────

@router.post("/{curriculum_id}/chains/{chain_id}/moves/{move_id}")
async def add_move_to_chain(
    curriculum_id: str,
    chain_id: str,
    move_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_chain_owner(supabase, chain_id, club_id)

    existing = (
        supabase.table("curriculum_chain_moves")
        .select("position")
        .eq("chain_id", chain_id)
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    next_pos = (existing.data[0]["position"] + 1) if existing.data else 0

    resp = (
        supabase.table("curriculum_chain_moves")
        .insert({"chain_id": chain_id, "move_id": move_id, "position": next_pos})
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to add move")
    return resp.data[0]


# ── Remove move from chain ────────────────────────────────────────────────────

@router.delete("/{curriculum_id}/chains/{chain_id}/moves/{move_id}")
async def remove_move_from_chain(
    curriculum_id: str,
    chain_id: str,
    move_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_chain_owner(supabase, chain_id, club_id)
    supabase.table("curriculum_chain_moves").delete().eq("chain_id", chain_id).eq("move_id", move_id).execute()
    return {"deleted": True}