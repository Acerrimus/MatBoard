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
            "chains": [],
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

    # 4 — Get all progress rows for these athletes
    progress_resp = (
        supabase.table("user_move_progress")
        .select("user_id, move_id, confidence, is_favourite")
        .in_("user_id", athlete_ids)
        .execute()
    )

    # Build progress lookup
    progress_lookup = {}
    for row in progress_resp.data:
        uid = row["user_id"]
        mid = row["move_id"]
        if uid not in progress_lookup:
            progress_lookup[uid] = {}
        progress_lookup[uid][mid] = {
            "confidence": row["confidence"],
            "is_favourite": row["is_favourite"],
        }

    # 5 — Get moves (chain-grouped if curriculum, flat otherwise)
    chains_data = []

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
            .select("id, name, position")
            .eq("curriculum_id", curriculum_id)
            .order("position")
            .execute()
        )

        all_move_ids = set()

        for chain in chains_resp.data:
            chain_moves_resp = (
                supabase.table("curriculum_chain_moves")
                .select("move_id, position")
                .eq("chain_id", chain["id"])
                .order("position")
                .execute()
            )

            chain_move_ids = [cm["move_id"] for cm in chain_moves_resp.data]
            all_move_ids.update(chain_move_ids)

            chains_data.append({
                "id": chain["id"],
                "name": chain["name"],
                "position": chain["position"],
                "move_ids": chain_move_ids,
            })

        # Fetch all moves referenced by any chain
        all_move_ids = list(all_move_ids)
        if all_move_ids:
            moves_resp = (
                supabase.table("moves")
                .select("id, name, slug")
                .in_("id", all_move_ids)
                .execute()
            )
            moves_map = {m["id"]: m for m in moves_resp.data}
        else:
            moves_map = {}

        # Attach move objects to chains
        for chain in chains_data:
            chain["moves"] = [
                moves_map[mid] for mid in chain["move_ids"] if mid in moves_map
            ]
            del chain["move_ids"]

        # Flat list of all unique moves for aggregates
        moves = list(moves_map.values())
        move_ids = [m["id"] for m in moves]

    else:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug")
            .order("name")
            .execute()
        )
        moves = moves_resp.data
        move_ids = [m["id"] for m in moves]

    # 6 — Build matrix + aggregates
    move_id_set = set(move_ids)
    matrix = {}
    athlete_stats = {aid: {"rated": 0, "total": 0} for aid in athlete_ids}
    move_stats = {mid: {"rated": 0, "total": 0} for mid in move_ids}

    for aid in athlete_ids:
        athlete_progress = progress_lookup.get(aid, {})
        for mid in move_ids:
            prog = athlete_progress.get(mid)
            if prog and prog["confidence"] is not None:
                if aid not in matrix:
                    matrix[aid] = {}
                matrix[aid][mid] = prog
                athlete_stats[aid]["rated"] += 1
                athlete_stats[aid]["total"] += prog["confidence"]
                if mid in move_stats:
                    move_stats[mid]["rated"] += 1
                    move_stats[mid]["total"] += prog["confidence"]

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
        "chains": chains_data,
        "matrix": matrix,
        "athlete_aggregates": athlete_aggregates,
        "move_aggregates": move_aggregates,
    }       