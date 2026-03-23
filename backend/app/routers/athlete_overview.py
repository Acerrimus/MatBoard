from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user, get_supabase_client

router = APIRouter(tags=["athletes"])


@router.get("/{athlete_id}")
async def get_athlete_overview(
    athlete_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    Full athlete overview for a coach.
    Returns profile, progress, personal chains, comp-ready flags.
    """
    # Verify coach shares a club with this athlete
    coach_clubs_resp = (
        supabase.table("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("role", "coach")
        .execute()
    )
    coach_club_ids = {row["club_id"] for row in coach_clubs_resp.data}
    if not coach_club_ids:
        raise HTTPException(status_code=403, detail="Not a coach in any club")

    athlete_membership_resp = (
        supabase.table("club_memberships")
        .select("club_id")
        .eq("user_id", athlete_id)
        .in_("club_id", list(coach_club_ids))
        .execute()
    )
    if not athlete_membership_resp.data:
        raise HTTPException(status_code=403, detail="Athlete not in your club")

    # Profile
    profile_resp = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url, role, created_at")
        .eq("id", athlete_id)
        .single()
        .execute()
    )
    profile = profile_resp.data

    # Progress
    progress_resp = (
        supabase.table("user_move_progress")
        .select("move_id, confidence, is_favourite, updated_at")
        .eq("user_id", athlete_id)
        .execute()
    )
    progress_rows = progress_resp.data
    move_ids = [r["move_id"] for r in progress_rows]

    # Moves for those progress rows
    moves_map = {}
    if move_ids:
        moves_resp = (
            supabase.table("moves")
            .select(
                "id, name, slug, from_position_id, to_position_id, "
                "scoring_value, risk_rating"
            )
            .in_("id", move_ids)
            .execute()
        )
        # Collect position IDs
        position_ids = set()
        for m in moves_resp.data:
            if m.get("from_position_id"):
                position_ids.add(m["from_position_id"])
            if m.get("to_position_id"):
                position_ids.add(m["to_position_id"])

        positions_map = {}
        if position_ids:
            pos_resp = (
                supabase.table("positions")
                .select("id, name, slug")
                .in_("id", list(position_ids))
                .execute()
            )
            positions_map = {p["id"]: p for p in pos_resp.data}

        for m in moves_resp.data:
            m["from_position"] = positions_map.get(m.get("from_position_id"))
            m["to_position"] = positions_map.get(m.get("to_position_id"))
            moves_map[m["id"]] = m

    # Build progress list with move data attached
    progress = []
    for row in progress_rows:
        move = moves_map.get(row["move_id"])
        if move:
            progress.append({
                "move_id": row["move_id"],
                "confidence": row["confidence"],
                "is_favourite": row["is_favourite"],
                "updated_at": row["updated_at"],
                "move": move,
            })

    # Sort by position name then move name
    progress.sort(key=lambda r: (
        (r["move"].get("from_position") or {}).get("name", ""),
        (r["move"].get("name", ""))
    ))

    # Personal chains
    chains_resp = (
        supabase.table("chains")
        .select("id, name, created_at")
        .eq("user_id", athlete_id)
        .order("created_at")
        .execute()
    )
    chains_raw = chains_resp.data
    chain_ids = [c["id"] for c in chains_raw]

    chains = []
    if chain_ids:
        chain_moves_resp = (
            supabase.table("chain_moves")
            .select("chain_id, move_id, position")
            .in_("chain_id", chain_ids)
            .order("position")
            .execute()
        )
        # Group by chain
        chain_moves_by_id = {}
        all_chain_move_ids = set()
        for cm in chain_moves_resp.data:
            chain_moves_by_id.setdefault(cm["chain_id"], []).append(cm)
            all_chain_move_ids.add(cm["move_id"])

        # Fetch any moves not already in moves_map
        missing_ids = all_chain_move_ids - set(moves_map.keys())
        if missing_ids:
            extra_moves_resp = (
                supabase.table("moves")
                .select("id, name, slug, from_position_id, to_position_id")
                .in_("id", list(missing_ids))
                .execute()
            )
            for m in extra_moves_resp.data:
                moves_map[m["id"]] = m

        for chain in chains_raw:
            cms = sorted(
                chain_moves_by_id.get(chain["id"], []),
                key=lambda x: x["position"]
            )
            chains.append({
                "id": chain["id"],
                "name": chain["name"],
                "created_at": chain["created_at"],
                "moves": [
                    moves_map[cm["move_id"]]
                    for cm in cms
                    if cm["move_id"] in moves_map
                ],
            })

    # Comp-ready flags set by this coach for this athlete
    comp_ready_resp = (
        supabase.table("coach_comp_ready")
        .select("move_id, created_at")
        .eq("coach_id", user.id)
        .eq("athlete_id", athlete_id)
        .execute()
    )
    comp_ready_move_ids = [r["move_id"] for r in comp_ready_resp.data]

    return {
        "profile": profile,
        "progress": progress,
        "chains": chains,
        "comp_ready_move_ids": comp_ready_move_ids,
    }