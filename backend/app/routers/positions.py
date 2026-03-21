from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user
from app.database import supabase

router = APIRouter()

@router.get("/")
def get_all_positions(user = Depends(get_current_user)):
    response = supabase.table("positions").select("*").execute()
    return response.data

@router.get("/{slug}")
def get_position(slug: str, user = Depends(get_current_user)):
    response = supabase.table("positions").select("*").eq("slug", slug).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Position not found")

    return response.data

@router.get("/{slug}/moves")
def get_moves_from_position(slug: str, user = Depends(get_current_user)):
    # first get the position
    position = supabase.table("positions").select("*").eq("slug", slug).execute()
    
    if not position.data:
        raise HTTPException(status_code=404, detail="Position not found")
    
    position_id = position.data[0]["id"]
    
    # then get all moves from that position
    moves = supabase.table("moves").select("*").eq("from_position_id", position_id).execute()
    
    return {
        "position": position.data[0],
        "moves": moves.data
    }