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

        # Sort by position to maintain chain order
        moves.sort(key=lambda m: m["position"])

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


# ── List curricula for club members (athletes + coaches) ──────────────────────

@router.get("/club/{club_id}")
async def list_club_curricula(
    club_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    Returns curricula with chains + moves for any club member.
    Includes both global seed curricula (club_id IS NULL) and
    club-owned curricula. Athletes get their own progress attached
    to each move.
    """
    # Verify membership
    membership_resp = (
        supabase.table("club_memberships")
        .select("role")
        .eq("club_id", club_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not membership_resp.data:
        raise HTTPException(status_code=403, detail="Not a member of this club")

    # Fetch global curricula (club_id IS NULL) and club-owned curricula separately
    # then merge. Supabase python client does not support OR filters cleanly
    # across null and non-null in one query.
    global_resp = (
        supabase.table("curricula")
        .select("id, name, description, created_at")
        .is_("club_id", "null")
        .order("created_at")
        .execute()
    )
    club_resp = (
        supabase.table("curricula")
        .select("id, name, description, created_at")
        .eq("club_id", club_id)
        .order("created_at", desc=True)
        .execute()
    )

    # Global curricula first, then club-specific on top
    all_curricula = (global_resp.data or []) + (club_resp.data or [])

    if not all_curricula:
        return []

    curriculum_ids = [c["id"] for c in all_curricula]

    # Get all chains for all curricula in one query
    chains_resp = (
        supabase.table("curriculum_chains")
        .select("id, name, position, curriculum_id")
        .in_("curriculum_id", curriculum_ids)
        .order("position")
        .execute()
    )
    chain_ids = [c["id"] for c in chains_resp.data]

    # Get all chain moves in one query
    if chain_ids:
        chain_moves_resp = (
            supabase.table("curriculum_chain_moves")
            .select("chain_id, move_id, position")
            .in_("chain_id", chain_ids)
            .order("position")
            .execute()
        )
    else:
        chain_moves_resp = type("R", (), {"data": []})()

    # Collect all move IDs
    all_move_ids = list({cm["move_id"] for cm in chain_moves_resp.data})

    # Fetch moves with positions
    moves_map = {}
    if all_move_ids:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug, from_position:positions!from_position_id(id, name, slug), to_position:positions!to_position_id(id, name, slug)")
            .in_("id", all_move_ids)
            .execute()
        )
        moves_map = {m["id"]: m for m in moves_resp.data}

    # Fetch this user's progress for all relevant moves
    progress_map = {}
    if all_move_ids:
        progress_resp = (
            supabase.table("user_move_progress")
            .select("move_id, confidence, is_favourite")
            .eq("user_id", user.id)
            .in_("move_id", all_move_ids)
            .execute()
        )
        progress_map = {r["move_id"]: r for r in progress_resp.data}

    # Build chain moves lookup
    chain_moves_by_chain = {}
    for cm in chain_moves_resp.data:
        chain_moves_by_chain.setdefault(cm["chain_id"], []).append(cm)

    # Build chains lookup by curriculum
    chains_by_curriculum = {}
    for chain in chains_resp.data:
        cms = sorted(
            chain_moves_by_chain.get(chain["id"], []),
            key=lambda x: x["position"]
        )
        moves_list = []
        for cm in cms:
            move = moves_map.get(cm["move_id"])
            if move:
                prog = progress_map.get(cm["move_id"])
                moves_list.append({
                    **move,
                    "confidence": prog["confidence"] if prog else None,
                    "is_favourite": prog["is_favourite"] if prog else False,
                })
        chains_by_curriculum.setdefault(chain["curriculum_id"], []).append({
            "id": chain["id"],
            "name": chain["name"],
            "position": chain["position"],
            "moves": moves_list,
        })

    # Assemble final response
    result = []
    for curriculum in all_curricula:
        chains = chains_by_curriculum.get(curriculum["id"], [])
        result.append({
            **curriculum,
            "chains": chains,
        })

    return result