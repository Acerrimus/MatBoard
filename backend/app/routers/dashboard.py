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
    membership_resp = (
        supabase.table("club_memberships")
        .select("role")
        .eq("club_id", club_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not membership_resp.data or membership_resp.data[0]["role"] != "coach":
        raise HTTPException(status_code=403, detail="Not a coach in this club")

    members_resp = (
        supabase.table("club_memberships")
        .select("user_id")
        .eq("club_id", club_id)
        .eq("role", "athlete")
        .execute()
    )
    athlete_ids = [row["user_id"] for row in members_resp.data]

    empty = {
        "athletes": [],
        "moves": [],
        "chains": [],
        "matrix": {},
        "athlete_aggregates": {},
        "move_aggregates": {},
        "positions": [],
        "position_comfort": {},
        "squad_position_comfort": {},
    }
    if not athlete_ids:
        return empty

    profiles_resp = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url")
        .in_("id", athlete_ids)
        .execute()
    )
    athletes = sorted(profiles_resp.data, key=lambda p: (p["display_name"] or "").lower())

    progress_resp = (
        supabase.table("user_move_progress")
        .select("user_id, move_id, confidence, is_favourite")
        .in_("user_id", athlete_ids)
        .execute()
    )
    progress_lookup = {}
    for row in progress_resp.data:
        uid, mid = row["user_id"], row["move_id"]
        if uid not in progress_lookup:
            progress_lookup[uid] = {}
        progress_lookup[uid][mid] = {
            "confidence": row["confidence"],
            "is_favourite": row["is_favourite"],
        }

    chains_data = []

    if curriculum_id:
        curr_resp = (
            supabase.table("curricula")
            .select("id, club_id")
            .eq("id", curriculum_id)
            .execute()
        )
        if not curr_resp.data:
            raise HTTPException(status_code=404, detail="Curriculum not found")

        curr_club_id = curr_resp.data[0].get("club_id")
        if curr_club_id is not None and curr_club_id != club_id:
            raise HTTPException(status_code=403, detail="Curriculum not accessible")

        chains_resp = (
            supabase.table("curriculum_chains")
            .select("id, name, position")
            .eq("curriculum_id", curriculum_id)
            .order("position")
            .execute()
        )
        chain_ids = [c["id"] for c in chains_resp.data]

        chain_moves_by_chain = {}
        if chain_ids:
            all_cm_resp = (
                supabase.table("curriculum_chain_moves")
                .select("chain_id, move_id, position")
                .in_("chain_id", chain_ids)
                .order("position")
                .execute()
            )
            for cm in all_cm_resp.data:
                cid = cm["chain_id"]
                if cid not in chain_moves_by_chain:
                    chain_moves_by_chain[cid] = []
                chain_moves_by_chain[cid].append(cm)

        all_move_ids = list({
            cm["move_id"]
            for cms in chain_moves_by_chain.values()
            for cm in cms
        })

        if all_move_ids:
            moves_resp = (
                supabase.table("moves")
                .select("id, name, slug, from_position_id, to_position_id")
                .in_("id", all_move_ids)
                .execute()
            )
            moves_raw = moves_resp.data
        else:
            moves_raw = []
    else:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug, from_position_id, to_position_id")
            .order("name")
            .execute()
        )
        moves_raw = moves_resp.data

    position_ids = set()
    for m in moves_raw:
        if m.get("from_position_id"):
            position_ids.add(m["from_position_id"])
        if m.get("to_position_id"):
            position_ids.add(m["to_position_id"])

    positions_map = {}
    positions_list = []
    if position_ids:
        pos_resp = (
            supabase.table("positions")
            .select("id, name, slug")
            .in_("id", list(position_ids))
            .execute()
        )
        positions_map = {p["id"]: p for p in pos_resp.data}
        positions_list = sorted(pos_resp.data, key=lambda p: p["name"])

    moves_map = {}
    move_from_position = {}
    for m in moves_raw:
        fp_id = m.get("from_position_id")
        tp_id = m.get("to_position_id")
        m["from_position"] = positions_map.get(fp_id)
        m["to_position"] = positions_map.get(tp_id)
        moves_map[m["id"]] = m
        if fp_id:
            move_from_position[m["id"]] = fp_id

    if curriculum_id:
        for chain in chains_resp.data:
            cms = chain_moves_by_chain.get(chain["id"], [])
            chain_moves = []
            for cm in sorted(cms, key=lambda x: x["position"]):
                move = moves_map.get(cm["move_id"])
                if move:
                    chain_moves.append(move)
            chains_data.append({
                "id": chain["id"],
                "name": chain["name"],
                "position": chain["position"],
                "moves": chain_moves,
            })

    moves = list(moves_map.values())
    move_ids = [m["id"] for m in moves]

    move_id_set = set(move_ids)
    matrix = {}
    athlete_stats = {aid: {"rated": 0, "total": 0} for aid in athlete_ids}
    move_stats = {mid: {"rated": 0, "count": 0} for mid in move_ids}

    position_comfort_data = {}
    for aid in athlete_ids:
        position_comfort_data[aid] = {}

    for aid in athlete_ids:
        ap = progress_lookup.get(aid, {})
        for mid in move_ids:
            prog = ap.get(mid)
            if prog and prog["confidence"] is not None:
                if aid not in matrix:
                    matrix[aid] = {}
                matrix[aid][mid] = prog
                athlete_stats[aid]["rated"] += 1
                athlete_stats[aid]["total"] += prog["confidence"]
                move_stats[mid]["count"] += 1
                move_stats[mid]["rated"] += prog["confidence"]

                fp_id = move_from_position.get(mid)
                if fp_id:
                    if fp_id not in position_comfort_data[aid]:
                        position_comfort_data[aid][fp_id] = {"total": 0, "count": 0}
                    position_comfort_data[aid][fp_id]["total"] += prog["confidence"]
                    position_comfort_data[aid][fp_id]["count"] += 1

    athlete_aggregates = {}
    for aid in athlete_ids:
        s = athlete_stats[aid]
        athlete_aggregates[aid] = {
            "rated_count": s["rated"],
            "total_count": len(move_ids),
            "avg_confidence": round(s["total"] / s["rated"], 2) if s["rated"] > 0 else None,
        }

    move_aggregates = {}
    for mid in move_ids:
        s = move_stats[mid]
        move_aggregates[mid] = {
            "rated_count": s["count"],
            "avg_confidence": round(s["rated"] / s["count"], 2) if s["count"] > 0 else None,
        }

    position_comfort = {}
    for aid in athlete_ids:
        position_comfort[aid] = {}
        for pid, stats in position_comfort_data[aid].items():
            if stats["count"] > 0:
                position_comfort[aid][pid] = round(stats["total"] / stats["count"], 2)

    squad_position_comfort = {}
    for pid in position_ids:
        values = [
            position_comfort[aid][pid]
            for aid in athlete_ids
            if pid in position_comfort.get(aid, {})
        ]
        if values:
            squad_position_comfort[pid] = round(sum(values) / len(values), 2)

    # ── Comp-ready flags ──────────────────────────────────────────────────────
    comp_ready_resp = (
        supabase.table("coach_comp_ready")
        .select("athlete_id, move_id")
        .eq("coach_id", user.id)
        .in_("athlete_id", athlete_ids)
        .execute()
    )
    comp_ready = {}
    for row in comp_ready_resp.data:
        aid = row["athlete_id"]
        if aid not in comp_ready:
            comp_ready[aid] = []
        comp_ready[aid].append(row["move_id"])

    # ── Squad Insights ────────────────────────────────────────────────────────
    insights = {
        "weakest": None,
        "strongest": None,
        "most_inconsistent": None,
    }

    rated_moves = [
        (mid, stats)
        for mid, stats in move_aggregates.items()
        if stats["rated_count"] > 0 and stats["avg_confidence"] is not None
    ]

    if rated_moves:
        weakest_mid, weakest_stats = min(
            rated_moves,
            key=lambda x: x[1]["avg_confidence"]
        )
        strongest_mid, strongest_stats = max(
            rated_moves,
            key=lambda x: x[1]["avg_confidence"]
        )

        insights["weakest"] = {
            "move_id": weakest_mid,
            "move_name": moves_map[weakest_mid]["name"],
            "avg_confidence": weakest_stats["avg_confidence"],
        }
        insights["strongest"] = {
            "move_id": strongest_mid,
            "move_name": moves_map[strongest_mid]["name"],
            "avg_confidence": strongest_stats["avg_confidence"],
        }

        max_spread = 0
        inconsistent_mid = None
        for mid in move_ids:
            values = [
                matrix[aid][mid]["confidence"]
                for aid in matrix
                if mid in matrix.get(aid, {})
            ]
            if len(values) > 1:
                spread = max(values) - min(values)
                if spread > max_spread:
                    max_spread = spread
                    inconsistent_mid = mid

        if inconsistent_mid:
            insights["most_inconsistent"] = {
                "move_id": inconsistent_mid,
                "move_name": moves_map[inconsistent_mid]["name"],
                "spread": max_spread,
            }

    return {
        "athletes": athletes,
        "moves": moves,
        "chains": chains_data,
        "matrix": matrix,
        "athlete_aggregates": athlete_aggregates,
        "move_aggregates": move_aggregates,
        "positions": positions_list,
        "position_comfort": position_comfort,
        "squad_position_comfort": squad_position_comfort,
        "comp_ready": comp_ready,
        "insights": insights,
    }


