"""
Shared Redis client for the application.
"""

import os
import logging
from dotenv import load_dotenv
import redis.asyncio as aioredis

load_dotenv()

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

logger = logging.getLogger(__name__)

# Module-level async client
redis_client: aioredis.Redis = aioredis.from_url(
    REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)

async def check_redis():
    """Check if Redis is reachable."""
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
        return False

async def get_redis() -> aioredis.Redis:
    """FastAPI dependency."""
    return redis_client
