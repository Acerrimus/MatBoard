from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client, ClientOptions
from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_supabase_client(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Client:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    token = credentials.credentials
    return create_client(
        settings.supabase_url,
        settings.supabase_key,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {token}"}
        )
    )


def get_current_user(
    client: Client = Depends(get_supabase_client)
):
    try:
        response = client.auth.get_user()
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