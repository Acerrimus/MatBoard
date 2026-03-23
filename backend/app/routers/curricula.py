from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user, get_supabase_client

router = APIRouter(tags=["curricula"])


class CreateCurriculumBody(BaseModel):
    name: str
    description: Optional[str] = None


class AddItemBody(BaseModel):
    move_id: str
    position: int
    notes: Optional[str] = None


class ReorderBody(BaseModel):
    move_ids: list[str]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _require_coach(supabase, user):
    """Return the club the user coaches, or 403."""
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
    """Return the curriculum row or 404."""
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


# ── List curricula for my club ─────────────────────────────────────────────────

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


# ── Get single curriculum with items + move names ──────────────────────────────

@router.get("/{curriculum_id}")
async def get_curriculum(
    curriculum_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    curriculum = await _require_curriculum_owner(supabase, curriculum_id, club_id)

    items_resp = (
        supabase.table("curriculum_items")
        .select("id, move_id, position, notes")
        .eq("curriculum_id", curriculum_id)
        .order("position")
        .execute()
    )

    move_ids = [item["move_id"] for item in items_resp.data]
    moves_map = {}
    if move_ids:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug")
            .in_("id", move_ids)
            .execute()
        )
        moves_map = {m["id"]: m for m in moves_resp.data}

    items = []
    for item in items_resp.data:
        move = moves_map.get(item["move_id"])
        items.append({
            **item,
            "move": move,
        })

    return {
        **curriculum,
        "items": items,
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

    supabase.table("curriculum_items").delete().eq("curriculum_id", curriculum_id).execute()
    supabase.table("curricula").delete().eq("id", curriculum_id).execute()

    return {"deleted": True}


# ── Add move to curriculum ────────────────────────────────────────────────────

@router.post("/{curriculum_id}/items")
async def add_item(
    curriculum_id: str,
    body: AddItemBody,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_curriculum_owner(supabase, curriculum_id, club_id)

    resp = (
        supabase.table("curriculum_items")
        .insert({
            "curriculum_id": curriculum_id,
            "move_id": body.move_id,
            "position": body.position,
            "notes": body.notes,
        })
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to add item")
    return resp.data[0]


# ── Remove move from curriculum ───────────────────────────────────────────────

@router.delete("/{curriculum_id}/items/{move_id}")
async def remove_item(
    curriculum_id: str,
    move_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_curriculum_owner(supabase, curriculum_id, club_id)

    supabase.table("curriculum_items").delete().eq("curriculum_id", curriculum_id).eq("move_id", move_id).execute()
    return {"deleted": True}


# ── Reorder items ─────────────────────────────────────────────────────────────

@router.put("/{curriculum_id}/items")
async def reorder_items(
    curriculum_id: str,
    body: ReorderBody,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    club_id = await _require_coach(supabase, user)
    await _require_curriculum_owner(supabase, curriculum_id, club_id)

    # Delete all existing items and re-insert in order
    supabase.table("curriculum_items").delete().eq("curriculum_id", curriculum_id).execute()

    if body.move_ids:
        rows = [
            {"curriculum_id": curriculum_id, "move_id": mid, "position": i}
            for i, mid in enumerate(body.move_ids)
        ]
        supabase.table("curriculum_items").insert(rows).execute()

    return {"reordered": True}