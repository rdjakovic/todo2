import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useTodoStore } from './todoStore';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  initialize: async () => {
    // Only initialize once
    if (get().initialized) return;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Handle refresh token errors and session not found errors specifically
      if (error && (
        error.message.includes('Invalid Refresh Token') || 
        error.message.includes('Refresh Token Not Found') ||
        error.message.includes('invalid_grant') ||
        error.message.includes('session_not_found') ||
        error.message.includes('Session from session_id claim in JWT does not exist')
      )) {
        // Clear invalid session
        await supabase.auth.signOut();
        set({ user: null, initialized: true, loading: false, error: null });
        return;
      }
      
      // Handle other errors
      if (error) {
        throw error;
      }
      
      set({ user, initialized: true, loading: false });

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        set({ user: session?.user ?? null });
        
        // Reset todo store when user signs out
        if (event === 'SIGNED_OUT') {
          useTodoStore.getState().reset();
        }
      });

      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize auth',
        user: null,
        loading: false,
        initialized: true
      });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
      // Reset todo store state and clear localStorage
      useTodoStore.getState().reset();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
    }
  },
}));