import os
import socket
from urllib.parse import urlparse
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


def _redis_reachable(url: str, timeout: float = 1.0) -> bool:
    """Return True if a TCP connection to the Redis URL succeeds."""
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _build_limiter() -> Limiter:
    if _redis_reachable(REDIS_URL):
        print(f"[limiter] Connected to Redis at {REDIS_URL}")
        return Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)
    print("[limiter] Redis unavailable. Falling back to in-memory storage.")
    return Limiter(key_func=get_remote_address)  # memory backend


limiter = _build_limiter()

