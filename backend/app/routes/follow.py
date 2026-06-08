from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import oauth2

router=APIRouter(
    prefix="/follow",
    tags=["follow"]
)

@router.post('/')
def follow(user_id:int,db:Session=Depends(get_db),current_user:models.User=Depends(oauth2.get_current_user)):
    user=db.query(models.User).filter(models.User.id==user_id).first()
    if user is None:
        raise HTTPException(status_code=404,detail="User not found")
    if user_id==current_user.id:
        raise HTTPException(status_code=400,detail="You cannot follow yourself")
    if db.query(models.Follow).filter(models.Follow.follower_id==current_user.id,models.Follow.following_id==user_id).first():
        raise HTTPException(status_code=400,detail="You are already following this user")
    user=db.query(models.User).filter(models.User.id==user_id).first()
    if user is None:
        raise HTTPException(status_code=404,detail="User not found")
    
    existing_follow=db.query(models.Follow).filter(models.Follow.follower_id==current_user.id,models.Follow.following_id==user_id).first()
    if existing_follow:
        raise HTTPException(status_code=400,detail="You are already following this user")
    db.add(models.Follow(follower_id=current_user.id,following_id=user_id))
    db.commit()
    return {"message":"Follow successful"}

@router.delete('/{user_id}')
def unfollow(user_id:int,db:Session=Depends(get_db),current_user:models.User=Depends(oauth2.get_current_user)):
    user=db.query(models.User).filter(models.User.id==user_id).first()
    if user is None:
        raise HTTPException(status_code=404,detail="User not found")
    follow=db.query(models.Follow).filter(models.Follow.follower_id==current_user.id,models.Follow.following_id==user_id).first()
    if follow is None:
        raise HTTPException(status_code=400,detail="You are not following this user")
    db.delete(follow)
    db.commit()
    return {"message":"Unfollow successful"}

@router.get('/followers/{user_id}')
def get_followers(user_id:int,db:Session=Depends(get_db)):
    followers=db.query(models.Follow).filter(models.Follow.following_id==user_id).all()
    return followers

@router.get('/following/{user_id}')
def get_following(user_id:int,db:Session=Depends(get_db)):
    following=db.query(models.Follow).filter(models.Follow.follower_id==user_id).all()
    return following
