import { create } from 'zustand';
import { EmergencyContact, EmergencyService } from '../services/EmergencyService';

interface EmergencyState {
  contacts: EmergencyContact[];
  isLoading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (contact: EmergencyContact) => Promise<void>;
  updateContact: (id: string, contact: Partial<EmergencyContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  contacts: [],
  isLoading: false,
  error: null,
  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const contacts = await EmergencyService.getContacts();
      set({ contacts, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  addContact: async (contact) => {
    set({ isLoading: true, error: null });
    try {
      const newContact = await EmergencyService.addContact(contact);
      set((state) => ({
        contacts: [newContact, ...state.contacts],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  updateContact: async (id, contact) => {
    set({ isLoading: true, error: null });
    try {
      const updatedContact = await EmergencyService.updateContact(id, contact);
      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === id ? updatedContact : c)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  deleteContact: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await EmergencyService.deleteContact(id);
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
