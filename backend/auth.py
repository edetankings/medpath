"""
MedPath — Healthcare Navigation Platform
Authentication & Security Foundation
Provides NIST-compliant password hashing, token generation, session lifecycle,
and FastAPI dependency injection for protected routes.
"""

import os
import hashlib
import hmac
import secrets
import datetime
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
try:
    from backend.database import get_db_connection
except ImportError:
    from database import get_db_connection

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a unique 16-byte random salt
    and 100,000 iterations (NIST standard).
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"pbkdf2_sha256$100000${salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a plain password against the stored PBKDF2 hash using constant-time comparison.
    """
    try:
        parts = hashed.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hash = parts[3]
        computed_key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return hmac.compare_digest(computed_key.hex(), expected_hash)
    except Exception:
        return False

def create_session(user_id: str, days_valid: int = 30) -> str:
    """
    Generates a cryptographically strong session token and persists it with an expiry timestamp.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = (now + datetime.timedelta(days=days_valid)).isoformat()
    now_str = now.isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?);
    """, (token, user_id, now_str, expires_at))
    conn.commit()
    conn.close()
    return token

def delete_session(token: str) -> None:
    """
    Invalidates an active session token.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?;", (token,))
    conn.commit()
    conn.close()

def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates a session token, checks expiry, and returns the associated user and profile.
    """
    if not token:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
        SELECT s.user_id, s.expires_at, u.email, u.created_at as user_created_at,
               p.id as profile_id, p.first_name, p.last_name, p.phone_number,
               p.date_of_birth, p.gender, p.country, p.profile_photo_url, p.blood_group,
               p.updated_at as profile_updated_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE s.token = ? AND s.expires_at > ?;
    """, (token, now_str))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row["user_id"],
        "email": row["email"],
        "firstName": row["first_name"] or "",
        "lastName": row["last_name"] or "",
        "phoneNumber": row["phone_number"] or "",
        "dateOfBirth": row["date_of_birth"] or "",
        "gender": row["gender"] or "",
        "country": row["country"] or "",
        "profilePhoto": row["profile_photo_url"] or "",
        "bloodGroup": row["blood_group"] or None,
        "createdAt": row["user_created_at"],
        "updatedAt": row["profile_updated_at"] or row["user_created_at"],
    }

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Dict[str, Any]:
    """
    FastAPI dependency for protected routes.
    Rejects unauthenticated requests with HTTP 401.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_from_token(auth.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency for optional auth (e.g. public endpoints with user context).
    """
    if not auth or not auth.credentials:
        return None
    return get_user_from_token(auth.credentials)
