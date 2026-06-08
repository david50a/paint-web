from fastapi import APIRouter,Depends,HTTPException,UploadFile,File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import uuid
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io
from app.utils.imgbb import upload_image_to_imgbb

ALLOWED_EXTENSIONS={"png","jpg","jpeg","gif","webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS

router=APIRouter(
    prefix="/upload",
    tags=["upload"]
)

@router.post('/')
async def upload(file:UploadFile=File(...),db:Session=Depends(get_db)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400,detail="Invalid file type")
    
    content = await file.read()
    # Process image with PIL to resize/compress before upload
    img = Image.open(io.BytesIO(content))
    img.thumbnail((1024, 1024))
    
    # Save processed image to a buffer
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    processed_content = buffer.getvalue()
    
    # Upload to ImgBB
    image_url = await upload_image_to_imgbb(processed_content)
    
    return {"image_url": image_url}