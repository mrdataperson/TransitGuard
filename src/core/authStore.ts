import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { UserRole } from '../contract/types';

const ROLES: UserRole[] = ['adult', 'child'];

function roleFromUser(user: User | null): UserRole | null {
  if (!user) return null;
  const r = user.user_metadata?.role;
  return ROLES.includes(r) ? (r as UserRole) : 'adult';
}

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    name?: string,
    parentEmail?: string,
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  loading: true,
  error: null,

  init: async () => {
    if (initialized) return;
    initialized = true;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    set({ user, role: roleFromUser(user), loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      set({ user: u, role: roleFromUser(u), loading: false });
    });
  },

  signIn: async (email, password) => {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signUp: async (email, password, role, name, parentEmail) => {
    set({ error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, name, parent_email: parentEmail } },
    });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));