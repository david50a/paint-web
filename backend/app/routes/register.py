
from fastapi import APIRouter,Depends,HTTPException,UploadFile,File
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models
import re
import uuid
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io
from fastapi import Request
from app.utils.security import get_password_hash
from app.utils.limiter import limiter
from app.utils.imgbb import upload_image_to_imgbb


# limiter is now imported from utils.limiter

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

router=APIRouter(
    prefix="/register",
    tags=["register"]
    
)

@router.post('/')
@limiter.limit("5/minute")
async def register(request:Request,username:str,email:str,password:str,db:Session=Depends(get_db),bio:str=None,profile_image:UploadFile=File(None)):
     if not validemail(email):
         raise HTTPException(status_code=400,detail="Invalid email")
     if not validusername(username):
         raise HTTPException(status_code=400,detail="Invalid username")
     if not validpassword(password):
         raise HTTPException(status_code=400,detail="Invalid password")
     if db.query(models.User).filter(models.User.username==username).first():
         raise HTTPException(status_code=400,detail="Username already exists")
     if db.query(models.User).filter(models.User.email==email).first():
         raise HTTPException(status_code=400,detail="Email already exists")
     hashed_password=get_password_hash(password)
     if profile_image and allowed_file(profile_image.filename):
         content = await profile_image.read()
         
         MAX_FILE_SIZE = 2 * 1024 * 1024  
         if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
            
         try:
            image=Image.open(io.BytesIO(content))
            image.thumbnail((512,512))
            image=image.convert("RGB")
            
            # Save to buffer
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85, optimize=True)
            processed_content = buffer.getvalue()
            
            # Upload to ImgBB
            profile_image_url = await upload_image_to_imgbb(processed_content)
         except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file or upload failed: {str(e)}")
     else:
         profile_image_url = None
     user=models.User(username=username,email=email,hashed_password=hashed_password,is_active=True,bio=bio,profile_image=profile_image_url)
     db.add(user)
     db.commit()
     db.refresh(user)
     return {"message":"User registered successfully"}


def validemail(email:str)->bool:
    return re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email)

def validusername(username:str)->bool:
    return re.match(r"^[a-zA-Z0-9_]+$", username)

def validpassword(password:str)->bool:
    # Requires at least 8 characters, one uppercase, one lowercase, one digit, and one special character from the set
    return bool(re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$", password))

def allowed_file(filename:str)->bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
