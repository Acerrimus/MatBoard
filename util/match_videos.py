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
    "PLDo9M4UVhQm7N2e-D-mLKjAf2RvyXEgIC",  # Folkstyle L1
    "PLDo9M4UVhQm4d5ii338L9fu1fzjyXgWb7",  # Folkstyle L2
    "PLDo9M4UVhQm4AtlVk4Hv7Fm_lurUDHC55",  # Folkstyle L3
    "PLDo9M4UVhQm75STaKHh8voU5ctwdwO6mq",  # Olympic Styles L1
    "PLDo9M4UVhQm4o5QEd-UgO7T5DUmCZQFrg",  # Freestyle L2
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

# ── Fetch curriculum chains from Supabase ─────────────────────────────────────
def get_chains():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/curriculum_chains",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={"select": "id,name,curriculum_id"},
    )
    return resp.json()

# ── Fetch curricula from Supabase (for display only) ──────────────────────────
def get_curricula():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/curricula",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        params={"select": "id,name"},
    )
    return {c["id"]: c["name"] for c in resp.json()}

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

# ── Strip curriculum prefix from video title for better matching ──────────────
# e.g. "Level 2 - Folkstyle Core Curriculum - Sweep Single   Head Inside"
#   → "Sweep Single   Head Inside"
def strip_prefix(title):
    parts = title.split(" - ")
    if len(parts) >= 3:
        return " - ".join(parts[2:]).strip()
    return title.strip()

# ── Fuzzy match ───────────────────────────────────────────────────────────────
def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

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
                # Store both original and stripped title for matching
                v["stripped_title"] = strip_prefix(v["title"])
                all_videos.append(v)
                new_count += 1
        print(f"  {len(videos)} videos found, {new_count} new after dedup\n")

    print(f"Total unique videos across all playlists: {len(all_videos)}\n")

    if not all_videos:
        print("ERROR: No videos fetched. Check PLAYLISTS and YOUTUBE_API_KEY.")
        return

    # ── Fetch chains and curricula ────────────────────────────────────────────
    print("Fetching curriculum chains from Supabase...")
    chains   = get_chains()
    curricula = get_curricula()
    print(f"  {len(chains)} chains found\n")

    # ── Match each chain against all videos ───────────────────────────────────
    all_matches = []
    unmatched   = []

    print(f"{'Curriculum':<30} {'Chain':<45} {'Score':>6}  {'Type':<10}  Video title")
    print("─" * 130)

    for chain in sorted(chains, key=lambda c: (c["curriculum_id"], c["name"])):
        curriculum_name = curricula.get(chain["curriculum_id"], "Unknown")

        # Match against stripped titles for much better accuracy
        scored = [
            (v, similarity(chain["name"], v["stripped_title"]))
            for v in all_videos
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        above_threshold = [(v, s) for v, s in scored if s >= 0.6]

        if above_threshold:
            for video, score in above_threshold:
                content_type = infer_content_type(video["title"])
                flag = "⚠ " if score < 0.5 else "✓ "
                print(
                    f"{flag}{curriculum_name[:28]:<30} "
                    f"{chain['name'][:43]:<45} "
                    f"{score:>5.2f}  "
                    f"{content_type:<10}  "
                    f"{video['stripped_title'][:50]}"
                )
                all_matches.append({
                    "chain_id":     chain["id"],
                    "chain_name":   chain["name"],
                    "curriculum":   curriculum_name,
                    "url":          video["url"],
                    "video_title":  video["title"],
                    "score":        score,
                    "content_type": content_type,
                })
        else:
            best_video, best_score = scored[0] if scored else (None, 0.0)
            print(
                f"✗ {curriculum_name[:28]:<30} "
                f"{chain['name'][:43]:<45} "
                f"{best_score:>5.2f}  "
                f"{'—':<10}  NO MATCH"
            )
            unmatched.append(f"{curriculum_name} — {chain['name']}")

    print(f"\n{len(all_matches)} match rows, {len(unmatched)} unmatched chains")

    if unmatched:
        print("\nUnmatched chains — assign manually:")
        for name in unmatched:
            print(f"  - {name}")

    # ── Generate SQL ──────────────────────────────────────────────────────────
    print("\nGenerating curriculum_chain_media_inserts.sql...")
    with open("curriculum_chain_media_inserts.sql", "w") as f:
        f.write("-- curriculum_chain_media inserts — review before running\n")
        f.write("-- generated by match_videos.py\n")
        f.write("-- content_type on 'drill' rows may need manual correction\n\n")

        for m in all_matches:
            if m["score"] < 0.5:
                f.write(f"-- ⚠ LOW CONFIDENCE ({m['score']:.2f}) — verify this match\n")
            f.write(f"-- {m['curriculum']} — {m['chain_name']} ← {m['video_title'][:80]}\n")
            f.write(
                f"INSERT INTO curriculum_chain_media "
                f"(curriculum_chain_id, url, media_type, content_type) "
                f"VALUES ("
                f"'{m['chain_id']}', "
                f"'{m['url']}', "
                f"'youtube', "
                f"'{m['content_type']}'"
                f") ON CONFLICT DO NOTHING;\n\n"
            )

    print("  curriculum_chain_media_inserts.sql written")
    print("  Review matches above, edit SQL if needed, then run in Supabase.")

if __name__ == "__main__":
    main()