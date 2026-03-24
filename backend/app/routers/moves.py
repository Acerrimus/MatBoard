from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user, get_supabase_client
import re

router = APIRouter()


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_-]+', '-', s)
    return s


class PersonalMoveCreate(BaseModel):
    name: str
    from_position_id: str
    to_position_id: str
    description: Optional[str] = ""


@router.get("/")
def get_moves(
    client=Depends(get_supabase_client)
):
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
    client=Depends(get_supabase_client)
):
    res = client.table("moves") \
        .select("""
            id, name, slug, description,
            scoring_value, risk_rating, sport,
            club_id, created_by,
            from_position:positions!from_position_id(id, name, slug),
            to_position:positions!to_position_id(id, name, slug)
        """) \
        .eq("slug", slug) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Move not found")
    return res.data


@router.post("/personal")
def create_personal_move(
    body: PersonalMoveCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Move name cannot be empty")

    slug = slugify(body.name)

    # Make slug unique by appending user id fragment if needed
    existing = client.table("moves") \
        .select("id") \
        .eq("slug", slug) \
        .execute()

    if existing.data:
        slug = f"{slug}-{user.id[:8]}"

    res = client.table("moves").insert({
        "name":             body.name.strip(),
        "slug":             slug,
        "description":      body.description or "",
        "from_position_id": body.from_position_id,
        "to_position_id":   body.to_position_id,
        "club_id":          None,
        "created_by":       user.id,
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create move")

    return res.data[0]