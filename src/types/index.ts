/* ==========================================================================
   MEDPATH DATA TYPES & CONTRACTS
   ========================================================================== */

export type RoutePath =
  | 'home'
  | 'signin'
  | 'signup'
  | 'forgot'
  | 'dashboard'
  | 'ai-navigator'
  | 'passport'
  | 'documents'
  | 'find-care'
  | 'appointments'
  | 'timeline'
  | 'messages'
  | 'profile';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  avatar?: string;
  bloodGroup: string | null;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
}

export type CareType = 'All' | 'Primary Care' | 'Specialist' | 'Urgent Care' | 'Telehealth' | 'Mental Health';

export interface HealthcareProvider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  clinic: string;
  address: string;
  distance: string;
  rating: number;
  reviewsCount: number;
  bio: string;
  nextAvailable: string;
  acceptsInsurance: boolean;
  telehealth: boolean;
  consultationFee: number;
  languages: string[];
}

export interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  specialty: string;
  clinic: string;
  address: string;
  date: string;
  time: string;
  type: 'in-person' | 'telehealth';
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  reaction: string;
  diagnosedDate: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string;
  startDate: string;
  status: 'Active' | 'Discontinued';
}

export interface HealthCondition {
  id: string;
  condition: string;
  diagnosedDate: string;
  status: 'Active' | 'Resolved' | 'Managed';
  notes: string;
}

export const DOCUMENT_CATEGORIES = [
  "Lab Results", "Imaging", "Prescription", "Clinical Notes", "Insurance"
] as const;
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export interface HealthDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  date: string;
  fileSize: string;
  doctor: string;
  fileName?: string;
  mimeType?: string;
  createdAt?: string;
}

export interface PassportData {
  allergies: Allergy[];
  medications: Medication[];
  conditions: HealthCondition[];
  documents: HealthDocument[];
}

export type TimelineCategory = 'consultation' | 'lab' | 'prescription' | 'imaging' | 'immunization';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: TimelineCategory;
  provider: string;
  summary: string;
  details?: string;
}

export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'self-care';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'navigator';
  text: string;
  timestamp: string;
  triageLevel?: TriageLevel;
  suggestedActions?: string[];
}

export interface ClinicalMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isUser: boolean;
}

export interface MessageThread {
  id: string;
  providerId: string;
  providerName: string;
  providerTitle: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messages: ClinicalMessage[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}
