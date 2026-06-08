from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import oauth2
from sqlalchemy import func

router=APIRouter(
    prefix="/like",
    tags=["like"]
)

@router.post('/')
def like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail='Post not found')

    existing_like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail='Already liked')

    like = models.Like(
        post_id=post_id,
        user_id=current_user.id  
    )

    db.add(like)
    db.commit()

    return {'message': 'Like successful'}

@router.delete('/{post_id}')
def unlike(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()

    if like is None:
        raise HTTPException(status_code=404, detail='Like not found')

    db.delete(like)
    db.commit()

    return {'message': 'Unlike successful'}

@router.get('/count/{post_id}')
def get_likes_count(post_id: int, db: Session = Depends(get_db)):
    count = db.query(func.count(models.Like.id)).filter(
        models.Like.post_id == post_id
    ).scalar()

    return {"post_id": post_id, "likes": count}

@router.post('/toggle/{post_id}')
def toggle_like(post_id: int, db: Session = Depends(get_db), current_user=Depends(oauth2.get_current_user)):
    like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()

    if like:
        db.delete(like)
        db.commit()
        return {"liked": False}
    else:
        db.add(models.Like(post_id=post_id, user_id=current_user.id))
        db.commit()
        return {"liked": True}