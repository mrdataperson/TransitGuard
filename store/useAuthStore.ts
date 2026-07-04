import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthState {
  session: Session | null;
  isInitializing: boolean;
  isSubmitting: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Keep the store in sync with Supabase's own auth state (token refresh, sign-out, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session });
  });

  return {
    session: null,
    isInitializing: true,
    isSubmitting: false,
    error: null,

    initialize: async () => {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, isInitializing: false });
    },

    signIn: async (email, password) => {
      set({ isSubmitting: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ isSubmitting: false, error: error.message });
        return false;
      }
      set({ isSubmitting: false, session: data.session });
      return true;
    },

    signUp: async (email, password) => {
      set({ isSubmitting: true, error: null });
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        set({ isSubmitting: false, error: error.message });
        return false;
      }
      // If email confirmation is required, Supabase returns no session yet.
      set({ isSubmitting: false, session: data.session });
      return true;
    },

    signOut: async () => {
      set({ isSubmitting: true });
      await supabase.auth.signOut();
      set({ isSubmitting: false, session: null });
    },

    clearError: () => set({ error: null }),
  };
});
