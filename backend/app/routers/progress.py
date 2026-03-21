from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.auth import get_current_user, get_supabase_client

router = APIRouter()

# ── Request body schema ───────────────────────────────────────────────────────
class ProgressUpsert(BaseModel):
    move_id: str
    confidence: int = Field(..., ge=1, le=5)   # 1–5, required
    is_favourite: Optional[bool] = False

# ── GET all progress for current user ────────────────────────────────────────
@router.get("/")
def get_my_progress(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("user_move_progress") \
        .select("*, move:moves(id, name, slug)") \
        .eq("user_id", user.id) \
        .execute()
    return response.data

# ── GET progress for one move ─────────────────────────────────────────────────
@router.get("/{move_id}")
def get_progress_for_move(
    move_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("user_move_progress") \
        .select("*") \
        .eq("user_id", user.id) \
        .eq("move_id", move_id) \
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="No progress found for this move")
    return response.data[0]

# ── POST upsert a rating ──────────────────────────────────────────────────────
@router.post("/")
def upsert_progress(
    body: ProgressUpsert,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("user_move_progress") \
        .upsert({
            "user_id": user.id,
            "move_id": body.move_id,
            "confidence": body.confidence,
            "is_favourite": body.is_favourite,
        }, on_conflict="user_id,move_id") \
        .execute()
    return response.data[0]

# ── DELETE a rating ───────────────────────────────────────────────────────────
@router.delete("/{move_id}")
def delete_progress(
    move_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    client.table("user_move_progress") \
        .delete() \
        .eq("user_id", user.id) \
        .eq("move_id", move_id) \
        .execute()
    return {"status": "deleted"}