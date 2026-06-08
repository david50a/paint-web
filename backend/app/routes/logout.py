"""
POST /logout

Blacklists the caller's JWT in Redis so it can never be reused,
even before it naturally expires.
"""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request
from app import oauth2

router = APIRouter(prefix="/logout", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


@router.post("/", status_code=status.HTTP_200_OK)
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user=Depends(oauth2.get_current_user),
):
    """
    Invalidate the current access token.

    After calling this endpoint the token is stored in Redis with a TTL
    matching its remaining lifetime, so any further requests using it
    will receive a 401.
    """
    await oauth2.blacklist_token(token)
    return {"message": "Successfully logged out"}
