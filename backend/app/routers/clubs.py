from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, validator
from typing import Optional, Literal
from app.auth import get_current_user, get_supabase_client
from app.limiter import limiter
from app.utils import slugify, make_unique_slug, make_unique_position_slug, verify_positions_exist

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def assert_coach_in_club(club_id: str, user_id: str, client):
    """Raises 403 if the user is not a coach in the given club."""
    res = client.table("club_memberships") \
        .select("role") \
        .eq("club_id", club_id) \
        .eq("user_id", user_id) \
        .execute()
    if not res.data or res.data[0]["role"] != "coach":
        raise HTTPException(status_code=403, detail="Must be a coach in this club")


def assert_club_owner(club_id: str, user_id: str, client):
    """Raises 403 if the user is not the owner of the club."""
    res = client.table("clubs") \
        .select("id") \
        .eq("id", club_id) \
        .eq("owner_id", user_id) \
        .execute()
    if not res.data:
        raise HTTPException(status_code=403, detail="Not the club owner")


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClubCreate(BaseModel):
    name: str

    @validator("name")
    def name_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Club name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Club name must be 100 characters or fewer")
        return v


class ClubJoin(BaseModel):
    invite_code: str


class MemberRoleUpdate(BaseModel):
    role: Literal["athlete", "coach"]


class ClubMoveCreate(BaseModel):
    name: str
    from_position_id: str
    to_position_id: str
    description: Optional[str] = ""
    styles: Optional[list[str]] = None

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


class ClubPositionCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    styles: Optional[list[str]] = None

    @validator("name")
    def name_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Position name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Position name must be 100 characters or fewer")
        return v

    @validator("description")
    def description_valid(cls, v):
        if v and len(v) > 1000:
            raise ValueError("Description must be 1000 characters or fewer")
        return v or ""


# ── Club CRUD ─────────────────────────────────────────────────────────────────

