from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
import app.models as models, app.oauth2 as oauth2
from sqlalchemy import func

router=APIRouter(
    prefix="/comment",
    tags=["comment"]
)

@router.post('/')
def comment(post_id:int,comment:str,db:Session=Depends(get_db),current_user:models.User=Depends(oauth2.get_current_user)):
    post=db.query(models.Post).filter(models.Post.id==post_id).first()
    if post is None:
        raise HTTPException(status_code=404,detail="Post not found")
    new_comment = models.Comment(post_id=post_id,user_id=current_user.id,comment=comment,created_at=func.now())
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {"message":"Comment successful"}

@router.delete('/{comment_id}')
def uncomment(comment_id:int,db:Session=Depends(get_db),current_user:models.User=Depends(oauth2.get_current_user)):
    comment=db.query(models.Comment).filter(models.Comment.id==comment_id).first()
    if comment is None:
        raise HTTPException(status_code=404,detail="Comment not found")
    if comment.user_id!=current_user.id:
        raise HTTPException(status_code=403,detail="You are not authorized to delete this comment")
    db.query(models.Comment).filter(models.Comment.id==comment_id).delete()
    db.commit()
    return {"message":"Uncomment successful"}

@router.get('/{post_id}')
def get_comments(post_id:int,db:Session=Depends(get_db)):
    comments=db.query(models.Comment).filter(models.Comment.post_id==post_id).order_by(models.Comment.created_at.desc()).all()
    
    result = []
    for comment in comments:
        result.append({
            "id": comment.id,
            "post_id": comment.post_id,
            "user_id": comment.user_id,
            "comment": comment.comment,
            "created_at": comment.created_at,
            "user": {
                "username": comment.user.username,
                "profile_image": comment.user.profile_image
            }
        })
    return result