# backend/app/routers/clubs.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ClubCreate(BaseModel):
    name: str


class ClubJoin(BaseModel):
    invite_code: str


class MemberRoleUpdate(BaseModel):
    role: Literal["athlete", "coach"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_club_owner(club_id: str, user_id: str, client):
    """Raises 403 if the authed user is not the owner of the club."""
    res = client.table("clubs") \
        .select("id") \
        .eq("id", club_id) \
        .eq("owner_id", user_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=403, detail="Not the club owner")


# ---------------------------------------------------------------------------
# Create club
# ---------------------------------------------------------------------------

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
        .upsert({
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


# ---------------------------------------------------------------------------
# Join club  (fix: joiners are athletes, not coaches)
# ---------------------------------------------------------------------------

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
            "role": "athlete",           # fixed: was hardcoded "coach"
        }) \
        .execute()

    return club


# ---------------------------------------------------------------------------
# GET /clubs/mine  — works for both athletes and coaches
# ---------------------------------------------------------------------------

@router.get("/mine")
def get_my_club(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    # Find the club this user belongs to via membership
    membership_res = client.table("club_memberships") \
        .select("club_id, role") \
        .eq("user_id", user.id) \
        .execute()

    if not membership_res.data:
        raise HTTPException(status_code=404, detail="Not a member of any club")

    # Take the first club for now — multi-club is a future concern
    membership = membership_res.data[0]
    club_id = membership["club_id"]
    membership_role = membership["role"]

    club_res = client.table("clubs") \
        .select("id, name, slug, owner_id, invite_code, created_at") \
        .eq("id", club_id) \
        .execute()

    if not club_res.data:
        raise HTTPException(status_code=404, detail="Club not found")

    club = club_res.data[0]

    # Only expose invite code to the club owner
    if club["owner_id"] != user.id:
        club.pop("invite_code", None)

    club["membership_role"] = membership_role
    return club


# ---------------------------------------------------------------------------
# GET /clubs/{club_id}/members  — coach/owner only
# ---------------------------------------------------------------------------

@router.get("/{club_id}/members")
def get_club_members(
    club_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    _assert_club_owner(club_id, user.id, client)

    memberships_res = client.table("club_memberships") \
        .select("user_id, role, created_at") \
        .eq("club_id", club_id) \
        .order("created_at") \
        .execute()

    if not memberships_res.data:
        return []

    # Fetch profiles for all members in one query
    user_ids = [m["user_id"] for m in memberships_res.data]

    profiles_res = client.table("profiles") \
        .select("id, display_name, avatar_url") \
        .in_("id", user_ids) \
        .execute()

    profiles_by_id = {p["id"]: p for p in (profiles_res.data or [])}

    members = []
    for m in memberships_res.data:
        profile = profiles_by_id.get(m["user_id"], {})
        members.append({
            "user_id": m["user_id"],
            "display_name": profile.get("display_name"),
            "avatar_url": profile.get("avatar_url"),
            "role": m["role"],
            "joined_at": m["created_at"],
        })

    return members


# ---------------------------------------------------------------------------
# GET /clubs/{club_id}/roster  — any club member (athletes + coaches)
# ---------------------------------------------------------------------------

@router.get("/{club_id}/roster")
def get_club_roster(
    club_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    # Verify requesting user is actually a member of this club
    membership_check = client.table("club_memberships") \
        .select("id") \
        .eq("club_id", club_id) \
        .eq("user_id", user.id) \
        .execute()

    if not membership_check.data:
        raise HTTPException(status_code=403, detail="Not a member of this club")

    memberships_res = client.table("club_memberships") \
        .select("user_id, role, created_at") \
        .eq("club_id", club_id) \
        .order("created_at") \
        .execute()

    if not memberships_res.data:
        return []

    user_ids = [m["user_id"] for m in memberships_res.data]

    profiles_res = client.table("profiles") \
        .select("id, display_name, avatar_url") \
        .in_("id", user_ids) \
        .execute()

    profiles_by_id = {p["id"]: p for p in (profiles_res.data or [])}

    members = []
    for m in memberships_res.data:
        profile = profiles_by_id.get(m["user_id"], {})
        members.append({
            "user_id": m["user_id"],
            "display_name": profile.get("display_name"),
            "avatar_url": profile.get("avatar_url"),
            "role": m["role"],
            "joined_at": m["created_at"],
        })

    return members


# ---------------------------------------------------------------------------
# PATCH /clubs/{club_id}/members/{user_id}/role  — coach/owner only
# ---------------------------------------------------------------------------

@router.patch("/{club_id}/members/{member_id}/role")
def update_member_role(
    club_id: str,
    member_id: str,
    body: MemberRoleUpdate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    _assert_club_owner(club_id, user.id, client)

    # Prevent owner demoting themselves
    if member_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own role"
        )

    res = client.table("club_memberships") \
        .update({"role": body.role}) \
        .eq("club_id", club_id) \
        .eq("user_id", member_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")

    return {"user_id": member_id, "role": body.role}