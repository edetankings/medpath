"""
MedPath — Healthcare Navigation Platform
Pydantic Data Models & Request/Response Schemas
Strictly typed validation for Auth, Profiles, Healthcare Passport, Documents, and Audit Logs.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

# -----------------------------------------------------------------------------
# Auth Models
# -----------------------------------------------------------------------------

BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

class BloodGroupInput(BaseModel):
    bloodGroup: Optional[BloodGroup] = None

    @field_validator("bloodGroup", mode="before")
    @classmethod
    def empty_blood_group(cls, value):
        return None if isinstance(value, str) and not value.strip() else value

class SignupRequest(BloodGroupInput):
    email: str = Field(..., pattern=EMAIL_PATTERN, description="Valid patient email address")
    password: str = Field(..., min_length=6, description="Password (at least 6 chars)")
    firstName: str = Field(..., min_length=1, description="Patient's legal first name")
    lastName: str = Field(..., min_length=1, description="Patient's legal last name")
    country: Optional[str] = Field(default="United States", description="Country of residence")
    gender: Optional[str] = Field(default="", description="Gender identity")
    phoneNumber: Optional[str] = Field(default="", description="Contact phone number")

class LoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_PATTERN)
    password: str

class PasswordResetRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_PATTERN)

class PasswordResetResponse(BaseModel):
    status: str
    message: str

# -----------------------------------------------------------------------------
# Profile & Demographics Models
# -----------------------------------------------------------------------------

class EmergencyContactModel(BaseModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""

class InsuranceModel(BaseModel):
    provider: str = ""
    policyNumber: str = ""
    groupNumber: str = ""
    status: str = "Active"

class UserProfileModel(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    phoneNumber: str = ""
    dateOfBirth: str = ""
    gender: str = ""
    country: str = ""
    profilePhoto: str = ""
    bloodGroup: Optional[str] = None
    createdAt: str
    updatedAt: str
    emergencyContact: Optional[EmergencyContactModel] = None
    insurance: Optional[InsuranceModel] = None

class ProfileUpdateRequest(BloodGroupInput):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phoneNumber: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    profilePhoto: Optional[str] = None
    emergencyContact: Optional[EmergencyContactModel] = None
    insurance: Optional[InsuranceModel] = None

class AuthResponse(BaseModel):
    token: str
    user: UserProfileModel

# -----------------------------------------------------------------------------
# Healthcare Passport Models
# -----------------------------------------------------------------------------

AllergySeverity = Literal["Mild", "Moderate", "Severe"]

class AllergyCreate(BaseModel):
    allergen: str = Field(..., min_length=1)
    severity: AllergySeverity = "Mild"
    reaction: str = Field(..., min_length=1)
    diagnosedDate: str = Field(..., description="YYYY-MM-DD format")
    notes: Optional[str] = ""

class AllergyUpdate(BaseModel):
    allergen: Optional[str] = None
    severity: Optional[AllergySeverity] = None
    reaction: Optional[str] = None
    diagnosedDate: Optional[str] = None
    notes: Optional[str] = None

class AllergyResponse(BaseModel):
    id: str
    allergen: str
    severity: AllergySeverity
    reaction: str
    diagnosedDate: str
    notes: str = ""
    createdAt: str
    updatedAt: str

MedicationStatus = Literal["Active", "Discontinued"]

class MedicationCreate(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = Field(..., min_length=1)
    frequency: str = Field(..., min_length=1)
    prescribingDoctor: str = Field(..., min_length=1)
    startDate: str = Field(..., description="YYYY-MM-DD format")
    endDate: Optional[str] = ""
    status: MedicationStatus = "Active"

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    prescribingDoctor: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[MedicationStatus] = None

class MedicationResponse(BaseModel):
    id: str
    name: str
    dosage: str
    frequency: str
    prescribingDoctor: str
    startDate: str
    endDate: str = ""
    status: MedicationStatus
    createdAt: str
    updatedAt: str

ConditionStatus = Literal["Active", "Resolved", "Managed"]

class ConditionCreate(BaseModel):
    condition: str = Field(..., min_length=1)
    diagnosedDate: str = Field(..., description="YYYY-MM-DD format")
    status: ConditionStatus = "Active"
    notes: Optional[str] = ""

class ConditionUpdate(BaseModel):
    condition: Optional[str] = None
    diagnosedDate: Optional[str] = None
    status: Optional[ConditionStatus] = None
    notes: Optional[str] = None

class ConditionResponse(BaseModel):
    id: str
    condition: str
    diagnosedDate: str
    status: ConditionStatus
    notes: str = ""
    createdAt: str
    updatedAt: str

DocumentCategory = Literal["Lab Results", "Imaging", "Prescription", "Clinical Notes", "Insurance"]

class DocumentResponse(BaseModel):
    id: str
    title: str
    category: DocumentCategory
    issuingDoctor: str
    documentDate: str
    fileName: str
    fileSize: str
    mimeType: str
    createdAt: str
    fileUrl: str

class PassportSummaryResponse(BaseModel):
    profile: UserProfileModel
    allergies: List[AllergyResponse]
    medications: List[MedicationResponse]
    conditions: List[ConditionResponse]
    documents: List[DocumentResponse]

# -----------------------------------------------------------------------------
# Audit Log Models
# -----------------------------------------------------------------------------

class AuditLogResponse(BaseModel):
    id: str
    action: str
    resourceType: str
    resourceId: str
    details: str
    timestamp: str

# -----------------------------------------------------------------------------
# Appointment Models
# -----------------------------------------------------------------------------

AppointmentType = Literal["in-person", "telehealth"]
AppointmentStatus = Literal["upcoming", "completed", "cancelled"]

class AppointmentCreate(BaseModel):
    providerName: str = Field(..., min_length=1)
    specialty: str = Field(..., min_length=1)
    clinic: str = Field(..., min_length=1)
    address: str = Field(default="")
    date: str = Field(..., description="YYYY-MM-DD format")
    time: str = Field(..., description="e.g. 10:00 AM")
    type: AppointmentType = "in-person"
    notes: Optional[str] = ""

class AppointmentResponse(BaseModel):
    id: str
    providerName: str
    specialty: str
    clinic: str
    address: str
    date: str
    time: str
    type: AppointmentType
    status: AppointmentStatus
    notes: str = ""
    createdAt: str
    updatedAt: str

# -----------------------------------------------------------------------------
# Timeline Models
# -----------------------------------------------------------------------------

TimelineCategory = Literal["consultation", "lab", "prescription", "imaging", "immunization"]

class TimelineEventResponse(BaseModel):
    id: str
    title: str
    category: TimelineCategory
    provider: str
    date: str
    summary: str
    details: str = ""
    createdAt: str

