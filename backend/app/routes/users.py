from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import oauth2
import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import io
from typing import Optional
from app.utils.imgbb import upload_image_to_imgbb

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@router.get('/me', response_model=schemas.UserResponse)
async def get_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    return current_user


@router.get('/{user_id}/profile', response_model=schemas.UserWithPosts)
async def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get follower and following counts
    followers_count = db.query(models.Follow).filter(models.Follow.following_id == user_id).count()
    following_count = db.query(models.Follow).filter(models.Follow.follower_id == user_id).count()
    
    # Check if current user follows this user
    is_followed = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.following_id == user_id
    ).first() is not None
    
    # Get user's posts with engagement info
    posts = db.query(models.Post).filter(models.Post.user_id == user_id).order_by(models.Post.created_at.desc()).all()
    
    posts_response = []
    for post in posts:
        like_count = db.query(models.Like).filter(models.Like.post_id == post.id).count()
        comment_count = db.query(models.Comment).filter(models.Comment.post_id == post.id).count()
        liked_by_me = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None
        
        saved_by_me = db.query(models.SavedPost).filter(
            models.SavedPost.post_id == post.id,
            models.SavedPost.user_id == current_user.id
        ).first() is not None
        
        posts_response.append(schemas.PostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            image_url=post.image_url,
            caption=post.caption,
            created_at=post.created_at,
            owner=schemas.UserPublic(
                id=post.owner.id,
                username=post.owner.username,
                profile_image=post.owner.profile_image
            ),
            like_count=like_count,
            comment_count=comment_count,
            liked_by_me=liked_by_me,
            saved_by_me=saved_by_me
        ))
    
    return schemas.UserWithPosts(
        id=user.id,
        username=user.username,
        email=user.email,
        bio=user.bio,
        profile_image=user.profile_image,
        is_active=user.is_active,
        created_at=user.created_at,
        followers_count=followers_count,
        following_count=following_count,
        posts=posts_response,
        is_followed_by_me=is_followed
    )


@router.get('/{user_id}', response_model=schemas.UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put('/me', response_model=schemas.UserResponse)
async def update_profile(
    username: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    profile_image_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    if username:
        # Check if username is taken
        existing_user = db.query(models.User).filter(models.User.username == username).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = username
    
    if bio is not None:
        current_user.bio = bio
        
    if profile_image and allowed_file(profile_image.filename):
        content = await profile_image.read()
        img = Image.open(io.BytesIO(content))
        # Square crop for avatar
        width, height = img.size
        size = min(width, height)
        left = (width - size) / 2
        top = (height - size) / 2
        img = img.crop((left, top, left + size, top + size))
        img.thumbnail((400, 400))
        
        # Save to buffer
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        processed_content = buffer.getvalue()
        
        # Upload to ImgBB
        image_url = await upload_image_to_imgbb(processed_content)
        current_user.profile_image = image_url
    elif profile_image_url:
        current_user.profile_image = profile_image_url
        
    db.commit()
    db.refresh(current_user)
    return current_user