# ── Athlete Insights Endpoint ─────────────────────────────────────────────────
# Accessible by: the athlete themselves, or a coach in the same club.
# Returns focused, computed insights for a single athlete.

@router.get("/{club_id}/athletes/{athlete_id}/insights")
async def get_athlete_insights(
    club_id: str,
    athlete_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    # ── Auth check: must be the athlete themselves or a coach in this club ────
    is_self = user.id == athlete_id

    if not is_self:
        coach_check = (
            supabase.table("club_memberships")
            .select("role")
            .eq("club_id", club_id)
            .eq("user_id", user.id)
            .execute()
        )
        is_coach = (
            coach_check.data
            and coach_check.data[0]["role"] in ("coach", "admin")
        )
        if not is_coach:
            raise HTTPException(status_code=403, detail="Not authorised to view these insights")

    # ── Verify athlete is actually in this club ───────────────────────────────
    athlete_membership = (
        supabase.table("club_memberships")
        .select("role")
        .eq("club_id", club_id)
        .eq("user_id", athlete_id)
        .execute()
    )
    if not athlete_membership.data:
        raise HTTPException(status_code=404, detail="Athlete not found in this club")

    # ── Fetch athlete's progress ──────────────────────────────────────────────
    progress_resp = (
        supabase.table("user_move_progress")
        .select("move_id, confidence, is_favourite")
        .eq("user_id", athlete_id)
        .execute()
    )
    progress_rows = progress_resp.data or []
    progress_by_move = {r["move_id"]: r for r in progress_rows}

    rated_rows = [r for r in progress_rows if r["confidence"] is not None]
    rated_count = len(rated_rows)
    avg_confidence = (
        round(sum(r["confidence"] for r in rated_rows) / rated_count, 2)
        if rated_count > 0 else None
    )

    # ── Fetch all moves this athlete has rated, with position names ───────────
    rated_move_ids = list(progress_by_move.keys())

    moves_map = {}
    positions_map = {}

    if rated_move_ids:
        moves_resp = (
            supabase.table("moves")
            .select("id, name, slug, from_position_id, to_position_id")
            .in_("id", rated_move_ids)
            .execute()
        )
        raw_moves = moves_resp.data or []

        position_ids = set()
        for m in raw_moves:
            if m.get("from_position_id"):
                position_ids.add(m["from_position_id"])
            if m.get("to_position_id"):
                position_ids.add(m["to_position_id"])

        if position_ids:
            pos_resp = (
                supabase.table("positions")
                .select("id, name, slug")
                .in_("id", list(position_ids))
                .execute()
            )
            positions_map = {p["id"]: p for p in pos_resp.data}

        for m in raw_moves:
            m["from_position"] = positions_map.get(m.get("from_position_id"))
            m["to_position"] = positions_map.get(m.get("to_position_id"))
            moves_map[m["id"]] = m

    # ── Fetch squad averages for comparison ───────────────────────────────────
    squad_members_resp = (
        supabase.table("club_memberships")
        .select("user_id")
        .eq("club_id", club_id)
        .eq("role", "athlete")
        .execute()
    )
    squad_ids = [r["user_id"] for r in squad_members_resp.data]
    other_athlete_ids = [sid for sid in squad_ids if sid != athlete_id]

    squad_move_averages = {}
    if other_athlete_ids and rated_move_ids:
        squad_progress_resp = (
            supabase.table("user_move_progress")
            .select("move_id, confidence")
            .in_("user_id", other_athlete_ids)
            .in_("move_id", rated_move_ids)
            .execute()
        )
        squad_totals = {}
        for row in squad_progress_resp.data:
            mid = row["move_id"]
            if row["confidence"] is not None:
                if mid not in squad_totals:
                    squad_totals[mid] = {"total": 0, "count": 0}
                squad_totals[mid]["total"] += row["confidence"]
                squad_totals[mid]["count"] += 1
        for mid, s in squad_totals.items():
            if s["count"] > 0:
                squad_move_averages[mid] = round(s["total"] / s["count"], 2)

    # ── Fetch curriculum moves for this club (focus recommendations) ──────────
    curricula_resp = (
        supabase.table("curricula")
        .select("id")
        .eq("club_id", club_id)
        .execute()
    )
    curriculum_ids = [c["id"] for c in curricula_resp.data]

    curriculum_move_ids = set()
    if curriculum_ids:
        chains_resp = (
            supabase.table("curriculum_chains")
            .select("id")
            .in_("curriculum_id", curriculum_ids)
            .execute()
        )
        chain_ids = [c["id"] for c in chains_resp.data]

        if chain_ids:
            chain_moves_resp = (
                supabase.table("curriculum_chain_moves")
                .select("move_id")
                .in_("chain_id", chain_ids)
                .execute()
            )
            curriculum_move_ids = {r["move_id"] for r in chain_moves_resp.data}

    # ── Compute insights ──────────────────────────────────────────────────────

    weakest = None
    strongest = None
    focus = None
    unrated_curriculum_moves = []

    if rated_rows:
        # Weakest: lowest confidence move the athlete has rated
        weakest_row = min(rated_rows, key=lambda r: r["confidence"])
        weakest_move = moves_map.get(weakest_row["move_id"])
        if weakest_move:
            squad_avg = squad_move_averages.get(weakest_row["move_id"])
            weakest = {
                "move_id": weakest_row["move_id"],
                "move_name": weakest_move["name"],
                "move_slug": weakest_move["slug"],
                "confidence": weakest_row["confidence"],
                "squad_avg": squad_avg,
                "from_position": weakest_move.get("from_position"),
            }

        # Strongest: highest confidence move
        strongest_row = max(rated_rows, key=lambda r: r["confidence"])
        strongest_move = moves_map.get(strongest_row["move_id"])
        if strongest_move:
            strongest = {
                "move_id": strongest_row["move_id"],
                "move_name": strongest_move["name"],
                "move_slug": strongest_move["slug"],
                "confidence": strongest_row["confidence"],
                "squad_avg": squad_move_averages.get(strongest_row["move_id"]),
                "from_position": strongest_move.get("from_position"),
            }

        # Focus: weakest move that is also in a curriculum chain
        curriculum_rated = [
            r for r in rated_rows
            if r["move_id"] in curriculum_move_ids
        ]
        if curriculum_rated:
            focus_row = min(curriculum_rated, key=lambda r: r["confidence"])
            focus_move = moves_map.get(focus_row["move_id"])
            if focus_move:
                squad_avg = squad_move_averages.get(focus_row["move_id"])
                focus = {
                    "move_id": focus_row["move_id"],
                    "move_name": focus_move["name"],
                    "move_slug": focus_move["slug"],
                    "confidence": focus_row["confidence"],
                    "squad_avg": squad_avg,
                    "from_position": focus_move.get("from_position"),
                }

    # Unrated curriculum moves: in curriculum but athlete has never rated them
    unrated_ids = [
        mid for mid in curriculum_move_ids
        if mid not in progress_by_move
    ]
    if unrated_ids:
        unrated_resp = (
            supabase.table("moves")
            .select("id, name, slug, from_position_id, to_position_id")
            .in_("id", unrated_ids)
            .execute()
        )
        for m in unrated_resp.data:
            m["from_position"] = positions_map.get(m.get("from_position_id"))
            m["to_position"] = positions_map.get(m.get("to_position_id"))
        unrated_curriculum_moves = unrated_resp.data

    # ── Position comfort map ──────────────────────────────────────────────────
    position_comfort = {}
    for row in rated_rows:
        move = moves_map.get(row["move_id"])
        if move and move.get("from_position_id"):
            pid = move["from_position_id"]
            if pid not in position_comfort:
                position_comfort[pid] = {"total": 0, "count": 0, "name": move["from_position"]["name"] if move.get("from_position") else None}
            position_comfort[pid]["total"] += row["confidence"]
            position_comfort[pid]["count"] += 1

    position_comfort_output = {}
    for pid, s in position_comfort.items():
        if s["count"] > 0:
            position_comfort_output[pid] = {
                "avg": round(s["total"] / s["count"], 2),
                "count": s["count"],
                "name": s["name"],
            }

    return {
        "athlete_id": athlete_id,
        "rated_count": rated_count,
        "avg_confidence": avg_confidence,
        "squad_size": len(squad_ids),
        "weakest": weakest,
        "strongest": strongest,
        "focus": focus,
        "unrated_curriculum_moves": unrated_curriculum_moves,
        "position_comfort": position_comfort_output,
    }