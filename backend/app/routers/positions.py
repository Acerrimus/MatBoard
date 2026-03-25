from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def get_all_positions(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Returns all positions visible to the current user.
    Uses the JWT-scoped client so RLS fires correctly.
    RLS controls:
      - Global positions (club_id NULL, created_by NULL) → everyone
      - Club positions (club_id = Y) → club members only
    """
    response = client.table("positions").select("*").execute()
    return response.data or []


@router.get("/{slug}")
def get_position(
    slug: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Returns a single position by slug.
    RLS controls visibility.
    """
    response = client.table("positions") \
        .select("*") \
        .eq("slug", slug) \
        .execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Position not found")

    return response.data


@router.get("/{slug}/moves")
def get_moves_from_position(
    slug: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Returns a position and all moves departing from it.
    Both position and moves are filtered by RLS — the user only
    sees moves they are entitled to see.
    """
    position_res = client.table("positions") \
        .select("*") \
        .eq("slug", slug) \
        .execute()

    if not position_res.data:
        raise HTTPException(status_code=404, detail="Position not found")

    position = position_res.data[0]
    position_id = position["id"]

    moves_res = client.table("moves") \
        .select("""
            id, name, slug, description,
            scoring_value, risk_rating, sport,
            club_id, created_by,
            from_position:positions!from_position_id(id, name, slug),
            to_position:positions!to_position_id(id, name, slug)
        """) \
        .eq("from_position_id", position_id) \
        .execute()

    return {
        "position": position,
        "moves": moves_res.data or [],
    }