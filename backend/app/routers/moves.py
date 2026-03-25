# backend/app/routers/moves.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from typing import Optional
from app.auth import get_current_user, get_supabase_client
from app.utils import slugify, make_unique_slug, verify_positions_exist

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PersonalMoveCreate(BaseModel):
    name: str
    from_position_id: str
    to_position_id: str
    description: Optional[str] = ""

    @validator("name")
    def name_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Move name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Move name must be 100 characters or fewer")
        return v

    @validator("description")
    def description_valid(cls, v):
        if v and len(v) > 1000:
            raise ValueError("Description must be 1000 characters or fewer")
        return v or ""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def get_moves(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Returns all moves visible to the current user.
    RLS controls visibility:
      - Global moves (club_id NULL, created_by NULL) → everyone authenticated
      - Personal moves (club_id NULL, created_by = X) → creator only
      - Club moves (club_id = Y) → club members only
    """
    res = client.table("moves") \
        .select("""
            id, name, slug, description,
            scoring_value, risk_rating, sport,
            club_id, created_by,
            from_position:positions!from_position_id(id, name, slug),
            to_position:positions!to_position_id(id, name, slug)
        """) \
        .execute()
    return res.data or []


@router.get("/{slug}")
def get_move(
    slug: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Returns a single move by slug.
    RLS controls visibility — returns 404 if not visible to the user.
    """
    res = client.table("moves") \
        .select("""
            id, name, slug, description,
            scoring_value, risk_rating, sport,
            club_id, created_by,
            from_position:positions!from_position_id(id, name, slug),
            to_position:positions!to_position_id(id, name, slug)
        """) \
        .eq("slug", slug) \
        .maybeSingle() \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Move not found")
    return res.data


@router.post("/personal")
def create_personal_move(
    body: PersonalMoveCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Creates a personal move scoped to the authenticated user.
    - club_id is always NULL for personal moves
    - created_by is always the authenticated user
    - Both positions must exist in the DB
    - Name validated by schema (2-100 chars), also enforced by DB constraint
    """
    verify_positions_exist(body.from_position_id, body.to_position_id, client)

    slug = slugify(body.name)
    slug = make_unique_slug(slug, user.id[:8], client)

    res = client.table("moves").insert({
        "name":             body.name,
        "slug":             slug,
        "description":      body.description,
        "from_position_id": body.from_position_id,
        "to_position_id":   body.to_position_id,
        "club_id":          None,
        "created_by":       user.id,
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create move")

    return res.data[0]