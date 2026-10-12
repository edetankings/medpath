"""
MedPath — Healthcare Navigation Platform
Python FastAPI Backend Service
Authenticated, Database-Backed (SQLite) Production API

Provides:
  - NIST-Compliant Authentication (Signup, Login, Token Sessions, Me, Logout)
  - Protected Patient Profile & Settings API (Demographics, Insurance, Emergency Contacts)
  - Protected Healthcare Passport API (Allergies, Medications, Conditions, Secure Document Storage)
  - Protected Appointments Management API (Booking, Cancellation, Status)
  - Protected Health Events Timeline API (Longitudinal Event Log)
  - Clinical AI Healthcare Navigator & Triage API (Urgency Evaluation & Guidance)
  - Audit Logging (HIPAA & Security Compliance)
"""

import os
import sys
import re
import time
import uuid
import datetime
from contextlib import closing
from urllib.parse import quote

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from typing import List, Optional, Literal, Dict, Any

from fastapi import (
    FastAPI,
    Query,
    HTTPException,
    status,
    Depends,
    Security,
    Request,
    UploadFile,
    File,
    Form,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

# Internal Modules (supporting both relative & direct execution)
try:
    from backend.database import init_db, get_db_connection
    from backend.auth import (
        hash_password,
        verify_password,
        create_session,
        delete_session,
        get_current_user,
        get_optional_current_user,
        security_bearer,
    )
    from backend.models import (
        SignupRequest,
        LoginRequest,
        UserProfileModel,
        AuthResponse,
        ProfileUpdateRequest,
        EmergencyContactModel,
        InsuranceModel,
        AllergyCreate,
        AllergyResponse,
        MedicationCreate,
        MedicationResponse,
        ConditionCreate,
        ConditionResponse,
        DocumentResponse,
        DocumentCategory,
        PassportSummaryResponse,
        AppointmentCreate,
        AppointmentResponse,
        TimelineEventResponse,
    )
    from backend import storage
    from backend.audit import log_audit_event, get_user_audit_trail
except ImportError:
    from database import init_db, get_db_connection
    from auth import (
        hash_password,
        verify_password,
        create_session,
        delete_session,
        get_current_user,
        get_optional_current_user,
        security_bearer,
    )
    from models import (
        SignupRequest,
        LoginRequest,
        UserProfileModel,
        AuthResponse,
        ProfileUpdateRequest,
        EmergencyContactModel,
        InsuranceModel,
        AllergyCreate,
        AllergyResponse,
        MedicationCreate,
        MedicationResponse,
        ConditionCreate,
        ConditionResponse,
        DocumentResponse,
        DocumentCategory,
        PassportSummaryResponse,
        AppointmentCreate,
        AppointmentResponse,
        TimelineEventResponse,
    )
    import storage
    from audit import log_audit_event, get_user_audit_trail


app = FastAPI(
    title="MedPath Healthcare API",
    description="Real Database-Backed Healthcare Navigation Platform Backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Web and Mobile (Capacitor)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initializes SQLite database tables on startup."""
    init_db()


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

def get_user_profile_helper(user_id: str) -> UserProfileModel:
    """Retrieves full profile model with emergency contact & insurance from DB."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.email, u.created_at,
               p.first_name, p.last_name, p.phone_number, p.date_of_birth,
               p.gender, p.country, p.profile_photo_url, p.blood_group, p.updated_at
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?;
    """, (user_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Emergency Contact
    cursor.execute("SELECT name, relationship, phone FROM emergency_contacts WHERE user_id = ?;", (user_id,))
    ec_row = cursor.fetchone()
    emergency_contact = EmergencyContactModel(
        name=ec_row["name"] if ec_row else "",
        relationship=ec_row["relationship"] if ec_row else "",
        phone=ec_row["phone"] if ec_row else "",
    ) if ec_row else None

    # Insurance
    cursor.execute("SELECT provider, policy_number, group_number, status FROM insurance_policies WHERE user_id = ?;", (user_id,))
    ins_row = cursor.fetchone()
    insurance = InsuranceModel(
        provider=ins_row["provider"] if ins_row else "",
        policyNumber=ins_row["policy_number"] if ins_row else "",
        groupNumber=ins_row["group_number"] if ins_row else "",
        status=ins_row["status"] if ins_row else "Active",
    ) if ins_row else None

    conn.close()

    return UserProfileModel(
        id=row["id"],
        email=row["email"],
        firstName=row["first_name"] or "",
        lastName=row["last_name"] or "",
        phoneNumber=row["phone_number"] or "",
        dateOfBirth=row["date_of_birth"] or "",
        gender=row["gender"] or "",
        country=row["country"] or "United States",
        profilePhoto=row["profile_photo_url"] or "",
        bloodGroup=row["blood_group"] or None,
        createdAt=row["created_at"],
        updatedAt=row["updated_at"] or row["created_at"],
        emergencyContact=emergency_contact,
        insurance=insurance,
    )


def add_timeline_event_helper(
    user_id: str,
    title: str,
    category: str,
    provider: str,
    date: str,
    summary: str,
    details: str = "",
    connection=None,
) -> str:
    """Inserts a verified clinical timeline event for an authenticated patient."""
    event_id = f"evt-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = connection if connection is not None else get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO timeline_events (id, user_id, title, category, provider, date, summary, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (event_id, user_id, title, category, provider, date, summary, details, now))
    if connection is None:
        conn.commit()
        conn.close()
    return event_id


# -----------------------------------------------------------------------------
# System & Health Endpoints
# -----------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "service": "MedPath Healthcare API",
        "status": "operational",
        "version": "2.0.0",
        "authenticated": True,
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "database": "sqlite_connected",
    }


# -----------------------------------------------------------------------------
# 1. Authentication Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, request: Request):
    """
    Registers a new patient account with NIST password hashing and creates an initial profile.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for existing email (case-insensitive)
    cursor.execute("SELECT id FROM users WHERE email = ? COLLATE NOCASE;", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user_id = f"usr-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pwd_hash = hash_password(req.password)

    # Insert user
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?);
    """, (user_id, req.email, pwd_hash, now, now))

    # Insert profile
    profile_id = f"prf-{uuid.uuid4().hex[:12]}"
    cursor.execute("""
        INSERT INTO profiles (
            id, user_id, first_name, last_name, email, phone_number,
            date_of_birth, gender, country, profile_photo_url, blood_group,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '', ?, ?, ?);
    """, (
        profile_id, user_id, req.firstName.strip(), req.lastName.strip(), req.email,
        req.phoneNumber or "", req.gender or "", req.country or "United States", req.bloodGroup, now, now,
    ))

    conn.commit()
    conn.close()

    # Create session token
    token = create_session(user_id)

    log_audit_event(
        action="SIGNUP",
        resource_type="AUTH",
        user_id=user_id,
        details=f"Patient registered: {req.email}",
        ip_address=request.client.host if request.client else "",
    )

    user_profile = get_user_profile_helper(user_id)
    return AuthResponse(token=token, user=user_profile)


@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request):
    """
    Authenticates a user with email and password, returning a secure session Bearer token.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ? COLLATE NOCASE;", (req.email,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = user_row["id"]
    token = create_session(user_id)

    log_audit_event(
        action="LOGIN",
        resource_type="AUTH",
        user_id=user_id,
        details="Successful login",
        ip_address=request.client.host if request.client else "",
    )

    user_profile = get_user_profile_helper(user_id)
    return AuthResponse(token=token, user=user_profile)


@app.get("/api/auth/me", response_model=UserProfileModel)
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile and account settings.
    Requires valid Bearer token.
    """
    return get_user_profile_helper(current_user["id"])


