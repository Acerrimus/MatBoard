from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user, get_supabase_client

router = APIRouter(tags=["comp_ready"])


def _assert_coach_of_athlete(supabase, coach_id: str, athlete_id: str):
    """Verify coach and athlete share a club and coach has coach role."""
    resp = (
        supabase.table("club_memberships")
        .select("club_id")
        .eq("user_id", coach_id)
        .eq("role", "coach")
        .execute()
    )
    coach_club_ids = {row["club_id"] for row in resp.data}
    if not coach_club_ids:
        raise HTTPException(status_code=403, detail="Not a coach in any club")

    resp2 = (
        supabase.table("club_memberships")
        .select("club_id")
        .eq("user_id", athlete_id)
        .in_("club_id", list(coach_club_ids))
        .execute()
    )
    if not resp2.data:
        raise HTTPException(status_code=403, detail="Athlete not in your club")


@router.get("/{athlete_id}")
async def get_comp_ready(
    athlete_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    Get all comp-ready move IDs for an athlete.
    Accessible by the athlete themselves or their coach.
    """
    if user.id != athlete_id:
        _assert_coach_of_athlete(supabase, user.id, athlete_id)

    resp = (
        supabase.table("coach_comp_ready")
        .select("move_id, coach_id, created_at")
        .eq("athlete_id", athlete_id)
        .execute()
    )
    return {"athlete_id": athlete_id, "comp_ready": resp.data}


@router.post("/{athlete_id}/{move_id}")
async def set_comp_ready(
    athlete_id: str,
    move_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """Toggle comp-ready ON for an athlete/move pair."""
    _assert_coach_of_athlete(supabase, user.id, athlete_id)

    resp = (
        supabase.table("coach_comp_ready")
        .upsert(
            {
                "coach_id": user.id,
                "athlete_id": athlete_id,
                "move_id": move_id,
            },
            on_conflict="coach_id,athlete_id,move_id",
        )
        .execute()
    )
    return {"ok": True, "data": resp.data}


@router.delete("/{athlete_id}/{move_id}")
async def unset_comp_ready(
    athlete_id: str,
    move_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """Toggle comp-ready OFF for an athlete/move pair."""
    _assert_coach_of_athlete(supabase, user.id, athlete_id)

    supabase.table("coach_comp_ready").delete().eq("coach_id", user.id).eq(
        "athlete_id", athlete_id
    ).eq("move_id", move_id).execute()

    return {"ok": True}