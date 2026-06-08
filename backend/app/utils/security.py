import hashlib
import base64
import bcrypt

def _prehash_password(password: str) -> bytes:
    """Pre-hash password with SHA-256 to fit within bcrypt's 72-byte limit."""
    return base64.b64encode(hashlib.sha256(password.encode('utf-8')).digest())

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt and SHA-256 pre-hashing."""
    prehashed = _prehash_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(prehashed, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hashed version."""
    prehashed = _prehash_password(plain_password)
    try:
        return bcrypt.checkpw(prehashed, hashed_password.encode('utf-8'))
    except Exception:
        return False
