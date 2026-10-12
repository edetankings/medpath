"""
MedPath — Healthcare Navigation Platform
Audit Trail & Compliance Engine
Provides immutable audit logging for HIPAA, GDPR, and security accountability.
Tracks all access, modifications, exports, and document views of Protected Health Information (PHI).
"""

import uuid
import datetime
from typing import Optional, List, Dict, Any
try:
    from backend.database import get_db_connection
except ImportError:
    from database import get_db_connection

def log_audit_event(
    action: str,
    resource_type: str,
    user_id: Optional[str] = None,
    resource_id: str = "",
    details: str = "",
    ip_address: str = "",
    user_agent: str = "",
) -> str:
    """
    Inserts an immutable audit event entry into the database.
    """
    log_id = f"aud-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (
                id, user_id, action, resource_type, resource_id,
                ip_address, user_agent, details, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            log_id, user_id, action.upper(), resource_type.upper(),
            resource_id, ip_address, user_agent, details, now
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        # Non-blocking: audit failure must not crash critical patient path, but should be logged to stderr
        print(f"[AUDIT LOG WARNING] Failed to record audit event: {e}")

    return log_id

def get_user_audit_trail(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieves the chronological audit trail for a specific patient.
    Allows patients to inspect who/when their records were accessed or changed.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, action, resource_type, resource_id, details, timestamp
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?;
    """, (user_id, limit))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "action": r["action"],
            "resourceType": r["resource_type"],
            "resourceId": r["resource_id"],
            "details": r["details"],
            "timestamp": r["timestamp"],
        }
        for r in rows
    ]