@router.post("/")
@limiter.limit("10/minute")
def create_club(
    request: Request,
    body: ClubCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    slug = slugify(body.name)

    club_res = client.table("clubs").insert({
        "name":     body.name,
        "slug":     slug,
        "owner_id": user.id,
    }).execute()

    if not club_res.data:
        raise HTTPException(status_code=500, detail="Failed to create club")

    club = club_res.data[0]

    # Creator is automatically a coach member
    client.table("club_memberships").insert({
        "club_id": club["id"],
        "user_id": user.id,
        "role":    "coach",
    }).execute()

    return club


@router.post("/join")
@limiter.limit("10/minute")
def join_club(
    request: Request,
    body: ClubJoin,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
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

    client.table("club_memberships").insert({
        "club_id": club["id"],
        "user_id": user.id,
        "role":    "athlete",
    }).execute()

    return club


@router.get("/mine")
def get_my_club(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    memberships_res = client.table("club_memberships") \
        .select("club_id, role") \
        .eq("user_id", user.id) \
        .execute()

    if not memberships_res.data:
        raise HTTPException(status_code=404, detail="Not a member of any club")

    # Prefer coach membership if the user has multiple rows
    # (can happen when toggling roles via onboarding during development)
    membership = (
        next((m for m in memberships_res.data if m["role"] == "coach"), None)
        or memberships_res.data[0]
    )

    club_res = client.table("clubs") \
        .select("id, name, slug, owner_id, invite_code, created_at") \
        .eq("id", membership["club_id"]) \
        .execute()

    if not club_res.data:
        raise HTTPException(status_code=404, detail="Club not found")

    club = club_res.data[0]

    # Only expose invite code to the club owner
    if club["owner_id"] != user.id:
        club.pop("invite_code", None)

    club["membership_role"] = membership["role"]
    return club


# ── Member management ─────────────────────────────────────────────────────────

@router.get("/{club_id}/members")
def get_club_members(
    club_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """Owner-only. Returns full member list with profiles."""
    assert_club_owner(club_id, user.id, client)

    memberships_res = client.table("club_memberships") \
        .select("user_id, role, joined_at") \
        .eq("club_id", club_id) \
        .order("joined_at") \
        .execute()

    if not memberships_res.data:
        return []

    user_ids = [m["user_id"] for m in memberships_res.data]

    profiles_res = client.table("profiles") \
        .select("id, display_name, avatar_url") \
        .in_("id", user_ids) \
        .execute()

    profiles_by_id = {p["id"]: p for p in (profiles_res.data or [])}

    return [
        {
            "user_id":      m["user_id"],
            "display_name": profiles_by_id.get(m["user_id"], {}).get("display_name"),
            "avatar_url":   profiles_by_id.get(m["user_id"], {}).get("avatar_url"),
            "role":         m["role"],
            "joined_at":    m["joined_at"],
        }
        for m in memberships_res.data
    ]


@router.get("/{club_id}/roster")
def get_club_roster(
    club_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """Any club member can call this. Returns all members with profiles."""
    membership_check = client.table("club_memberships") \
        .select("id") \
        .eq("club_id", club_id) \
        .eq("user_id", user.id) \
        .execute()

    if not membership_check.data:
        raise HTTPException(status_code=403, detail="Not a member of this club")

    memberships_res = client.table("club_memberships") \
        .select("user_id, role, joined_at") \
        .eq("club_id", club_id) \
        .order("joined_at") \
        .execute()

    if not memberships_res.data:
        return []

    user_ids = [m["user_id"] for m in memberships_res.data]

    profiles_res = client.table("profiles") \
        .select("id, display_name, avatar_url") \
        .in_("id", user_ids) \
        .execute()

    profiles_by_id = {p["id"]: p for p in (profiles_res.data or [])}

    return [
        {
            "user_id":      m["user_id"],
            "display_name": profiles_by_id.get(m["user_id"], {}).get("display_name"),
            "avatar_url":   profiles_by_id.get(m["user_id"], {}).get("avatar_url"),
            "role":         m["role"],
            "joined_at":    m["joined_at"],
        }
        for m in memberships_res.data
    ]


@router.patch("/{club_id}/members/{member_id}/role")
def update_member_role(
    club_id: str,
    member_id: str,
    body: MemberRoleUpdate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    assert_club_owner(club_id, user.id, client)

    if member_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    res = client.table("club_memberships") \
        .update({"role": body.role}) \
        .eq("club_id", club_id) \
        .eq("user_id", member_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")

    return {"user_id": member_id, "role": body.role}


@router.delete("/{club_id}/members/{member_id}")
def remove_member(
    club_id: str,
    member_id: str,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """Remove a member from the club. Owner or coach only."""
    assert_coach_in_club(club_id, user.id, client)

    if member_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    # Check the target is not the club owner
    club_res = client.table("clubs") \
        .select("owner_id") \
        .eq("id", club_id) \
        .execute()

    if club_res.data and club_res.data[0]["owner_id"] == member_id:
        raise HTTPException(status_code=400, detail="Cannot remove the club owner")

    res = client.table("club_memberships") \
        .delete() \
        .eq("club_id", club_id) \
        .eq("user_id", member_id) \
        .execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")

    return {"status": "removed", "user_id": member_id}


# ── Club content creation ─────────────────────────────────────────────────────

@router.post("/{club_id}/moves")
@limiter.limit("30/minute")
def create_club_move(
    request: Request,
    club_id: str,
    body: ClubMoveCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Creates a move scoped to this club.
    - Caller must be a coach in the club
    - Both positions must exist in the DB
    - Name validated by schema (2-100 chars), also enforced by DB constraint
    - Defaults to both folkstyle+freestyle if no styles specified
    """
    assert_coach_in_club(club_id, user.id, client)
    verify_positions_exist(body.from_position_id, body.to_position_id, client)

    slug = slugify(body.name)
    slug = make_unique_slug(slug, club_id[:8], client)

    res = client.table("moves").insert({
        "name":             body.name,
        "slug":             slug,
        "description":      body.description,
        "from_position_id": body.from_position_id,
        "to_position_id":   body.to_position_id,
        "club_id":          club_id,
        "created_by":       user.id,
        "sport":            "wrestling",
        "styles":           body.styles or ["folkstyle", "freestyle"],
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create move")

    return res.data[0]


@router.post("/{club_id}/positions")
@limiter.limit("30/minute")
def create_club_position(
    request: Request,
    club_id: str,
    body: ClubPositionCreate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client),
):
    """
    Creates a position scoped to this club.
    - Caller must be a coach in the club
    - Name validated by schema (2-100 chars), also enforced by DB constraint
    - Defaults to both folkstyle+freestyle if no styles specified
    """
    assert_coach_in_club(club_id, user.id, client)

    slug = slugify(body.name)
    slug = make_unique_position_slug(slug, club_id[:8], client)

    res = client.table("positions").insert({
        "name":        body.name,
        "slug":        slug,
        "description": body.description,
        "club_id":     club_id,
        "created_by":  user.id,
        "sport":       "wrestling",
        "styles":      body.styles or ["folkstyle", "freestyle"],
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create position")

    return res.data[0]