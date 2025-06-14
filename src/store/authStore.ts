import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useTodoStore } from "./todoStore";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<(() => void) | undefined>;
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
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // Handle refresh token errors and session not found errors specifically
      if (
        error &&
        (error.message.includes("Invalid Refresh Token") ||
          error.message.includes("Refresh Token Not Found") ||
          error.message.includes("invalid_grant") ||
          error.message.includes("session_not_found") ||
          error.message.includes(
            "Session from session_id claim in JWT does not exist"
          ) ||
          // Handle error codes from API responses
          (error as any)?.code === "session_not_found" ||
          // Handle cases where the error is embedded in the response
          JSON.stringify(error).includes("session_not_found"))
      ) {
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
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        set({ user: session?.user ?? null });

        // Reset todo store when user signs out
        if (event === "SIGNED_OUT") {
          useTodoStore.getState().reset();
        }
      });

      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      // Enhanced error handling for session-related errors in catch block
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error);

      if (
        errorMessage.includes("session_not_found") ||
        errorMessage.includes(
          "Session from session_id claim in JWT does not exist"
        ) ||
        errorString.includes("session_not_found") ||
        (error as any)?.code === "session_not_found"
      ) {
        // Clear invalid session
        await supabase.auth.signOut();
        set({ user: null, initialized: true, loading: false, error: null });
        return;
      }

      set({
        error:
          error instanceof Error ? error.message : "Failed to initialize auth",
        user: null,
        loading: false,
        initialized: true,
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
      // Handle session-related errors during sign out
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error);

      if (
        errorMessage.includes("session_not_found") ||
        errorMessage.includes(
          "Session from session_id claim in JWT does not exist"
        ) ||
        errorString.includes("session_not_found") ||
        (error as any)?.code === "session_not_found"
      ) {
        // Even if logout fails due to session not found, clear local state
        set({ user: null, error: null });
        useTodoStore.getState().reset();
        return;
      }

      // For other errors, still clear the user state but set error message
      set({
        error: error instanceof Error ? error.message : "Failed to sign out",
        user: null,
      });
      useTodoStore.getState().reset();
    }
  },
}));