@app.post("/api/auth/logout")
def logout(
    current_user: dict = Depends(get_current_user),
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
):
    """
    Invalidates the active session token on logout.
    """
    if auth and auth.credentials:
        delete_session(auth.credentials)

    log_audit_event(
        action="LOGOUT",
        resource_type="AUTH",
        user_id=current_user["id"],
        details="Session terminated",
    )
    return {"status": "success", "message": "Successfully logged out."}


# -----------------------------------------------------------------------------
# 2. Patient Profile & Demographics
# -----------------------------------------------------------------------------

@app.get("/api/profile", response_model=UserProfileModel)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Retrieves full profile for the authenticated patient."""
    return get_user_profile_helper(current_user["id"])


@app.put("/api/profile", response_model=UserProfileModel)
def update_profile(
    update_req: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates the authenticated patient's demographics, emergency contact, or insurance.
    Strictly scoped to current_user['id'].
    """
    user_id = current_user["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Update basic profile fields
    if any([
        update_req.firstName is not None,
        update_req.lastName is not None,
        update_req.phoneNumber is not None,
        update_req.dateOfBirth is not None,
        update_req.gender is not None,
        update_req.country is not None,
        update_req.profilePhoto is not None,
        "bloodGroup" in update_req.model_fields_set,
    ]):
        cursor.execute("""
            UPDATE profiles
            SET first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                phone_number = COALESCE(?, phone_number),
                date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                country = COALESCE(?, country),
                profile_photo_url = COALESCE(?, profile_photo_url),
                blood_group = CASE WHEN ? THEN ? ELSE blood_group END,
                updated_at = ?
            WHERE user_id = ?;
        """, (
            update_req.firstName, update_req.lastName, update_req.phoneNumber,
            update_req.dateOfBirth, update_req.gender, update_req.country,
            update_req.profilePhoto, "bloodGroup" in update_req.model_fields_set, update_req.bloodGroup, now, user_id,
        ))

    # Update Emergency Contact
    if update_req.emergencyContact:
        ec = update_req.emergencyContact
        cursor.execute("SELECT id FROM emergency_contacts WHERE user_id = ?;", (user_id,))
        existing_ec = cursor.fetchone()
        if existing_ec:
            cursor.execute("""
                UPDATE emergency_contacts
                SET name = ?, relationship = ?, phone = ?, updated_at = ?
                WHERE user_id = ?;
            """, (ec.name, ec.relationship, ec.phone, now, user_id))
        else:
            ec_id = f"ec-{uuid.uuid4().hex[:12]}"
            cursor.execute("""
                INSERT INTO emergency_contacts (id, user_id, name, relationship, phone, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (ec_id, user_id, ec.name, ec.relationship, ec.phone, now, now))

    # Update Insurance Policy
    if update_req.insurance:
        ins = update_req.insurance
        cursor.execute("SELECT id FROM insurance_policies WHERE user_id = ?;", (user_id,))
        existing_ins = cursor.fetchone()
        if existing_ins:
            cursor.execute("""
                UPDATE insurance_policies
                SET provider = ?, policy_number = ?, group_number = ?, status = ?, updated_at = ?
                WHERE user_id = ?;
            """, (ins.provider, ins.policyNumber, ins.groupNumber, ins.status or "Active", now, user_id))
        else:
            ins_id = f"ins-{uuid.uuid4().hex[:12]}"
            cursor.execute("""
                INSERT INTO insurance_policies (id, user_id, provider, policy_number, group_number, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (ins_id, user_id, ins.provider, ins.policyNumber, ins.groupNumber, ins.status or "Active", now, now))

    conn.commit()
    conn.close()

    log_audit_event(
        action="UPDATE",
        resource_type="PROFILE",
        user_id=user_id,
        details="Patient profile updated",
    )

    return get_user_profile_helper(user_id)


# -----------------------------------------------------------------------------
# 3. Healthcare Passport (Records, Meds, Allergies, Documents)
# -----------------------------------------------------------------------------

@app.get("/api/passport", response_model=PassportSummaryResponse)
def get_passport(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the complete Healthcare Passport for the authenticated user only.
    """
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Allergies
    cursor.execute("""
        SELECT id, allergen, severity, reaction, diagnosed_date, notes, created_at, updated_at
        FROM allergies WHERE user_id = ? ORDER BY created_at DESC;
    """, (user_id,))
    allergies = [
        AllergyResponse(
            id=r["id"],
            allergen=r["allergen"],
            severity=r["severity"],
            reaction=r["reaction"],
            diagnosedDate=r["diagnosed_date"],
            notes=r["notes"] or "",
            createdAt=r["created_at"],
            updatedAt=r["updated_at"],
        )
        for r in cursor.fetchall()
    ]

    # 2. Medications
    cursor.execute("""
        SELECT id, name, dosage, frequency, prescribing_doctor, start_date, end_date, status, created_at, updated_at
        FROM medications WHERE user_id = ? ORDER BY created_at DESC;
    """, (user_id,))
    medications = [
        MedicationResponse(
            id=r["id"],
            name=r["name"],
            dosage=r["dosage"],
            frequency=r["frequency"],
            prescribingDoctor=r["prescribing_doctor"],
            startDate=r["start_date"],
            endDate=r["end_date"] or "",
            status=r["status"],
            createdAt=r["created_at"],
            updatedAt=r["updated_at"],
        )
        for r in cursor.fetchall()
    ]

    # 3. Health Conditions
    cursor.execute("""
        SELECT id, condition, diagnosed_date, status, notes, created_at, updated_at
        FROM health_conditions WHERE user_id = ? ORDER BY created_at DESC;
    """, (user_id,))
    conditions = [
        ConditionResponse(
            id=r["id"],
            condition=r["condition"],
            diagnosedDate=r["diagnosed_date"],
            status=r["status"],
            notes=r["notes"] or "",
            createdAt=r["created_at"],
            updatedAt=r["updated_at"],
        )
        for r in cursor.fetchall()
    ]

    # 4. Medical Documents
    cursor.execute("""
        SELECT id, title, category, issuing_doctor, document_date, file_name, file_size, mime_type, created_at
        FROM medical_documents WHERE user_id = ? ORDER BY created_at DESC;
    """, (user_id,))
    documents = [
        DocumentResponse(
            id=r["id"],
            title=r["title"],
            category=r["category"],
            issuingDoctor=r["issuing_doctor"],
            documentDate=r["document_date"],
            fileName=r["file_name"],
            fileSize=r["file_size"],
            mimeType=r["mime_type"],
            createdAt=r["created_at"],
            fileUrl=f"/api/passport/documents/{r['id']}/download",
        )
        for r in cursor.fetchall()
    ]

    conn.close()

    log_audit_event(
        action="VIEW",
        resource_type="PASSPORT",
        user_id=user_id,
        details="Full healthcare passport accessed",
    )

    profile = get_user_profile_helper(user_id)
    return PassportSummaryResponse(
        profile=profile,
        allergies=allergies,
        medications=medications,
        conditions=conditions,
        documents=documents,
    )


# --- Allergies CRUD ---

@app.post("/api/passport/allergies", response_model=AllergyResponse, status_code=status.HTTP_201_CREATED)
def add_allergy(req: AllergyCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    allergy_id = f"alg-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO allergies (id, user_id, allergen, severity, reaction, diagnosed_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (allergy_id, user_id, req.allergen.strip(), req.severity, req.reaction.strip(), req.diagnosedDate, req.notes or "", now, now))
    conn.commit()
    conn.close()

    log_audit_event("CREATE", "ALLERGY", user_id=user_id, resource_id=allergy_id, details=f"Added allergy: {req.allergen}")

    return AllergyResponse(
        id=allergy_id,
        allergen=req.allergen.strip(),
        severity=req.severity,
        reaction=req.reaction.strip(),
        diagnosedDate=req.diagnosedDate,
        notes=req.notes or "",
        createdAt=now,
        updatedAt=now,
    )


@app.delete("/api/passport/allergies/{allergy_id}")
def delete_allergy(allergy_id: str, current_user: dict = Depends(get_current_user)):
    """Verifies ownership before deleting allergy (IDOR protection)."""
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM allergies WHERE id = ? AND user_id = ?;", (allergy_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allergy record not found or unauthorized.")

    log_audit_event("DELETE", "ALLERGY", user_id=user_id, resource_id=allergy_id)
    return {"status": "success", "message": "Allergy record removed."}


# --- Medications CRUD ---

@app.post("/api/passport/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
def add_medication(req: MedicationCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    med_id = f"med-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO medications (id, user_id, name, dosage, frequency, prescribing_doctor, start_date, end_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (med_id, user_id, req.name.strip(), req.dosage.strip(), req.frequency.strip(), req.prescribingDoctor.strip(), req.startDate, req.endDate or "", req.status, now, now))
    conn.commit()
    conn.close()

    # Automatically log timeline event
    add_timeline_event_helper(
        user_id=user_id,
        title=f"Prescription Started: {req.name}",
        category="prescription",
        provider=req.prescribingDoctor,
        date=req.startDate,
        summary=f"Initiated {req.name} ({req.dosage}, {req.frequency}).",
    )

    log_audit_event("CREATE", "MEDICATION", user_id=user_id, resource_id=med_id, details=f"Logged medication: {req.name}")

    return MedicationResponse(
        id=med_id,
        name=req.name.strip(),
        dosage=req.dosage.strip(),
        frequency=req.frequency.strip(),
        prescribingDoctor=req.prescribingDoctor.strip(),
        startDate=req.startDate,
        endDate=req.endDate or "",
        status=req.status,
        createdAt=now,
        updatedAt=now,
    )


@app.delete("/api/passport/medications/{med_id}")
def delete_medication(med_id: str, current_user: dict = Depends(get_current_user)):
    """Verifies ownership before deleting medication (IDOR protection)."""
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medications WHERE id = ? AND user_id = ?;", (med_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found or unauthorized.")

    log_audit_event("DELETE", "MEDICATION", user_id=user_id, resource_id=med_id)
    return {"status": "success", "message": "Medication record removed."}


# --- Health Conditions CRUD ---

@app.post("/api/passport/conditions", response_model=ConditionResponse, status_code=status.HTTP_201_CREATED)
def add_condition(req: ConditionCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    cond_id = f"cnd-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO health_conditions (id, user_id, condition, diagnosed_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (cond_id, user_id, req.condition.strip(), req.diagnosedDate, req.status, req.notes or "", now, now))
    conn.commit()
    conn.close()

    # Automatically log timeline event
    add_timeline_event_helper(
        user_id=user_id,
        title=f"Condition Diagnosed: {req.condition}",
        category="consultation",
        provider="Patient / Clinical History",
        date=req.diagnosedDate,
        summary=f"Clinical history recorded for {req.condition} (Status: {req.status}).",
    )

    log_audit_event("CREATE", "CONDITION", user_id=user_id, resource_id=cond_id, details=f"Logged condition: {req.condition}")

    return ConditionResponse(
        id=cond_id,
        condition=req.condition.strip(),
        diagnosedDate=req.diagnosedDate,
        status=req.status,
        notes=req.notes or "",
        createdAt=now,
        updatedAt=now,
    )


@app.delete("/api/passport/conditions/{cond_id}")
def delete_condition(cond_id: str, current_user: dict = Depends(get_current_user)):
    """Verifies ownership before deleting condition (IDOR protection)."""
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM health_conditions WHERE id = ? AND user_id = ?;", (cond_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()

    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition record not found or unauthorized.")

    log_audit_event("DELETE", "CONDITION", user_id=user_id, resource_id=cond_id)
    return {"status": "success", "message": "Condition record removed."}


# --- Medical Documents Storage & Upload ---

@app.post("/api/passport/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=250),
    category: DocumentCategory = Form(...),
    issuing_doctor: Optional[str] = Form(None, max_length=250),
    doctor: Optional[str] = Form(None, max_length=250),
    document_date: Optional[datetime.date] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Validate metadata before writing an owner-scoped medical record (max 15MB).

    issuing_doctor is canonical; doctor remains a legacy input alias.
    Bytes are stored without application-level encryption.
    """
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Document title must not be blank.")
    if issuing_doctor is not None and doctor is not None and issuing_doctor.strip() != doctor.strip():
        raise HTTPException(status_code=422, detail="Conflicting issuing_doctor and doctor values.")
    clinician = (issuing_doctor if issuing_doctor is not None else doctor or "").strip()
    user_id = current_user["id"]
    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc_date = document_date.isoformat() if document_date else now.split("T")[0]
    original_name, storage_path, file_size_str, mime_type = await storage.save_uploaded_file(file)

    try:
        # Validate the response before committing; filesystem writes are compensated on failure.
        document = DocumentResponse(
            id=doc_id, title=title, category=category, issuingDoctor=clinician,
            documentDate=doc_date, fileName=original_name, fileSize=file_size_str,
            mimeType=mime_type, createdAt=now,
            fileUrl=f"/api/passport/documents/{doc_id}/download",
        )
        with closing(get_db_connection()) as conn, conn:
            conn.execute("""
                INSERT INTO medical_documents (id, user_id, title, category, issuing_doctor, document_date, file_name, file_path, file_size, mime_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (doc_id, user_id, title, category, clinician, doc_date, original_name, storage_path, file_size_str, mime_type, now))
            add_timeline_event_helper(
                user_id=user_id, title=f"Record Uploaded: {title}",
                category="lab" if category == "Lab Results" else "imaging" if category == "Imaging" else "consultation",
                provider=clinician, date=doc_date,
                summary=f"New clinical document '{title}' ({category}, {file_size_str}) added to Health Passport.",
                connection=conn,
            )
    except Exception:
        storage.delete_stored_file(storage_path)
        raise HTTPException(status_code=500, detail="Document could not be saved. Please try again.") from None

    log_audit_event("UPLOAD", "DOCUMENT", user_id=user_id, resource_id=doc_id, details=f"Uploaded: {title}")
    return document


@app.get("/api/passport/documents/{doc_id}/download")
def download_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Authenticate and check ownership before opening any document bytes."""
    user_id = current_user["id"]
    with closing(get_db_connection()) as conn:
        row = conn.execute(
            "SELECT file_path, file_name, mime_type FROM medical_documents WHERE id = ? AND user_id = ?;",
            (doc_id, user_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    # Open before producing the response so missing/unreadable files return a clear error.
    file_handle = storage.open_stored_file(row["file_path"])
    def chunks():
        with file_handle:
            while chunk := file_handle.read(64 * 1024):
                yield chunk
    log_audit_event("DOWNLOAD", "DOCUMENT", user_id=user_id, resource_id=doc_id)
    filename = storage.sanitize_filename(row["file_name"])
    return StreamingResponse(chunks(), media_type=row["mime_type"], background=BackgroundTask(file_handle.close), headers={
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


@app.delete("/api/passport/documents/{doc_id}")
def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Owner-only deletion. Missing bytes may be removed from the patient's index."""
    user_id = current_user["id"]
    with closing(get_db_connection()) as conn, conn:
        row = conn.execute(
            "SELECT file_path FROM medical_documents WHERE id = ? AND user_id = ?;", (doc_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found or access denied.")
        storage.delete_stored_file(row["file_path"])
        conn.execute("DELETE FROM medical_documents WHERE id = ? AND user_id = ?;", (doc_id, user_id))
    log_audit_event("DELETE", "DOCUMENT", user_id=user_id, resource_id=doc_id)
    return {"status": "success", "message": "Document removed permanently."}


# -----------------------------------------------------------------------------
# 4. Appointments Management
# -----------------------------------------------------------------------------

@app.get("/api/appointments", response_model=List[AppointmentResponse])
def get_appointments(current_user: dict = Depends(get_current_user)):
    """
    Retrieves only the authenticated patient's actual scheduled consultations.
    """
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, provider_name, specialty, clinic, address, date, time, type, status, notes, created_at, updated_at
        FROM appointments
        WHERE user_id = ?
        ORDER BY date DESC, time ASC;
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    return [
        AppointmentResponse(
            id=r["id"],
            providerName=r["provider_name"],
            specialty=r["specialty"],
            clinic=r["clinic"],
            address=r["address"] or "",
            date=r["date"],
            time=r["time"],
            type=r["type"],
            status=r["status"],
            notes=r["notes"] or "",
            createdAt=r["created_at"],
            updatedAt=r["updated_at"],
        )
        for r in rows
    ]


@app.post("/api/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(apt: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    """
    Books an appointment for the authenticated patient and logs a timeline milestone.
    """
    user_id = current_user["id"]
    apt_id = f"apt-{uuid.uuid4().hex[:12]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (
            id, user_id, provider_name, specialty, clinic, address,
            date, time, type, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?);
    """, (
        apt_id, user_id, apt.providerName.strip(), apt.specialty.strip(),
        apt.clinic.strip(), apt.address.strip(), apt.date, apt.time,
        apt.type, apt.notes or "", now, now,
    ))
    conn.commit()
    conn.close()

    # Automatically record timeline milestone
    add_timeline_event_helper(
        user_id=user_id,
        title=f"Scheduled: {apt.specialty} Consultation",
        category="consultation",
        provider=apt.providerName.strip(),
        date=apt.date,
        summary=f"Upcoming {apt.type} consultation at {apt.clinic.strip()} ({apt.time}).",
        details=apt.notes or "",
    )

    log_audit_event("CREATE", "APPOINTMENT", user_id=user_id, resource_id=apt_id, details=f"Booked with {apt.providerName}")

    return AppointmentResponse(
        id=apt_id,
        providerName=apt.providerName.strip(),
        specialty=apt.specialty.strip(),
        clinic=apt.clinic.strip(),
        address=apt.address.strip(),
        date=apt.date,
        time=apt.time,
        type=apt.type,
        status="upcoming",
        notes=apt.notes or "",
        createdAt=now,
        updatedAt=now,
    )


@app.put("/api/appointments/{apt_id}/cancel")
def cancel_appointment(apt_id: str, current_user: dict = Depends(get_current_user)):
    """
    Cancels an appointment. Verifies user ownership (IDOR protection).
    """
    user_id = current_user["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE appointments
        SET status = 'cancelled', updated_at = ?
        WHERE id = ? AND user_id = ?;
    """, (now, apt_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()

    if affected == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found or unauthorized.",
        )

    log_audit_event("CANCEL", "APPOINTMENT", user_id=user_id, resource_id=apt_id)
    return {"status": "success", "message": "Appointment marked as cancelled."}


# -----------------------------------------------------------------------------
# 5. Health Timeline (Chronological Patient Milestones)
# -----------------------------------------------------------------------------

@app.get("/api/timeline", response_model=List[TimelineEventResponse])
def get_timeline(current_user: dict = Depends(get_current_user)):
    """
    Returns actual chronological health milestones for the authenticated patient.
    """
    user_id = current_user["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, category, provider, date, summary, details, created_at
        FROM timeline_events
        WHERE user_id = ?
        ORDER BY date DESC, created_at DESC;
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    return [
        TimelineEventResponse(
            id=r["id"],
            title=r["title"],
            category=r["category"],
            provider=r["provider"],
            date=r["date"],
            summary=r["summary"],
            details=r["details"] or "",
            createdAt=r["created_at"],
        )
        for r in rows
    ]


# -----------------------------------------------------------------------------
# 6. Provider Directory (Honest State: Integration in Progress)
# -----------------------------------------------------------------------------

@app.get("/api/providers")
def get_providers():
    """
    Honest endpoint: Live provider discovery network integration is currently
    under development. Returns empty list with metadata to prevent fabricating
    fictional clinics or physicians.
    """
    return []


# -----------------------------------------------------------------------------
# 7. Care Team Messaging (Honest State)
# -----------------------------------------------------------------------------

@app.get("/api/messages")
def get_messages(current_user: dict = Depends(get_current_user)):
    """
    Honest endpoint: Asynchronous care team communication channel will activate
    once linked with healthcare provider clinical EHR portals.
    """
    return []


# -----------------------------------------------------------------------------
# 8. Clinical AI Healthcare Navigator & Triage
# -----------------------------------------------------------------------------

TriageLevel = Literal["emergency", "urgent", "routine", "self-care"]

class ChatHistoryItem(BaseModel):
    sender: Literal["user", "navigator"]
    text: str

class NavigatorChatRequest(BaseModel):
    message: str = Field(..., description="User query or symptom description")
    history: Optional[List[ChatHistoryItem]] = Field(default=[], description="Recent conversation turns")

class NavigatorChatResponse(BaseModel):
    reply: str
    triageLevel: TriageLevel
    suggestedSpecialty: Optional[str] = None
    suggestedActions: List[str] = []
    isEmergency: bool = False

@app.post("/api/navigator/chat", response_model=NavigatorChatResponse)
def navigator_triage(request: NavigatorChatRequest):
    """
    Evaluates clinical urgency and provides specialty routing assistance.
    Explicitly communicates navigation guidance without making autonomous diagnoses.
    """
    q = request.message.lower()

    # Red-flag emergency detection
    emergency_keywords = [
        "chest pain", "heart attack", "shortness of breath", "difficulty breathing",
        "cannot breathe", "stroke", "loss of consciousness", "coughing blood",
        "severe allergic reaction", "anaphylaxis",
    ]
    if any(k in q for k in emergency_keywords):
        return NavigatorChatResponse(
            reply="CRITICAL SAFETY NOTICE: Your described symptoms match red-flag signs of a potential life-threatening emergency. Please stop using this portal and immediately dial 911 or proceed to the closest Emergency Department.",
            triageLevel="emergency",
            suggestedSpecialty="Emergency Department",
            suggestedActions=["Dial 911 Emergency", "Locate Closest Emergency Room", "Notify Emergency Contact"],
            isEmergency=True,
        )

    # Urgent care indicators
    urgent_keywords = ["sprain", "twisted ankle", "fever", "fracture", "deep cut", "burn", "stitches", "ear pain", "infection"]
    if any(k in q for k in urgent_keywords):
        return NavigatorChatResponse(
            reply="Based on the symptoms described, same-day clinical assessment at an Urgent Care center or walk-in clinic is recommended within 12 to 24 hours.",
            triageLevel="urgent",
            suggestedSpecialty="Urgent Care / Walk-in Clinic",
            suggestedActions=["Locate Urgent Care Center", "Rest, Ice, Compression, Elevation", "Monitor Temperature"],
            isEmergency=False,
        )

    # Cardiology
    if any(k in q for k in ["blood pressure", "palpitation", "cholesterol", "heart rate", "hypertension"]):
        return NavigatorChatResponse(
            reply="For cardiovascular symptoms, lipid panels, and blood pressure regulation, a consultation with a board-certified Cardiologist or your Primary Care Physician is recommended.",
            triageLevel="routine",
            suggestedSpecialty="Cardiology",
            suggestedActions=["Log home blood pressure readings", "Schedule clinical consultation", "Review lipid panels in Passport"],
            isEmergency=False,
        )

    # Dermatology
    if any(k in q for k in ["rash", "skin", "mole", "acne", "eczema", "dermatitis"]):
        return NavigatorChatResponse(
            reply="Dermatological concerns such as new skin lesions, persistent rashes, or unusual mole changes are best evaluated through a specialized dermoscopic examination by a Dermatologist.",
            triageLevel="routine",
            suggestedSpecialty="Dermatology",
            suggestedActions=["Take a clear photo for your records", "Schedule Dermatology consultation"],
            isEmergency=False,
        )

    # General Primary Care fallback
    return NavigatorChatResponse(
        reply=f"Thank you for sharing your symptoms regarding '{request.message}'. For an accurate diagnosis and treatment plan, we recommend scheduling an appointment with an Internist or Primary Care Doctor who can coordinate diagnostic lab work.",
        triageLevel="routine",
        suggestedSpecialty="Primary Care / Internal Medicine",
        suggestedActions=[
            "Find in-network Primary Care doctors",
            "Prepare your medical history in Healthcare Passport",
            "Schedule a consultation",
        ],
        isEmergency=False,
    )
