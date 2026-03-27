    from fastapi import APIRouter, Depends, HTTPException
    from pydantic import BaseModel, Field, model_validator
    from typing import Optional
    from app.auth import get_current_user, get_supabase_client

    router = APIRouter()


    class ProgressUpsert(BaseModel):
        move_id: str
        confidence: Optional[int] = None
        is_favourite: Optional[bool] = False

        @model_validator(mode='after')
        def validate_confidence(self):
            if self.confidence is not None and not (1 <= self.confidence <= 5):
                raise ValueError('confidence must be between 1 and 5')
            # Must have at least one of confidence or is_favourite
            if self.confidence is None and not self.is_favourite:
                raise ValueError('must provide confidence or is_favourite')
            return self


    @router.get("/")
    def get_my_progress(
        user=Depends(get_current_user),
        client=Depends(get_supabase_client)
    ):
        response = client.table("user_move_progress") \
            .select("*, move:moves(id, name, slug)") \
            .eq("user_id", user.id) \
            .execute()
        return response.data


    @router.get("/{move_id}")
    def get_progress_for_move(
        move_id: str,
        user=Depends(get_current_user),
        client=Depends(get_supabase_client)
    ):
        response = client.table("user_move_progress") \
            .select("*") \
            .eq("user_id", user.id) \
            .eq("move_id", move_id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="No progress found for this move")
        return response.data[0]


@router.post("/")
def upsert_progress(
    body: ProgressUpsert,
    user=Depends(get_current_user),
    client=Depends(get_supabase_client)
):
    row = {
        "user_id": user.id,
        "move_id": body.move_id,
        "is_favourite": body.is_favourite,
    }
    if body.confidence is not None:
        row["confidence"] = body.confidence

    response = client.table("user_move_progress") \
        .upsert(row, on_conflict="user_id,move_id") \
        .execute()

    client.table("user_board") \
        .upsert(
            {"user_id": user.id, "move_id": body.move_id},
            on_conflict="user_id,move_id"
        ) \
        .execute()

    return response.data[0]


    @router.delete("/{move_id}")
    def delete_progress(
        move_id: str,
        user=Depends(get_current_user),
        client=Depends(get_supabase_client)
    ):
        client.table("user_move_progress") \
            .delete() \
            .eq("user_id", user.id) \
            .eq("move_id", move_id) \
            .execute()
        return {"status": "deleted"}