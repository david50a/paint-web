from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import oauth2
from app import schemas
from typing import List

router = APIRouter(
    prefix="/save",
    tags=["save"]
)

@router.post('/toggle/{post_id}')
def toggle_save(
    post_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(oauth2.get_current_user)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    saved_post = db.query(models.SavedPost).filter(
        models.SavedPost.post_id == post_id,
        models.SavedPost.user_id == current_user.id
    ).first()

    if saved_post:
        db.delete(saved_post)
        db.commit()
        return {"saved": False}
    else:
        db.add(models.SavedPost(post_id=post_id, user_id=current_user.id))
        db.commit()
        return {"saved": True}

@router.get('/user/{user_id}', response_model=List[schemas.PostResponse])
def get_saved_posts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    # Retrieve posts saved by the user
    saved_posts = db.query(models.Post).join(
        models.SavedPost, models.Post.id == models.SavedPost.post_id
    ).filter(
        models.SavedPost.user_id == user_id
    ).order_by(models.SavedPost.created_at.desc()).all()

    result = []
    for post in saved_posts:
        like_count = db.query(models.Like).filter(models.Like.post_id == post.id).count()
        comment_count = db.query(models.Comment).filter(models.Comment.post_id == post.id).count()
        liked_by_me = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
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
            saved_by_me=True # By definition in this endpoint
        ))
    return result
