from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


class ChainCreate(BaseModel):
    name: str


class ChainRename(BaseModel):
    name: str


class ChainMovesUpdate(BaseModel):
    move_ids: List[str]  # ordered list — position derived from index


@router.get("/")
def get_my_chains(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    chains_res = client.table("chains") \
        .select("*") \
        .eq("user_id", user.id) \
        .order("created_at", desc=False) \
        .execute()

    if not chains_res.data:
        return []

    chain_ids = [c["id"] for c in chains_res.data]

    # Fetch all chain_moves for these chains in one query
    moves_res = client.table("chain_moves") \
        .select("""
            *,
            move:moves(
                id, name, slug, description,
                scoring_value, risk_rating,
                from_position:positions!from_position_id(id, name, slug),
                to_position:positions!to_position_id(id, name, slug)
            )
        """) \
        .in_("chain_id", chain_ids) \
        .order("position", desc=False) \
        .execute()

    # Fetch progress for this user
    progress_res = client.table("user_move_progress") \
        .select("move_id, confidence, is_favourite") \
        .eq("user_id", user.id) \
        .execute()

    progress_map = {p["move_id"]: p for p in (progress_res.data or [])}

    # Attach progress to each chain move
    for item in moves_res.data:
        move_id = item["move"]["id"]
        item["progress"] = progress_map.get(move_id, None)

    # Group moves back onto their chains
    moves_by_chain = {}
    for item in moves_res.data:
        cid = item["chain_id"]
        moves_by_chain.setdefault(cid, []).append(item)

    for chain in chains_res.data:
        chain["moves"] = moves_by_chain.get(chain["id"], [])

    return chains_res.data


@router.post("/")
def create_chain(
    body: ChainCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Chain name cannot be empty")

    response = client.table("chains") \
        .insert({"user_id": user.id, "name": body.name.strip()}) \
        .execute()

    return response.data[0]


@router.patch("/{chain_id}/rename")
def rename_chain(
    chain_id: str,
    body: ChainRename,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    # Verify ownership
    existing = client.table("chains") \
        .select("id") \
        .eq("id", chain_id) \
        .eq("user_id", user.id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Chain not found")

    response = client.table("chains") \
        .update({"name": body.name.strip()}) \
        .eq("id", chain_id) \
        .execute()

    return response.data[0]


@router.put("/{chain_id}/moves")
def set_chain_moves(
    chain_id: str,
    body: ChainMovesUpdate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    """
    Replace the full ordered move list for a chain.
    We delete existing entries and re-insert — simplest way to handle
    reordering and removal without diffing.
    """
    # Verify ownership
    existing = client.table("chains") \
        .select("id") \
        .eq("id", chain_id) \
        .eq("user_id", user.id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Chain not found")

    # Verify all moves are on the user's board
    board_res = client.table("user_board") \
        .select("move_id") \
        .eq("user_id", user.id) \
        .execute()

    board_move_ids = {row["move_id"] for row in board_res.data}
    for move_id in body.move_ids:
        if move_id not in board_move_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Move {move_id} is not on your board"
            )

    # Delete existing and re-insert in order
    client.table("chain_moves") \
        .delete() \
        .eq("chain_id", chain_id) \
        .execute()

    if body.move_ids:
        rows = [
            {"chain_id": chain_id, "move_id": mid, "position": i}
            for i, mid in enumerate(body.move_ids)
        ]
        client.table("chain_moves").insert(rows).execute()

    # Return the updated chain
    return get_my_chains(user=user, client=client)


@router.delete("/{chain_id}")
def delete_chain(
    chain_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    existing = client.table("chains") \
        .select("id") \
        .eq("id", chain_id) \
        .eq("user_id", user.id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Chain not found")

    # chain_moves cascade deletes automatically
    client.table("chains") \
        .delete() \
        .eq("id", chain_id) \
        .execute()

    return {"status": "deleted"}