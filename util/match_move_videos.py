"""
match_move_videos.py — Match individual moves to YouTube videos
Generates a CSV for review, then SQL inserts for move_media.

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

MATCH_THRESHOLD = 0.55  # lower than chains — move names are shorter
CSV_FILE = "move_video_matches.csv"
SQL_FILE = "move_media_inserts.sql"

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

    # Match each move to best video
    matched   = 0
    unmatched = 0

    print(f"{'Style':<12} {'Position':<25} {'Move':<40} {'Score':>6}  Video")
    print("─" * 130)

    rows = []
    for move in sorted(moves, key=lambda m: (m["styles"][0] if m["styles"] else "", m["slug"])):
        style = move["styles"][0] if move["styles"] else "unknown"
        pos   = positions.get(move["from_position_id"], {})
        pos_name = pos.get("name", "Unknown")
        pos_slug = pos.get("slug", "unknown")

        # Score against all videos using move name
        scored = [
            (v, similarity(move["name"], v["stripped_title"]))
            for v in all_videos
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        best_video, best_score = scored[0] if scored else (None, 0.0)

        if best_score >= MATCH_THRESHOLD and best_video:
            flag = "✓"
            matched += 1
            video_url   = best_video["url"]
            video_title = best_video["stripped_title"]
            content_type = infer_content_type(best_video["title"])
        else:
            flag = "✗"
            unmatched += 1
            video_url    = ""
            video_title  = f"BEST: {best_video['stripped_title'][:40]} ({best_score:.2f})" if best_video else "NO VIDEOS"
            content_type = ""

        print(
            f"{flag} {style:<11} "
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
            "video_url":      video_url,
            "video_title":    video_title if video_url else "",
            "content_type":   content_type,
        })

    # Write CSV
    print(f"\n{matched} matched, {unmatched} unmatched out of {len(moves)} moves")
    print(f"\nWriting {CSV_FILE}...")

    with open(CSV_FILE, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "move_id", "slug", "name", "style", "from_position",
            "best_score", "video_url", "video_title", "content_type",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"  {CSV_FILE} written — review and fill in blanks, then run:")
    print(f"  python3 match_move_videos.py --sql")

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
                continue  # skip unmatched / blank rows

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
            # Escape single quotes in titles
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