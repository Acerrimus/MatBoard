from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings

bearer_scheme = HTTPBearer()

def get_supabase_client(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Client:
    token = credentials.credentials
    client = create_client(settings.supabase_url, settings.supabase_key)
    client.postgrest.auth(token)
    return client

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    token = credentials.credentials
    client = create_client(settings.supabase_url, settings.supabase_key)
    try:
        response = client.auth.get_user(token)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )