"""
MedPath — Healthcare Navigation Platform
Database Foundation & Persistence Layer
Provides SQLite database initialization, schema migration, connection management,
and application database access.
"""

import os
import sqlite3

# Base directory for the backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "medpath.db")

def get_db_connection():
    """
    Creates and returns a SQLite connection configured with:
    - Row factory for dict-like access
    - Foreign keys enabled
    - Timeout for concurrent operations
    """
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    """
    Initializes all database tables with proper indexing and constraints.
    Idempotent and safe to run on every application startup.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")

    # 2. Sessions Table (Auth Bearer Tokens)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")

    # 3. User Profiles Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone_number TEXT DEFAULT '',
            date_of_birth TEXT DEFAULT '',
            gender TEXT DEFAULT '',
            country TEXT DEFAULT '',
            profile_photo_url TEXT DEFAULT '',
            blood_group TEXT DEFAULT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);")

    # 4. Emergency Contacts Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT NOT NULL,
            phone TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);")

    # 5. Insurance Policies Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS insurance_policies (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            policy_number TEXT NOT NULL,
            group_number TEXT NOT NULL,
            status TEXT DEFAULT 'Active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON insurance_policies(user_id);")

    # 6. Allergies Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS allergies (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            allergen TEXT NOT NULL,
            severity TEXT NOT NULL,
            reaction TEXT NOT NULL,
            diagnosed_date TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_allergies_user_id ON allergies(user_id);")

    # 7. Medications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            frequency TEXT NOT NULL,
            prescribing_doctor TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);")

    # 8. Health Conditions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_conditions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            condition TEXT NOT NULL,
            diagnosed_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_conditions_user_id ON health_conditions(user_id);")

    # 9. Medical Documents Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medical_documents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            issuing_doctor TEXT NOT NULL,
            document_date TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_user_id ON medical_documents(user_id);")

    # 10. Appointments Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            provider_name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            clinic TEXT NOT NULL,
            address TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'in-person',
            status TEXT NOT NULL DEFAULT 'upcoming',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);")

    # 11. Timeline Events Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timeline_events (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            provider TEXT NOT NULL,
            date TEXT NOT NULL,
            summary TEXT NOT NULL,
            details TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);")

    # 12. Audit Logs Table (HIPAA & Security Compliance)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT DEFAULT '',
            ip_address TEXT DEFAULT '',
            user_agent TEXT DEFAULT '',
            details TEXT DEFAULT '',
            timestamp TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);")

    conn.commit()
    conn.close()
