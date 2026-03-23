from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.auth import get_current_user, get_supabase_client

router = APIRouter(tags=["dashboard"])


@router.get("/{club_id}")
async def get_club_dashboard(
    club_id: str,
    curriculum_id: Optional[str] = Query(None),
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    # 1 — Verify caller is a coach in this club
    membership_resp = (
        supabase.table("club_memberships")
        .select("role")
        .eq("club_id", club_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not membership_resp.data or membership_resp.data[0]["role"] != "coach":
        raise HTTPException(status_code=403, detail="Not a coach in this club")

    # 2 — Get athlete member IDs
    members_resp = (
        supabase.table("club_memberships")
        .select("user_id")
        .eq("club_id", club_id)
        .eq("role", "athlete")
        .execute()
    )
    athlete_ids = [row["user_id"] for row in members_resp.data]

    if not athlete_ids:
        return {
            "athletes": [],
            "moves": [],
            "matrix": {},
            "athlete_aggregates": {},
            "move_aggregates": {},
        }

    # 3 — Get athlete profiles
    profiles_resp = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url")
        .in_("id", athlete_ids)
        .execute()
    )
    athletes = sorted(
        profiles_resp.data,
        key=lambda p: (p["display_name"] or "").lower(),
    )

    # 4 — Get moves (all, or filtered by curriculum chains)
    if curriculum_id:
        curr_resp = (
            supabase.table("curricula")
            .select("id")
            .eq("id", curriculum_id)
            .eq("club_id", club_id)
            .execute()
        )
        if not curr_resp.data:
            raise HTTPException(
                status_code=404, detail="Curriculum not found in this club"
            )

        chains_resp = (
            supabase.table("curriculum_chains")
            .select("id")
            .eq("curriculum_id", curriculum_id)
            .execute()
        )
        chain_ids = [c["id"] for c in chains_resp.data]

        move_ids = []
        if chain_ids:
            chain_moves_resp = (
                supabase.table("curriculum_chain_moves")
                .select("move_id")
                .in_("chain_id", chain_ids)
                .order("position")
                .execute()
            )
            # Deduplicate while preserving order
            seen = set()
            for cm in chain_moves_resp.data:
                if cm["move_id"] not in seen:
                    move_ids.append(cm["move_id"])
                    seen.add(cm["move_id"])

        if move_ids:
            moves_resp = (
                supabase.table("moves")
                .select("id, name, slug")
                .in_("id", move_ids)
                .execute()
            )
            move_order = {mid: i for i, mid in enumerate(move_ids)}
            moves = sorted(
                moves_resp.data, key=lambda m: move_order.get(m["id"], 999)
            )
        else:
            moves = []
            move_ids = []
    else:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug")
            .order("name")
            .execute()
        )
        moves = moves_resp.data
        move_ids = [m["id"] for m in moves]

    # 5 — Get all progress rows for these athletes
    progress_resp = (
        supabase.table("user_move_progress")
        .select("user_id, move_id, confidence, is_favourite")
        .in_("user_id", athlete_ids)
        .execute()
    )

    # 6 — Build matrix + aggregates
    move_id_set = set(move_ids)
    matrix = {}
    athlete_stats = {aid: {"rated": 0, "total": 0} for aid in athlete_ids}
    move_stats = {mid: {"rated": 0, "total": 0} for mid in move_ids}

    for row in progress_resp.data:
        uid = row["user_id"]
        mid = row["move_id"]
        conf = row["confidence"]

        if mid not in move_id_set:
            continue

        if uid not in matrix:
            matrix[uid] = {}
        matrix[uid][mid] = {
            "confidence": conf,
            "is_favourite": row["is_favourite"],
        }

        athlete_stats[uid]["rated"] += 1
        athlete_stats[uid]["total"] += conf
        if mid in move_stats:
            move_stats[mid]["rated"] += 1
            move_stats[mid]["total"] += conf

    athlete_aggregates = {}
    for aid in athlete_ids:
        s = athlete_stats[aid]
        athlete_aggregates[aid] = {
            "rated_count": s["rated"],
            "avg_confidence": (
                round(s["total"] / s["rated"], 2) if s["rated"] > 0 else None
            ),
        }

    move_aggregates = {}
    for mid in move_ids:
        s = move_stats[mid]
        move_aggregates[mid] = {
            "rated_count": s["rated"],
            "avg_confidence": (
                round(s["total"] / s["rated"], 2) if s["rated"] > 0 else None
            ),
        }

    return {
        "athletes": athletes,
        "moves": moves,
        "matrix": matrix,
        "athlete_aggregates": athlete_aggregates,
        "move_aggregates": move_aggregates,
    }