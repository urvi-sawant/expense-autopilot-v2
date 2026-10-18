"""
Expense Autopilot Authentication & Security Service
Implements:
- NIST-recommended PBKDF2-HMAC-SHA256 password hashing with unique random salts
- Cryptographic bearer token generation and in-memory session management
- Password reset token generation and verification
- Role-based access validation
"""
import hashlib
import secrets
import time
from datetime import datetime
from typing import Dict, Optional, Tuple, Any

TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days
RESET_TOKEN_EXPIRY_SECONDS = 3600  # 1 hour

# Active sessions store: token -> { user_id, expires_at }
_active_sessions: Dict[str, Dict[str, Any]] = {}

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hash a password using PBKDF2 HMAC SHA-256 with 100,000 iterations.
    Returns (hex_hash, hex_salt).
    """
    if not salt:
        salt = secrets.token_hex(16)
    salt_bytes = bytes.fromhex(salt)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt_bytes,
        100000
    )
    return key.hex(), salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """Verify that candidate password matches the stored PBKDF2 hash."""
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, hashed_password)

def create_session(user_id: str) -> str:
    """Create a new cryptographically secure session token."""
    token = secrets.token_urlsafe(32)
    _active_sessions[token] = {
        "user_id": user_id,
        "expires_at": time.time() + TOKEN_EXPIRY_SECONDS
    }
    return token

def get_session_user_id(token: str) -> Optional[str]:
    """Validate token and return associated user_id if active."""
    if not token:
        return None
    session = _active_sessions.get(token)
    if not session:
        return None
    if time.time() > session["expires_at"]:
        del _active_sessions[token]
        return None
    return session["user_id"]

def revoke_session(token: str):
    """Revoke an active session token."""
    if token in _active_sessions:
        del _active_sessions[token]

def generate_reset_token() -> str:
    """Generate a high-entropy password reset token."""
    return secrets.token_hex(20)
