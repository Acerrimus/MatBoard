from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client, ClientOptions
from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

def get_supabase_client(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Client:
    token = credentials.credentials
    client = create_client(settings.supabase_url, settings.supabase_key)
    client.postgrest = client.postgrest.auth(token)  # capture the return value
    return client

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
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