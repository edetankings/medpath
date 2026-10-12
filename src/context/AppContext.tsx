import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RoutePath, Appointment, PassportData, HealthDocument, ToastMessage, Allergy, Medication, HealthCondition } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface AppContextType {
  currentRoute: RoutePath;
  navigate: (route: RoutePath, query?: string) => void;
  appointments: Appointment[];
  isAppointmentsLoading: boolean;
  appointmentsError: string;
  passportError: string;
  addAppointment: (apt: Omit<Appointment, 'id'>) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  passport: PassportData;
  isPassportLoading: boolean;
  refreshPassport: () => Promise<void>;
  addAllergy: (payload: { allergen: string; severity: 'Mild' | 'Moderate' | 'Severe'; reaction: string; diagnosedDate?: string }) => Promise<Allergy>;
  deleteAllergy: (id: string) => Promise<void>;
  addMedication: (payload: { name: string; dosage: string; frequency: string; prescribingDoctor?: string; startDate?: string; status?: 'Active' | 'Discontinued' }) => Promise<Medication>;
  deleteMedication: (id: string) => Promise<void>;
  addCondition: (payload: { condition: string; diagnosedDate?: string; status?: 'Active' | 'Resolved' | 'Managed'; notes?: string }) => Promise<HealthCondition>;
  deleteCondition: (id: string) => Promise<void>;
  uploadDocument: (formData: FormData) => Promise<HealthDocument>;
  deleteDocument: (id: string) => Promise<void>;
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyPassport: PassportData = {
  allergies: [],
  medications: [],
  conditions: [],
  documents: [],
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Read initial route from URL hash
  const getRouteFromHash = (): RoutePath => {
    const raw = window.location.hash.slice(1).split('?')[0];
    const validRoutes: RoutePath[] = [
      'home', 'signin', 'signup', 'forgot', 'dashboard', 'ai-navigator',
      'passport', 'documents', 'find-care', 'appointments', 'timeline', 'messages', 'profile'
    ];
    return validRoutes.includes(raw as RoutePath) ? (raw as RoutePath) : 'home';
  };

  const [currentRoute, setCurrentRoute] = useState<RoutePath>(getRouteFromHash);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [passportError, setPassportError] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState<boolean>(true);
  const [passport, setPassport] = useState<PassportData>(emptyPassport);
  const [isPassportLoading, setIsPassportLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen for hashchange
  useEffect(() => {
    const onHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((route: RoutePath, query?: string) => {
    window.location.hash = `#${route}${query ? `?${query}` : ""}`;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);

  const showToast = useCallback((title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substr(2, 4);
    const newToast: ToastMessage = { id, title, description, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch real data when authenticated
  const refreshAppointments = useCallback(async () => {
    const requestToken = api.getToken();
    if (!requestToken) return;
    setIsAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const data = await api.getAppointments();
      if (api.getToken() !== requestToken) return;
      setAppointments(data);
    } catch (err: any) {
      if (api.getToken() !== requestToken) return;
      setAppointmentsError('Appointment plans could not be loaded. Please try again.');
      // Keep empty array on error, do not use mock data
      setAppointments([]);
    } finally {
      if (api.getToken() === requestToken) setIsAppointmentsLoading(false);
    }
  }, []);

  const refreshPassport = useCallback(async () => {
    const requestToken = api.getToken();
    if (!requestToken) return;
    setIsPassportLoading(true);
    setPassportError('');
    try {
      const data = await api.getPassport();
      if (api.getToken() !== requestToken) return;
      setPassport(data);
    } catch (err: any) {
      if (api.getToken() !== requestToken) return;
      setPassportError('Passport records could not be loaded. Please try again.');
      // Keep empty passport on error, do not use mock data
      setPassport(emptyPassport);
    } finally {
      if (api.getToken() === requestToken) setIsPassportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAppointments();
      refreshPassport();
    } else {
      setAppointments([]);
      setPassport(emptyPassport);
      setIsAppointmentsLoading(true);
      setIsPassportLoading(true);
      setAppointmentsError('');
      setPassportError('');
    }
  }, [isAuthenticated, refreshAppointments, refreshPassport]);

  // Appointments Actions
  const addAppointment = async (apt: Omit<Appointment, 'id'>): Promise<Appointment> => {
    const created = await api.createAppointment(apt);
    setAppointments((prev) => [created, ...prev]);
    showToast('Visit plan saved', 'Your personal plan was saved. Contact the provider directly to confirm the appointment.', 'success');
    return created;
  };

  const cancelAppointment = async (id: string): Promise<void> => {
    await api.cancelAppointment(id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))
    );
    showToast('Appointment Cancelled', 'The consultation has been removed from your active schedule.', 'warning');
  };

  // Passport Actions
  const addAllergy = async (payload: { allergen: string; severity: 'Mild' | 'Moderate' | 'Severe'; reaction: string; diagnosedDate?: string }) => {
    const newAllergy = await api.addAllergy(payload);
    setPassport((prev) => ({
      ...prev,
      allergies: [newAllergy, ...prev.allergies],
    }));
    showToast('Allergy Added', `Documented allergy to ${newAllergy.allergen}.`, 'success');
    return newAllergy;
  };

  const deleteAllergy = async (id: string) => {
    await api.deleteAllergy(id);
    setPassport((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a.id !== id),
    }));
    showToast('Record Removed', 'Allergy entry removed from your passport.', 'info');
  };

  const addMedication = async (payload: { name: string; dosage: string; frequency: string; prescribingDoctor?: string; startDate?: string; status?: 'Active' | 'Discontinued' }) => {
    const newMed = await api.addMedication(payload);
    setPassport((prev) => ({
      ...prev,
      medications: [newMed, ...prev.medications],
    }));
    showToast('Medication Added', `${newMed.name} added to your active prescriptions.`, 'success');
    return newMed;
  };

  const deleteMedication = async (id: string) => {
    await api.deleteMedication(id);
    setPassport((prev) => ({
      ...prev,
      medications: prev.medications.filter((m) => m.id !== id),
    }));
    showToast('Record Removed', 'Medication removed from your passport.', 'info');
  };

  const addCondition = async (payload: { condition: string; diagnosedDate?: string; status?: 'Active' | 'Resolved' | 'Managed'; notes?: string }) => {
    const newCond = await api.addCondition(payload);
    setPassport((prev) => ({
      ...prev,
      conditions: [newCond, ...prev.conditions],
    }));
    showToast('Condition Added', `${newCond.condition} documented in your medical history.`, 'success');
    return newCond;
  };

  const deleteCondition = async (id: string) => {
    await api.deleteCondition(id);
    setPassport((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
    showToast('Record Removed', 'Medical condition removed from your passport.', 'info');
  };

  const uploadDocument = async (formData: FormData): Promise<HealthDocument> => {
    const newDoc = await api.uploadDocument(formData);
    setPassport((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
    showToast('Record Uploaded', `"${newDoc.title}" saved to your Healthcare Passport.`, 'success');
    return newDoc;
  };

  const deleteDocument = async (id: string): Promise<void> => {
    await api.deleteDocument(id);
    setPassport((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
    showToast('Document Deleted', 'Document removed from your Healthcare Passport.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        appointmentsError, passportError,
        currentRoute,
        navigate,
        appointments,
        isAppointmentsLoading,
        addAppointment,
        cancelAppointment,
        refreshAppointments,
        passport,
        isPassportLoading,
        refreshPassport,
        addAllergy,
        deleteAllergy,
        addMedication,
        deleteMedication,
        addCondition,
        deleteCondition,
        uploadDocument,
        deleteDocument,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
