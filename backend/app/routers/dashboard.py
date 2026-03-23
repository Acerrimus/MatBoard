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
            .select("id")
            .eq("id", curriculum_id)
            .eq("club_id", club_id)
            .execute()
        )
        if not curr_resp.data:
            raise HTTPException(status_code=404, detail="Curriculum not found")

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
    move_stats = {mid: {"rated": 0, "total": 0} for mid in move_ids}

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
                move_stats[mid]["rated"] += 1
                move_stats[mid]["total"] += prog["confidence"]

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
            "avg_confidence": round(s["total"] / s["rated"], 2) if s["rated"] > 0 else None,
        }

    move_aggregates = {}
    for mid in move_ids:
        s = move_stats[mid]
        move_aggregates[mid] = {
            "rated_count": s["rated"],
            "avg_confidence": round(s["total"] / s["rated"], 2) if s["rated"] > 0 else None,
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
    }