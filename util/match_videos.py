import os
import json
import requests
from difflib import SequenceMatcher

# ── Config ────────────────────────────────────────────────────────────────────
YOUTUBE_API_KEY = "AIzaSyBXOH81w_BU4pXVX-sJ2GbJqKlJ0Yo8IjU"
PLAYLIST_ID     = "PLDo9M4UVhQm4AtlVk4Hv7Fm_lurUDHC55"  # the bit after ?list= in the URL
SUPABASE_URL    = "https://lksalnbrcoxmnmckmcam.supabase.co"
SUPABASE_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc2FsbmJyY294bW5tY2ttY2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDYxMDIsImV4cCI6MjA4OTYyMjEwMn0.4xwoYLjMIjPM0whuCaNH32abQsu1zAzXpz0_9z_0tII"  # anon key is fine, moves are public

PLAYLISTS = [
    "PLDo9M4UVhQm7N2e-D-mLKjAf2RvyXEgIC",
    "PLDo9M4UVhQm4d5ii338L9fu1fzjyXgWb7",
    "PLDo9M4UVhQm4AtlVk4Hv7Fm_lurUDHC55",
    "PLDo9M4UVhQm75STaKHh8voU5ctwdwO6mq",
    "PLDo9M4UVhQm4o5QEd-UgO7T5DUmCZQFrg",
    "PLDo9M4UVhQm6qCDzr01gHBv_fOiCWDnMP",
]

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

# ── Fetch moves from Supabase ─────────────────────────────────────────────────
def get_moves():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/moves",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={"select": "id,name,slug"},
    )
    return resp.json()

# ── Infer content type from video title ───────────────────────────────────────
# "Drills, Activities and Games" section header treated as 'drill' — cannot
# distinguish drill vs game from title alone. Flagged in SQL for manual correction.
def infer_content_type(title):
    title_lower = title.lower()
    if "drills, activities and games" in title_lower:
        return "drill"
    if "drill" in title_lower:
        return "drill"
    if "game" in title_lower:
        return "game"
    return "technique"

# ── Fuzzy match ───────────────────────────────────────────────────────────────
def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def best_match(move_name, videos, threshold=0.35):
    if not videos:
        return None, 0.0
    scored = [
        (v, similarity(move_name, v["title"]))
        for v in videos
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    best_video, best_score = scored[0]
    if best_score >= threshold:
        return best_video, best_score
    return None, best_score

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    # ── Fetch all videos across all playlists ─────────────────────────────────
    all_videos = []
    seen_urls  = set()

    for playlist_id in PLAYLISTS:
        print(f"Fetching playlist {playlist_id}...")
        videos = get_playlist_videos(playlist_id, YOUTUBE_API_KEY)
        new_count = 0
        for v in videos:
            if v["url"] not in seen_urls:
                seen_urls.add(v["url"])
                all_videos.append(v)
                new_count += 1
        print(f"  {len(videos)} videos found, {new_count} new after dedup\n")

    print(f"Total unique videos across all playlists: {len(all_videos)}\n")

    if not all_videos:
        print("ERROR: No videos fetched. Check your PLAYLISTS and YOUTUBE_API_KEY.")
        return

    # ── Fetch moves ───────────────────────────────────────────────────────────
    print("Fetching moves from Supabase...")
    moves = get_moves()
    print(f"  {len(moves)} moves found\n")

    # ── Match each move against ALL videos ────────────────────────────────────
    # A move can match multiple videos — one per playlist section it appears in.
    # ON CONFLICT DO NOTHING handles exact URL duplicates at insert time.
    all_matches = []
    unmatched   = []

    print(f"{'Move':<35} {'Score':>6}  {'Type':<10}  Video title")
    print("─" * 110)

    for move in sorted(moves, key=lambda m: m["name"]):
        # Collect ALL videos above threshold for this move, not just the best
        scored = [
            (v, similarity(move["name"], v["title"]))
            for v in all_videos
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        above_threshold = [(v, s) for v, s in scored if s >= 0.35]

        if above_threshold:
            for video, score in above_threshold:
                content_type = infer_content_type(video["title"])
                flag = "⚠ " if score < 0.5 else "✓ "
                print(f"{flag}{move['name']:<33} {score:>5.2f}  {content_type:<10}  {video['title'][:60]}")
                all_matches.append({
                    "move_id":      move["id"],
                    "move_name":    move["name"],
                    "url":          video["url"],
                    "video_title":  video["title"],
                    "score":        score,
                    "content_type": content_type,
                })
        else:
            best_video, best_score = scored[0] if scored else (None, 0.0)
            print(f"✗ {move['name']:<33} {best_score:>5.2f}  {'—':<10}  NO MATCH")
            unmatched.append(move["name"])

    print(f"\n{len(all_matches)} match rows, {len(unmatched)} unmatched moves")

    if unmatched:
        print("\nUnmatched moves — assign manually:")
        for name in unmatched:
            print(f"  - {name}")

    # ── Generate SQL ──────────────────────────────────────────────────────────
    print("\nGenerating move_media_inserts.sql...")
    with open("move_media_inserts.sql", "w") as f:
        f.write("-- move_media inserts — review before running\n")
        f.write("-- generated by match_videos.py\n")
        f.write("-- content_type on 'drill' rows from 'Drills, Activities and Games'\n")
        f.write("-- section may need manual correction to 'game' where appropriate\n\n")

        for m in all_matches:
            if m["score"] < 0.5:
                f.write(f"-- ⚠ LOW CONFIDENCE ({m['score']:.2f}) — verify this match\n")
            f.write(f"-- {m['move_name']} ← {m['video_title'][:80]}\n")
            f.write(
                f"INSERT INTO move_media (move_id, url, media_type, content_type) "
                f"VALUES ("
                f"'{m['move_id']}', "
                f"'{m['url']}', "
                f"'youtube', "
                f"'{m['content_type']}'"
                f") ON CONFLICT DO NOTHING;\n\n"
            )

    print("  move_media_inserts.sql written")
    print("  Review the matches above, edit the SQL file if needed, then run it in Supabase.")

if __name__ == "__main__":
    main()