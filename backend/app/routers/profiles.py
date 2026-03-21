from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.auth import get_current_user, get_supabase_client

router = APIRouter()


class RoleUpdate(BaseModel):
    role: Literal['athlete', 'coach']


class SkipClubSetup(BaseModel):
    club_setup_skipped: bool = True


@router.get("/me")
def get_my_profile(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("profiles") \
        .select("*") \
        .eq("id", user.id) \
        .single() \
        .execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return response.data


@router.patch("/me/role")
def set_my_role(
    body: RoleUpdate,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("profiles") \
        .update({"role": body.role}) \
        .eq("id", user.id) \
        .execute()
    return response.data[0]


@router.patch("/me/skip-club-setup")
def skip_club_setup(
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    response = client.table("profiles") \
        .update({"club_setup_skipped": True}) \
        .eq("id", user.id) \
        .execute()
    return response.data[0]