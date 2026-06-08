from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import app.schemas as schemas, app.database as database, app.models as models
from fastapi import Depends, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from app.utils.redis_client import redis_client
from app import database
load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='login')

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ── Token blacklist (Redis) ───────────────────────────────────────────────────

async def blacklist_token(token: str) -> None:
    """
    Store the raw token in Redis with a TTL equal to its remaining lifetime.
    After the TTL the key auto-expires, keeping Redis lean.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp: int = payload.get("exp")
        if exp:
            ttl = exp - int(datetime.now(timezone.utc).timestamp())
            if ttl > 0:
                try:
                    await redis_client.setex(f"blacklist:{token}", ttl, "1")
                except Exception as e:
                    print(f"Redis error during blacklisting: {e}")
    except JWTError:
        pass  # already invalid — nothing to blacklist


async def is_token_blacklisted(token: str) -> bool:
    """Return True if the token has been blacklisted (i.e. the user logged out)."""
    try:
        return await redis_client.exists(f"blacklist:{token}") == 1
    except Exception as e:
        print(f"Redis error checking blacklist: {e}")
        return False

# ── Token verification ────────────────────────────────────────────────────────

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id: str = payload.get("user_id")
        if id is None:
            raise credentials_exception
        token_data = schemas.TokenData(id=str(id))
    except JWTError:
        raise credentials_exception
    return token_data


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Reject tokens that have been explicitly invalidated via /logout
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == token_data.id).first()
    return user
