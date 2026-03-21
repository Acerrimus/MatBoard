from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


class ClubCreate(BaseModel):
    name: str


class ClubJoin(BaseModel):
    invite_code: str


@router.post("/")
def create_club(
    body: ClubCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Club name cannot be empty")

    slug = body.name.strip().lower()
    slug = "-".join(slug.split())
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    club_res = client.table("clubs") \
        .insert({
            "name": body.name.strip(),
            "slug": slug,
            "owner_id": user.id,
        }) \
        .execute()

    if not club_res.data:
        raise HTTPException(status_code=500, detail="Failed to create club")

    club = club_res.data[0]

    client.table("club_memberships") \
        .insert({
            "club_id": club["id"],
            "user_id": user.id,
            "role": "coach",
        }) \
        .execute()

    return club


@router.post("/join")
def join_club(
    body: ClubJoin,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    club_res = client.table("clubs") \
        .select("id, name") \
        .eq("invite_code", body.invite_code.strip().upper()) \
        .execute()

    if not club_res.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    club = club_res.data[0]

    existing = client.table("club_memberships") \
        .select("id") \
        .eq("club_id", club["id"]) \
        .eq("user_id", user.id) \
        .execute()

    if existing.data:
        raise HTTPException(status_code=409, detail="Already a member of this club")

    client.table("club_memberships") \
        .insert({
            "club_id": club["id"],
            "user_id": user.id,
            "role": "coach",
        }) \
        .execute()

    return club