/* ==========================================================================
   MEDPATH REAL API CLIENT SERVICE
   Zero mock data. Strict Bearer token authentication against FastAPI + SQLite.
   ========================================================================== */

import {
  User,
  HealthcareProvider,
  Appointment,
  PassportData,
  TimelineEvent,
  MessageThread,
  ChatMessage,
  TriageLevel,
  Allergy,
  Medication,
  HealthCondition,
  HealthDocument,
} from '../types';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'medpath_auth_token';

export interface TriageResponse {
  reply: string;
  triageLevel: TriageLevel;
  suggestedSpecialty?: string;
  suggestedActions?: string[];
  isEmergency?: boolean;
}

export interface AuthResponseData {
  token: string;
  user: User;
}

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country?: string;
  gender?: string;
  phoneNumber?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  bloodGroup?: string | null;
  profilePhoto?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
}

export function formatUserProfile(raw: any): User {
  const firstName = raw.firstName || '';
  const lastName = raw.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || raw.email || 'Patient';

  return {
    id: raw.id,
    name: fullName,
    email: raw.email,
    phone: raw.phoneNumber || '',
    dob: raw.dateOfBirth || '',
    avatar: raw.profilePhoto || '',
    bloodGroup: raw.bloodGroup || null,
    emergencyContact: {
      name: raw.emergencyContact?.name || '',
      relationship: raw.emergencyContact?.relationship || '',
      phone: raw.emergencyContact?.phone || '',
    },
    insurance: {
      provider: raw.insurance?.provider || '',
      policyNumber: raw.insurance?.policyNumber || '',
      groupNumber: raw.insurance?.groupNumber || '',
    },
  };
}

class ApiService {
  private onUnauthorizedCallback: (() => void) | null = null;

  public setUnauthorizedHandler(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  public clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  public hasToken(): boolean {
    return !!this.getToken();
  }

  private getAuthHeaders(includeContentType: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.clearToken();
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Session expired or unauthenticated. Please sign in.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail || `Request failed with status ${response.status}`;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    // Check for empty body / 204
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  // ==========================================
  // 1. Authentication
  // ==========================================

  async signup(payload: SignupPayload): Promise<AuthResponseData> {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await this.handleResponse<{ token: string; user: any }>(res);
    this.setToken(data.token);
    return {
      token: data.token,
      user: formatUserProfile(data.user),
    };
  }

  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await this.handleResponse<{ token: string; user: any }>(res);
    this.setToken(data.token);
    return {
      token: data.token,
      user: formatUserProfile(data.user),
    };
  }

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const rawUser = await this.handleResponse<any>(res);
    return formatUserProfile(rawUser);
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {
      // Ignore network failure on logout
    } finally {
      this.clearToken();
    }
  }

  // ==========================================
  // 2. Profile Management
  // ==========================================

  async getProfile(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const raw = await this.handleResponse<any>(res);
    return formatUserProfile(raw);
  }

