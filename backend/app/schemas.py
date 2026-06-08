from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: int
    username: str
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    id: Optional[str] = None


class GoogleToken(BaseModel):
    token: str


class PostResponse(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    caption: Optional[str] = None
    created_at: Optional[datetime] = None
    owner: UserPublic
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False
    saved_by_me: bool = False

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_followed_by_me: bool = False

    class Config:
        from_attributes = True


class UserWithPosts(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    followers_count: int = 0
    following_count: int = 0
    posts: List[PostResponse] = []
    is_followed_by_me: bool = False

    class Config:
        from_attributes = True