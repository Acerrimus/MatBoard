from fastapi import APIRouter
from app.database import supabase

router = APIRouter()

@router.get("/")
def get_graph():
    positions = supabase.table("positions").select("id, name, slug, phase").execute()
    moves = supabase.table("moves").select(
        "id, name, slug, from_position_id, to_position_id, scoring_value, risk_rating, sport"
    ).execute()

    return {
        "positions": positions.data,
        "moves": moves.data,
    }