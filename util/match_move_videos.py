"""
match_move_videos.py — Match individual moves to YouTube videos
Wrestling-aware matching with manual overrides for known mismatches.

Usage:
  python3 match_move_videos.py              # generates move_video_matches.csv
  python3 match_move_videos.py --sql        # generates move_media_inserts.sql from CSV
"""

import os
import sys
import csv
import requests
from difflib import SequenceMatcher

# ── Config ────────────────────────────────────────────────────────────────────
YOUTUBE_API_KEY = "AIzaSyBXOH81w_BU4pXVX-sJ2GbJqKlJ0Yo8IjU"
SUPABASE_URL    = "https://lksalnbrcoxmnmckmcam.supabase.co"
SUPABASE_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc2FsbmJyY294bW5tY2ttY2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDYxMDIsImV4cCI6MjA4OTYyMjEwMn0.4xwoYLjMIjPM0whuCaNH32abQsu1zAzXpz0_9z_0tII"

PLAYLISTS = [
    "PLDo9M4UVhQm7N2e-D-mLKjAf2RvyXEgIC",  # Folkstyle L1
    "PLDo9M4UVhQm4d5ii338L9fu1fzjyXgWb7",  # Folkstyle L2
    "PLDo9M4UVhQm4AtlVk4Hv7Fm_lurUDHC55",  # Folkstyle L3
    "PLDo9M4UVhQm75STaKHh8voU5ctwdwO6mq",  # Olympic Styles L1
    "PLDo9M4UVhQm4o5QEd-UgO7T5DUmCZQFrg",  # Freestyle L2
]

MATCH_THRESHOLD = 0.55
CSV_FILE = "move_video_matches.csv"
SQL_FILE = "move_media_inserts.sql"

