from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models
from app import schemas
import re
import uuid
import json
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io
from sentence_transformers import SentenceTransformer
from typing import List, Optional
from app.utils.imgbb import upload_image_to_imgbb
from app import oauth2
from fastapi import Request
from app.utils.limiter import limiter

model = SentenceTransformer('all-MiniLM-L6-v2')

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


router = APIRouter(
    prefix="/posts",
    tags=["posts"]
)


@router.post('/')
@limiter.limit("10/minute")
async def create_post(
    request: Request,
    title: str,
    description: str,
    image: UploadFile = File(None),
    image_url: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    embedding = None
    final_image_url = None
    
    text_to_embed = f"{title} {description}".strip()
    if text_to_embed:
        embedding = json.dumps(model.encode(text_to_embed).tolist())
        
    if image and allowed_file(image.filename):
        content = await image.read()
        # Process image with PIL
        img = Image.open(io.BytesIO(content))
        img.thumbnail((1024, 1024))
        
        # Save processed image to a buffer
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        processed_content = buffer.getvalue()
        
        # Upload to ImgBB
        final_image_url = await upload_image_to_imgbb(processed_content)
    elif image_url:
        final_image_url = image_url

    post = models.Post(
        user_id=current_user.id,
        title=title,
        content=description,
        image_url=final_image_url,
        embedding=embedding
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"message": "Post created successfully", "post_id": post.id}


@router.get('/all', response_model=List[schemas.PostResponse])
def get_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).all()
    result = []
    for post in posts:
        like_count = db.query(func.count(models.Like.id)).filter(
            models.Like.post_id == post.id
        ).scalar()
        comment_count = db.query(func.count(models.Comment.id)).filter(
            models.Comment.post_id == post.id
        ).scalar()
        liked_by_me = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None

        saved_by_me = db.query(models.SavedPost).filter(
            models.SavedPost.post_id == post.id,
            models.SavedPost.user_id == current_user.id
        ).first() is not None

        result.append(schemas.PostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            image_url=post.image_url,
            caption=post.caption,
            created_at=post.created_at,
            owner=schemas.UserPublic(
                id=post.owner.id,
                username=post.owner.username,
                profile_image=post.owner.profile_image,
            ),
            like_count=like_count,
            comment_count=comment_count,
            liked_by_me=liked_by_me,
            saved_by_me=saved_by_me,
        ))
    return result


@router.get('/user/{user_id}', response_model=List[schemas.PostResponse])
def get_user_posts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    posts = db.query(models.Post).filter(
        models.Post.user_id == user_id
    ).order_by(models.Post.created_at.desc()).all()

    result = []
    for post in posts:
        like_count = db.query(func.count(models.Like.id)).filter(
            models.Like.post_id == post.id
        ).scalar()
        comment_count = db.query(func.count(models.Comment.id)).filter(
            models.Comment.post_id == post.id
        ).scalar()
        liked_by_me = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None

        saved_by_me = db.query(models.SavedPost).filter(
            models.SavedPost.post_id == post.id,
            models.SavedPost.user_id == current_user.id
        ).first() is not None

        result.append(schemas.PostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            image_url=post.image_url,
            caption=post.caption,
            created_at=post.created_at,
            owner=schemas.UserPublic(
                id=post.owner.id,
                username=post.owner.username,
                profile_image=post.owner.profile_image,
            ),
            like_count=like_count,
            comment_count=comment_count,
            liked_by_me=liked_by_me,
            saved_by_me=saved_by_me,
        ))
    return result


@router.get('/me', response_model=List[schemas.PostResponse])
def get_my_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    posts = db.query(models.Post).filter(
        models.Post.user_id == current_user.id
    ).order_by(models.Post.created_at.desc()).all()

    result = []
    for post in posts:
        like_count = db.query(func.count(models.Like.id)).filter(
            models.Like.post_id == post.id
        ).scalar()
        comment_count = db.query(func.count(models.Comment.id)).filter(
            models.Comment.post_id == post.id
        ).scalar()

        saved_by_me = db.query(models.SavedPost).filter(
            models.SavedPost.post_id == post.id,
            models.SavedPost.user_id == current_user.id
        ).first() is not None

        result.append(schemas.PostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            image_url=post.image_url,
            caption=post.caption,
            created_at=post.created_at,
            owner=schemas.UserPublic(
                id=post.owner.id,
                username=post.owner.username,
                profile_image=post.owner.profile_image,
            ),
            like_count=like_count,
            comment_count=comment_count,
            liked_by_me=True,
            saved_by_me=saved_by_me,
        ))
    return result


@router.get('/following', response_model=List[schemas.PostResponse])
def get_following_posts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    # Join with Follow table to get posts only from followed artists
    posts = db.query(models.Post).join(
        models.Follow, models.Post.user_id == models.Follow.following_id
    ).filter(
        models.Follow.follower_id == current_user.id
    ).order_by(models.Post.created_at.desc()).all()

    result = []
    for post in posts:
        like_count = db.query(func.count(models.Like.id)).filter(
            models.Like.post_id == post.id
        ).scalar()
        comment_count = db.query(func.count(models.Comment.id)).filter(
            models.Comment.post_id == post.id
        ).scalar()
        liked_by_me = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None
        saved_by_me = db.query(models.SavedPost).filter(
            models.SavedPost.post_id == post.id,
            models.SavedPost.user_id == current_user.id
        ).first() is not None

        result.append(schemas.PostResponse(
            id=post.id,
            title=post.title,
            content=post.content,
            image_url=post.image_url,
            caption=post.caption,
            created_at=post.created_at,
            owner=schemas.UserPublic(
                id=post.owner.id,
                username=post.owner.username,
                profile_image=post.owner.profile_image,
            ),
            like_count=like_count,
            comment_count=comment_count,
            liked_by_me=liked_by_me,
            saved_by_me=saved_by_me,
        ))
    return result
