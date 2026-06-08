from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app import models
import os
from app.database import engine, get_db
from app.routes import register, login, posts, upload, follow, logout, like, users, save, ai_studio, enhance
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.utils.limiter import limiter
import app.schemas
from app import oauth2

app = FastAPI(
    title='Social media for artists',
    description="Backend for Procreate-like social platform",
    version="1.0.0"
)

# CORS middleware MUST be added before any other middleware or routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers (Keep these but after CORS)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

models.Base.metadata.create_all(bind=engine)

app.include_router(register.router)
app.include_router(login.router)
app.include_router(posts.router)
app.include_router(upload.router)
app.include_router(follow.router)
app.include_router(logout.router)
app.include_router(like.router)
app.include_router(users.router)
app.include_router(save.router)
app.include_router(ai_studio.router)
app.include_router(enhance.router)

# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"status": "online", "message": "Welcome to the Artist Social API"}
