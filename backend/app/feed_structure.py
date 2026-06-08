from sqlalchemy.orm import Session
from datetime import datetime
import numpy as np
import models

def get_home_feed(db: Session, user_id: int, limit: int = 20, offset: int = 0):
    return (
        db.query(models.Post)
        .outerjoin(models.Follow, models.Follow.following_id == models.Post.user_id)
        .filter((models.Follow.follower_id == user_id) | (models.Post.user_id == user_id))
        .order_by(models.Post.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

def get_following_feed(db: Session, user_id: int, limit: int = 20, offset: int = 0):
    return (
        db.query(models.Post)
        .join(models.Follow, models.Follow.following_id == models.Post.user_id)
        .filter(models.Follow.follower_id == user_id) 
        .order_by(models.Post.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

def get_explore_feed(db: Session, limit: int = 20, offset: int = 0):
    return (
        db.query(models.Post)
        .order_by(models.Post.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

def get_optimized_feed(db: Session, last_time: datetime, limit: int = 20, offset: int = 0):
    return (
        db.query(models.Post)
        .filter(models.Post.created_at > last_time) 
        .order_by(models.Post.created_at.desc())
        .limit(limit)
        .all()
    )

def validate_user_vector(user_vector: list):
    if user_vector is None or not isinstance(user_vector, list):
        return False
    if len(user_vector) != 384:
        return False
    if all(v == 0 for v in user_vector):
        return False
    return True

def get_for_you_feed(db: Session, user_vector: list, limit: int = 20):
    if not validate_user_vector(user_vector):
        return get_explore_feed(db, limit)
        
    return (
        db.query(models.Post)
        .order_by(models.Post.embedding.cosine_distance(user_vector))
        .limit(limit)
        .all()
    )

def get_feed_cursor(db: Session, last_created_at: datetime = None, limit: int = 20):
    query=db.query(models.Post)
    if last_created_at:
        query=query.filter(models.Post.created_at < last_created_at)
    return query.order_by(models.Post.created_at.desc()).limit(limit).all()