# ── Manual overrides ──────────────────────────────────────────────────────────
# move name (lowercase) → stripped video title (lowercase) to force-match
# These fix known bad fuzzy matches and known-good matches the fuzzer misses.
# Applied to BOTH folkstyle and freestyle versions of each move.
MANUAL_OVERRIDES = {
    # ── Wrong fuzzy matches — correct them ────────────────────────────────────
    "ankle pick":                               "snap down to a front headlock",
    "arm throw":                                "arm spin",
    "head outside single":                      "snatch single",
    "leg ride":                                 None,  # no good match in playlists
    "sprawl defense":                           "downblock & sprawl",
    "scramble to neutral":                      None,  # no good match
    "wrist ride":                               None,  # wrist tie is different

    # ── Unmatched moves — assign best available ───────────────────────────────
    "2-on-1 arm drag":                          "armdrags & chops",
    "2-on-1 back attack":                       None,  # no match
    "2-on-1 entry":                             "2 on 1",
    "back exposure from turtle":                None,  # no match
    "back control standing — mat return":       None,  # no match
    "back control standing — seatbelt to mat":  None,  # no match
    "bodylock takedown":                        "finishes covering hips",
    "collar tie — level change double":         "double leg",
    "collar tie entry":                         "handfighting to control tie",
    "collar tie — shrug to underhook":          None,  # no match
    "collar tie — level change single":         "single leg",
    "collar tie — snap down":                   "head snap",
    "double leg — covering hips finish":        "finishes covering hips",
    "double leg — opponent turtles":            "double leg",
    "double leg — scramble":                    "double leg",
    "double to hi-c conversion":                "high crotch change off to double",
    "double underhook — bodylock":              None,  # no match
    "double underhook — hi-c":                  "inside step penetration   hi c",
    "duck under":                               "2 on 1 duck under",
    "force to turtle":                          None,  # no match
    "front headlock — ankle pick":              "front headlock",
    "front headlock — chop / finish":           "front headlock",
    "front headlock — reset to neutral":        "front headlock",
    "front headlock — shuck by":                "front headlock",
    "front headlock — snap and spin":           "snap & spin",
    "granby roll":                              None,  # no match — folkstyle only
    "gut wrench from turtle":                   "gut wrench",
    "hi-c — outside finish":                    "high crotch outside step penetration",
    "hi-c — convert to single":                 "single leg",
    "hiplock":                                  None,  # no match
    "inside tie — level change double":         "double leg inside step",
    "inside tie — level change hi-c":           "high crotch inside step penetration",
    "inside tie — snap down":                   "head snap",
    "inside tie to underhook":                  "neutral position - underhooks head position",
    "inside tie entry":                         "inside tie & elbow tie",
    "level change — double leg":                "double leg",
    "level change — hi-c":                      "high crotch inside step penetration",
    "level change — single leg":                "single leg",
    "low single":                               "snatch single",
    "overhook — peek out":                      None,  # no match
    "peterson roll":                            None,  # no match — folkstyle only
    "pummeling to arm drag":                    "armdrags & chops",
    "reverse headlock":                         "headlock defense part ii",
    "sag headlock":                             "headlock defense part i   throw finish",
    "scramble to back control — standing":      None,  # no match
    "single leg — ankle turn finish":           "sweep single   head inside",
    "single leg — back door":                   "single leg",
    "single to back exposure":                  None,  # no match
    "single leg — chest to back finish":        "sweep single   head outside",
    "single leg — outside finish":              "sweep single   head outside",
    "single leg — run the pipe":                "sweep single   run the pipe finish head inside",
    "snap down":                                "head snap",
    "sprawl to front headlock":                 "snap down to a front headlock",
    "stand up from turtle":                     "stand up",
    "suplex":                                   None,  # no match
    "takedown to par terre":                    "transitioning from a takedown to par tarre offensi",
    "turk lock":                                "turks",
    "underhook — bodylock":                     None,  # no match
    "underhook — duck under":                   "2 on 1 duck under",
    "underhook entry":                          "neutral position - underhooks head position",
    "underhook — hi-c":                         "high crotch inside step penetration",
    "underhook — shrug / throw by":             None,  # no match
    "underhook — slide by":                     None,  # no match
    "underhook to double underhooks":           None,  # no match
    "whizzer — sit out":                        None,  # no match
    "whizzer — trick knee":                     "neutral position offense - trick knee whizzer",
    "double underhook — duck under":            "2 on 1 duck under",
    "double underhook — fireman's carry":       "fireman's carry inline finish",
    "back control standing — opponent escapes": None,  # no match
    "hi-c — pop finish":                        "high crotch   pop finish",
    "hi-c counter — stuff head":                "high crotch counter   stuff head",
    "hi-c — convert to double":                 "high crotch change off to double",
    "ankle lace defense — catch the ankle":     "ankle lace defense",
    "gut wrench defense — hips square":         "gut wrench defense   hips and shoulders square and",
    "low lock gut wrench":                      "par terre offense   low lock gut wrench",
    "par terre — fighting the lock":            "par terre defense   fighting lock",
    "par terre — movement":                     "par terre defense   movement",
    "leg lace — cartwheel finish":              "par terre offense   leg lace with cartwheel finish",
    "pop & chop to near wrist cheap tilt":      "pop & chop to a near wrist cheap tilt",
    "pop & chop to far side tilt":              "pop & chop to a far side tilt",
    "single leg — sweep head inside":           "sweep single   head inside",
    "single leg — sweep head outside":          "sweep single   head outside",
    "single leg — tree top finish":             "sweep single   tree top finish",
    "single leg counter — stuff head":          "single leg counter   stuff head",
    "short sit to head post":                   "short sit to a head post",
    "short sit to stand up":                    "short sit to a stand up",
    "short sit to switch":                      "short sit to a switch",
    "double to outside single":                 "double leg outside step",
    "2-on-1 to single leg":                     "snatch single",
    "claw ride to legs":                        "referee's top position - claw ride to legs",
    "2-on-1 duck under":                        "2 on 1 duck under",
    "2-on-1 high dive":                         "2 on 1 hi dive",
}

# ── Fetch playlist videos ─────────────────────────────────────────────────────
def get_playlist_videos(playlist_id, api_key):
    videos = []
    url    = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part":       "snippet",
        "playlistId": playlist_id,
        "maxResults": 50,
        "key":        api_key,
    }
    while True:
        resp = requests.get(url, params=params).json()
        for item in resp.get("items", []):
            snippet = item["snippet"]
            vid_id  = snippet["resourceId"]["videoId"]
            videos.append({
                "title":       snippet["title"],
                "url":         f"https://www.youtube.com/watch?v={vid_id}",
                "playlist_id": playlist_id,
            })
        next_page = resp.get("nextPageToken")
        if not next_page:
            break
        params["pageToken"] = next_page
    return videos

# ── Fetch all moves from Supabase ─────────────────────────────────────────────
def get_moves():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/moves",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={
            "select": "id,name,slug,styles,from_position_id",
            "order":  "slug.asc",
        },
    )
    return resp.json()

# ── Fetch positions for display ────────────────────────────────────────────────
def get_positions():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/positions",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={"select": "id,name,slug"},
    )
    return {p["id"]: p for p in resp.json()}

