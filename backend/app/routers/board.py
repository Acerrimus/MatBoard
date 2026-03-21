from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


class BoardAdd(BaseModel):
    move_id: str


@router.get("/")
def get_my_board(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("user_board") \
        .select("""
            *,
            move:moves(
                id, name, slug, description,
                scoring_value, risk_rating,
                from_position:positions!from_position_id(id, name, slug),
                to_position:positions!to_position_id(id, name, slug)
            )
        """) \
        .eq("user_id", user.id) \
        .order("added_at", desc=False) \
        .execute()

    # Attach progress to each board move if it exists
    progress_res = client.table("user_move_progress") \
        .select("move_id, confidence, is_favourite") \
        .eq("user_id", user.id) \
        .execute()

    progress_map = {p["move_id"]: p for p in (progress_res.data or [])}

    for item in response.data:
        move_id = item["move"]["id"]
        item["progress"] = progress_map.get(move_id, None)

    return response.data


@router.post("/")
def add_to_board(
    body: BoardAdd,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    # Check move exists
    move_res = client.table("moves") \
        .select("id") \
        .eq("id", body.move_id) \
        .execute()

    if not move_res.data:
        raise HTTPException(status_code=404, detail="Move not found")

    # Upsert — safe to call repeatedly, won't duplicate
    response = client.table("user_board") \
        .upsert(
            {"user_id": user.id, "move_id": body.move_id},
            on_conflict="user_id,move_id"
        ) \
        .execute()

    return response.data[0]


@router.delete("/{move_id}")
def remove_from_board(
    move_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    client.table("user_board") \
        .delete() \
        .eq("user_id", user.id) \
        .eq("move_id", move_id) \
        .execute()

    return {"status": "removed"}