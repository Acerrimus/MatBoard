# backend/app/utils.py

from fastapi import HTTPException
import re


def slugify(name: str) -> str:
    """Converts a human-readable name into a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_-]+', '-', s)
    return s


def make_unique_slug(base_slug: str, suffix: str, client) -> str:
    """Returns base_slug, or base_slug-suffix if a collision exists in moves."""
    existing = client.table("moves").select("id").eq("slug", base_slug).execute()
    if existing.data:
        return f"{base_slug}-{suffix}"
    return base_slug


def make_unique_position_slug(base_slug: str, suffix: str, client) -> str:
    """Returns base_slug, or base_slug-suffix if a collision exists in positions."""
    existing = client.table("positions").select("id").eq("slug", base_slug).execute()
    if existing.data:
        return f"{base_slug}-{suffix}"
    return base_slug


def verify_positions_exist(from_id: str, to_id: str, client):
    """Raises 400 if either position ID does not exist in the DB."""
    res = client.table("positions") \
        .select("id") \
        .in_("id", [from_id, to_id]) \
        .execute()
    found_ids = {row["id"] for row in (res.data or [])}
    if from_id not in found_ids:
        raise HTTPException(status_code=400, detail="from_position_id does not exist")
    if to_id not in found_ids:
        raise HTTPException(status_code=400, detail="to_position_id does not exist")