import hashlib
import base64
import bcrypt
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
import re
import os
import dotenv
from fastapi.security import OAuth2PasswordBearer,OAuth2PasswordRequestForm
import app.oauth2 as oauth2 , app.schemas as schemas
from app.utils.security import verify_password, get_password_hash
from app.utils.limiter import limiter
from fastapi import Request
from app import schemas
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

dotenv.load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
print(f"[Login Route] Loaded GOOGLE_CLIENT_ID: {GOOGLE_CLIENT_ID}")

router=APIRouter(
    prefix="/login",
    tags=["login"]
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

@router.post('/google', response_model=schemas.Token)
async def google_login(request: Request, google_token: schemas.GoogleToken, db: Session = Depends(get_db)):
    try:
        # Verify the Google ID token
        print(f"[Google Auth] Verifying token for client ID: {GOOGLE_CLIENT_ID}")
        try:
            idinfo = id_token.verify_oauth2_token(google_token.token, google_requests.Request(), GOOGLE_CLIENT_ID)
        except ValueError as e:
            print(f"[Google Auth] Token verification failed: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
        
        email = idinfo['email']
        full_name = idinfo.get('name', email.split('@')[0])
        profile_image = idinfo.get('picture')

        print(f"[Google Auth] Success for email: {email}")

        # Check if user exists by email
        user = db.query(models.User).filter(models.User.email == email).first()

        if not user:
            # Create new user if they don't exist
            # Generate a unique username if the full name is taken
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', full_name.replace(' ', '_').lower())
            username = base_username
            counter = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

            random_password = base64.b64encode(os.urandom(24)).decode('utf-8')
            user = models.User(
                username=username,
                email=email,
                hashed_password=get_password_hash(random_password),
                profile_image=profile_image,
                is_active=True
            )
            try:
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"[Google Auth] Created new user: {username}")
            except Exception as e:
                db.rollback()
                print(f"[Google Auth] Database error: {str(e)}")
                raise HTTPException(status_code=500, detail="Internal server error during user creation")
        
        # Create local access token
        access_token = oauth2.create_access_token(data={"user_id": user.id})
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Google Auth Error] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

from sqlalchemy import or_

@router.post('/', response_model=schemas.Token)
@limiter.limit("5/minute")
def login(request: Request, user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Search for user by either username OR email
    user = db.query(models.User).filter(
        or_(
            models.User.username == user_credentials.username,
            models.User.email == user_credentials.username
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=403, detail=f"Invalid Credentials")

    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=403, detail=f"Invalid Credentials")

    access_token = oauth2.create_access_token(data={"user_id": user.id})

    return {"access_token": access_token, "token_type": "bearer"}