  async updateProfile(payload: ProfileUpdatePayload): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const raw = await this.handleResponse<any>(res);
    return formatUserProfile(raw);
  }

  // ==========================================
  // 3. Healthcare Passport
  // ==========================================

  async getPassport(): Promise<PassportData> {
    const res = await fetch(`${API_BASE_URL}/api/passport`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<any>(res);

    // Map backend passport response into frontend types
    return {
      allergies: (data.allergies || []).map((a: any): Allergy => ({
        id: a.id,
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction,
        diagnosedDate: a.diagnosedDate,
      })),
      medications: (data.medications || []).map((m: any): Medication => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        prescribingDoctor: m.prescribingDoctor,
        startDate: m.startDate,
        status: m.status,
      })),
      conditions: (data.conditions || []).map((c: any): HealthCondition => ({
        id: c.id,
        condition: c.condition,
        diagnosedDate: c.diagnosedDate,
        status: c.status,
        notes: c.notes || '',
      })),
      documents: (data.documents || []).map((d: any): HealthDocument => ({
        id: d.id,
        title: d.title,
        category: d.category,
        date: d.documentDate,
        fileSize: d.fileSize,
        doctor: d.issuingDoctor,
        fileName: d.fileName,
        mimeType: d.mimeType,
        createdAt: d.createdAt,
      })),
    };
  }

  async addAllergy(payload: {
    allergen: string;
    severity: 'Mild' | 'Moderate' | 'Severe';
    reaction: string;
    diagnosedDate?: string;
    notes?: string;
  }): Promise<Allergy> {
    const res = await fetch(`${API_BASE_URL}/api/passport/allergies`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const a = await this.handleResponse<any>(res);
    return {
      id: a.id,
      allergen: a.allergen,
      severity: a.severity,
      reaction: a.reaction,
      diagnosedDate: a.diagnosedDate,
    };
  }

  async deleteAllergy(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/passport/allergies/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<any>(res);
  }

  async addMedication(payload: {
    name: string;
    dosage: string;
    frequency: string;
    prescribingDoctor?: string;
    startDate?: string;
    endDate?: string;
    status?: 'Active' | 'Discontinued';
  }): Promise<Medication> {
    const res = await fetch(`${API_BASE_URL}/api/passport/medications`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const m = await this.handleResponse<any>(res);
    return {
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      prescribingDoctor: m.prescribingDoctor,
      startDate: m.startDate,
      status: m.status,
    };
  }

  async deleteMedication(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/passport/medications/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<any>(res);
  }

  async addCondition(payload: {
    condition: string;
    diagnosedDate?: string;
    status?: 'Active' | 'Resolved' | 'Managed';
    notes?: string;
  }): Promise<HealthCondition> {
    const res = await fetch(`${API_BASE_URL}/api/passport/conditions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const c = await this.handleResponse<any>(res);
    return {
      id: c.id,
      condition: c.condition,
      diagnosedDate: c.diagnosedDate,
      status: c.status,
      notes: c.notes || '',
    };
  }

  async deleteCondition(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/passport/conditions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<any>(res);
  }

  async uploadDocument(formData: FormData): Promise<HealthDocument> {
    const res = await fetch(`${API_BASE_URL}/api/passport/documents/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(false), // Let browser set multipart boundary
      body: formData,
    });

    const d = await this.handleResponse<any>(res);
    return {
      id: d.id,
      title: d.title,
      category: d.category,
      date: d.documentDate,
      fileSize: d.fileSize,
      doctor: d.issuingDoctor,
      fileName: d.fileName,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
    };
  }

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/passport/documents/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<any>(res);
  }

  async downloadDocument(id: string, fileName: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/passport/documents/${id}/download`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      await this.handleResponse<never>(res);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ==========================================
  // 4. Appointments
  // ==========================================

  async getAppointments(): Promise<Appointment[]> {
    const res = await fetch(`${API_BASE_URL}/api/appointments`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<Appointment[]>(res);
  }

  async createAppointment(apt: Omit<Appointment, 'id'>): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(apt),
    });

    return await this.handleResponse<Appointment>(res);
  }

  async cancelAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE_URL}/api/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<Appointment>(res);
  }

  // ==========================================
  // 5. Health Timeline
  // ==========================================

  async getTimeline(): Promise<TimelineEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/timeline`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<TimelineEvent[]>(res);
  }

  // ==========================================
  // 6. Care Team Messages (Honest Empty State)
  // ==========================================

  async getMessageThreads(): Promise<MessageThread[]> {
    const res = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<MessageThread[]>(res);
  }

  // ==========================================
  // 7. Provider Directory (Honest Empty State)
  // ==========================================

  async getProviders(params?: {
    search?: string;
    careType?: string;
    specialty?: string;
    telehealthOnly?: boolean;
  }): Promise<HealthcareProvider[]> {
    const url = new URL(`${API_BASE_URL}/api/providers`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.careType) url.searchParams.set('care_type', params.careType);
    if (params?.telehealthOnly) url.searchParams.set('telehealth', 'true');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse<HealthcareProvider[]>(res);
  }

  // ==========================================
  // 8. AI Healthcare Navigator Chat
  // ==========================================

  async sendNavigatorMessage(
    userMessage: string,
    history: ChatMessage[] = []
  ): Promise<TriageResponse> {
    const res = await fetch(`${API_BASE_URL}/api/navigator/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        message: userMessage,
        history: history.slice(-6).map((h) => ({
          sender: h.sender,
          text: h.text,
        })),
      }),
    });

    return await this.handleResponse<TriageResponse>(res);
  }
}

export const api = new ApiService();
