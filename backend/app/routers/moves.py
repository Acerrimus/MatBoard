from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user
from app.database import supabase

router = APIRouter()

@router.get("/")
def get_moves(user = Depends(get_current_user)):
    response = supabase.table("moves").select("*").execute()
    return response.data

@router.get("/{slug}")
def get_move(slug: str, user = Depends(get_current_user)):
    response = supabase.table("moves").select(
        "*, from_position:positions!from_position_id(*), to_position:positions!to_position_id(*)"
    ).eq("slug", slug).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Move not found")

    return response.data[0]