# ── Strip curriculum prefix from video title ──────────────────────────────────
def strip_prefix(title):
    parts = title.split(" - ")
    if len(parts) >= 3:
        return " - ".join(parts[2:]).strip()
    return title.strip()

# ── Fuzzy match ───────────────────────────────────────────────────────────────
def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# ── Infer content type from video title ───────────────────────────────────────
def infer_content_type(title):
    title_lower = title.lower()
    if "drills, activities and games" in title_lower:
        return "drill"
    if "drill" in title_lower:
        return "drill"
    if "game" in title_lower:
        return "game"
    return "technique"

# ── Find video by stripped title (case-insensitive prefix match) ──────────────
def find_video_by_title(videos, target_title):
    """Find a video whose stripped title starts with target_title (case-insensitive)."""
    target_lower = target_title.lower().strip()
    # Try exact match first
    for v in videos:
        if v["stripped_title"].lower().strip() == target_lower:
            return v
    # Try starts-with match (handles truncated titles in overrides)
    for v in videos:
        if v["stripped_title"].lower().strip().startswith(target_lower):
            return v
    # Try target starts with video title (for shorter video titles)
    for v in videos:
        if target_lower.startswith(v["stripped_title"].lower().strip()):
            return v
    return None

# ── Phase 1: Generate CSV ─────────────────────────────────────────────────────
def generate_csv():
    # Fetch all videos across all playlists
    all_videos = []
    seen_urls  = set()

    for playlist_id in PLAYLISTS:
        print(f"Fetching playlist {playlist_id}...")
        videos = get_playlist_videos(playlist_id, YOUTUBE_API_KEY)
        new_count = 0
        for v in videos:
            if v["url"] not in seen_urls:
                seen_urls.add(v["url"])
                v["stripped_title"] = strip_prefix(v["title"])
                all_videos.append(v)
                new_count += 1
        print(f"  {len(videos)} videos found, {new_count} new after dedup\n")

    print(f"Total unique videos across all playlists: {len(all_videos)}\n")

    if not all_videos:
        print("ERROR: No videos fetched. Check PLAYLISTS and YOUTUBE_API_KEY.")
        return

    # Fetch moves and positions
    print("Fetching moves from Supabase...")
    moves = get_moves()
    positions = get_positions()
    print(f"  {len(moves)} moves found\n")

    # Match each move
    matched        = 0
    unmatched      = 0
    override_used  = 0
    override_none  = 0

    print(f"{'Src':<5} {'Style':<12} {'Position':<25} {'Move':<40} {'Score':>6}  Video")
    print("─" * 140)

    rows = []
    for move in sorted(moves, key=lambda m: (m["styles"][0] if m["styles"] else "", m["slug"])):
        style = move["styles"][0] if move["styles"] else "unknown"
        pos   = positions.get(move["from_position_id"], {})
        pos_name = pos.get("name", "Unknown")
        pos_slug = pos.get("slug", "unknown")

        move_name_lower = move["name"].lower().strip()
        source = "fuzzy"

        # ── Pass 1: Check manual overrides ────────────────────────────────────
        if move_name_lower in MANUAL_OVERRIDES:
            override_target = MANUAL_OVERRIDES[move_name_lower]

            if override_target is None:
                # Explicitly no match
                source = "SKIP"
                override_none += 1
                flag = "⊘"
                video_url    = ""
                video_title  = "NO MATCH (manual override)"
                content_type = ""
                best_score   = 0.0
                unmatched += 1

                print(
                    f"{flag} {source:<4} {style:<11} "
                    f"{pos_name[:23]:<25} "
                    f"{move['name'][:38]:<40} "
                    f"{'—':>6}  "
                    f"{video_title}"
                )

                rows.append({
                    "move_id":        move["id"],
                    "slug":           move["slug"],
                    "name":           move["name"],
                    "style":          style,
                    "from_position":  pos_slug,
                    "best_score":     "0.00",
                    "video_url":      "",
                    "video_title":    "",
                    "content_type":   "",
                })
                continue

            # Find the video by title
            video = find_video_by_title(all_videos, override_target)
            if video:
                source = "OVRD"
                override_used += 1
                matched += 1
                flag = "★"
                video_url    = video["url"]
                video_title  = video["stripped_title"]
                content_type = infer_content_type(video["title"])
                best_score   = 1.0

                print(
                    f"{flag} {source:<4} {style:<11} "
                    f"{pos_name[:23]:<25} "
                    f"{move['name'][:38]:<40} "
                    f"{'1.00':>6}  "
                    f"{video_title[:50]}"
                )

                rows.append({
                    "move_id":        move["id"],
                    "slug":           move["slug"],
                    "name":           move["name"],
                    "style":          style,
                    "from_position":  pos_slug,
                    "best_score":     "1.00",
                    "video_url":      video_url,
                    "video_title":    video_title,
                    "content_type":   content_type,
                })
                continue
            else:
                # Override target not found in videos — fall through to fuzzy
                print(f"  ⚠ Override target not found: '{override_target}' for '{move['name']}'")

        # ── Pass 2: Fuzzy match ───────────────────────────────────────────────
        scored = [
            (v, similarity(move["name"], v["stripped_title"]))
            for v in all_videos
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        best_video, best_score = scored[0] if scored else (None, 0.0)

        if best_score >= MATCH_THRESHOLD and best_video:
            flag = "✓"
            matched += 1
            video_url    = best_video["url"]
            video_title  = best_video["stripped_title"]
            content_type = infer_content_type(best_video["title"])
        else:
            flag = "✗"
            unmatched += 1
            video_url    = ""
            video_title  = f"BEST: {best_video['stripped_title'][:40]} ({best_score:.2f})" if best_video else "NO VIDEOS"
            content_type = ""

        print(
            f"{flag} {source:<4} {style:<11} "
            f"{pos_name[:23]:<25} "
            f"{move['name'][:38]:<40} "
            f"{best_score:>5.2f}  "
            f"{video_title[:50]}"
        )

        rows.append({
            "move_id":        move["id"],
            "slug":           move["slug"],
            "name":           move["name"],
            "style":          style,
            "from_position":  pos_slug,
            "best_score":     f"{best_score:.2f}",
            "video_url":      video_url if flag != "✗" else "",
            "video_title":    video_title if flag != "✗" else "",
            "content_type":   content_type if flag != "✗" else "",
        })

    # Write CSV
    print(f"\n{'─' * 60}")
    print(f"TOTAL:      {len(moves)} moves")
    print(f"MATCHED:    {matched} ({matched*100//len(moves)}%)")
    print(f"UNMATCHED:  {unmatched}")
    print(f"OVERRIDES:  {override_used} used, {override_none} explicit no-match")
    print(f"{'─' * 60}")

    print(f"\nWriting {CSV_FILE}...")

    with open(CSV_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "move_id", "slug", "name", "style", "from_position",
            "best_score", "video_url", "video_title", "content_type",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"  {CSV_FILE} written")
    print(f"\n  Review the CSV — fill in blanks for unmatched moves if you have URLs.")
    print(f"  Then run: python3 match_move_videos.py --sql")

# ── Phase 2: Generate SQL from reviewed CSV ───────────────────────────────────
def generate_sql():
    if not os.path.exists(CSV_FILE):
        print(f"ERROR: {CSV_FILE} not found. Run without --sql first.")
        return

    print(f"Reading {CSV_FILE}...")
    inserts = []

    with open(CSV_FILE, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get("video_url", "").strip()
            if not url:
                continue

            move_id      = row["move_id"]
            content_type = row.get("content_type", "technique").strip() or "technique"
            slug         = row.get("slug", "")
            name         = row.get("name", "")
            video_title  = row.get("video_title", "")

            inserts.append({
                "move_id":      move_id,
                "slug":         slug,
                "name":         name,
                "url":          url,
                "content_type": content_type,
                "video_title":  video_title,
            })

    print(f"  {len(inserts)} moves with videos\n")
    print(f"Writing {SQL_FILE}...")

    with open(SQL_FILE, "w") as f:
        f.write("-- move_media inserts — generated from reviewed CSV\n")
        f.write("-- generated by match_move_videos.py --sql\n\n")

        for m in inserts:
            safe_title = m["video_title"].replace("'", "''")
            f.write(f"-- {m['slug']} — {m['name']} ← {safe_title[:80]}\n")
            f.write(
                f"INSERT INTO move_media "
                f"(move_id, url, media_type, content_type) "
                f"VALUES ("
                f"'{m['move_id']}', "
                f"'{m['url']}', "
                f"'youtube', "
                f"'{m['content_type']}'"
                f") ON CONFLICT DO NOTHING;\n\n"
            )

    print(f"  {SQL_FILE} written")
    print(f"  Review, then run in Supabase SQL editor.")

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if "--sql" in sys.argv:
        generate_sql()
    else:
        generate_csv()