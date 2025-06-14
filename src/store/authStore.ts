import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useTodoStore } from "./todoStore";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  isLoadingData: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsLoadingData: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<(() => void) | undefined>;
  forceDataLoad: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,
  isLoadingData: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),

  forceDataLoad: async () => {
    const { user, isLoadingData } = get();
    if (!user) {
      console.log("No user found for force data load");
      return;
    }
    
    if (isLoadingData) {
      console.log("Data loading already in progress, skipping force load");
      return;
    }

    console.log("Force loading data for user:", user.id, "isLoadingData:", isLoadingData);
    set({ isLoadingData: true });
    useTodoStore.getState().setLoading(true);
    
    try {
      await useTodoStore.getState().fetchLists(user);
      console.log("Force data load completed successfully");
    } catch (error) {
      console.error("Failed to force load data:", error);
      useTodoStore.getState().setError("Failed to load data");
      throw error; // Re-throw to allow caller to handle
    } finally {
      set({ isLoadingData: false });
      useTodoStore.getState().setLoading(false);
    }
  },

  initialize: async () => {
    // Only initialize once
    if (get().initialized) return;

    set({ loading: true });

    try {
      // First, check current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        // Don't throw here, just clear session and continue
        await supabase.auth.signOut();
        set({ user: null, initialized: true, loading: false, error: null });
        return;
      }

      // If we have a valid session, get the user
      let user = session?.user || null;

      // If no session, try to get user (this handles refresh token scenarios)
      if (!user) {
        const {
          data: { user: refreshedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("User error:", userError);
          // Handle specific auth errors
          if (
            userError.message.includes("Invalid Refresh Token") ||
            userError.message.includes("Refresh Token Not Found") ||
            userError.message.includes("invalid_grant") ||
            userError.message.includes("session_not_found") ||
            userError.message.includes("Session from session_id claim in JWT does not exist") ||
            (userError as any)?.code === "session_not_found" ||
            JSON.stringify(userError).includes("session_not_found")
          ) {
            // Clear invalid session
            await supabase.auth.signOut();
            set({ user: null, initialized: true, loading: false, error: null });
            return;
          }
          throw userError;
        }

        user = refreshedUser;
      }

      set({ user, initialized: true, loading: false });

      // If we have a user on initialization, load their data immediately
      if (user) {
        console.log("User found on initialization, loading data...");
        await get().forceDataLoad();
      }

      // Set up auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id, "isLoadingData:", get().isLoadingData);
        const newUser = session?.user ?? null;
        const currentUser = get().user;
        
        // Always update user state to ensure UI reactivity
        set({ user: newUser, loading: false });

        // Handle sign in - fetch data immediately (but only once)
        if (event === "SIGNED_IN" && newUser) {
          const { isLoadingData } = get();
          if (isLoadingData) {
            console.log("Data loading already in progress, skipping...");
            return;
          }
          console.log("User signed in via auth state change, loading data...");
          try {
            await get().forceDataLoad();
          } catch (error) {
            console.error("Failed to load data on sign in:", error);
          }
        }

        // Reset todo store when user signs out
        if (event === "SIGNED_OUT") {
          useTodoStore.getState().reset();
          set({ isLoadingData: false });
        }

        // Handle token refresh (but only if no data exists and not already loading)
        if (event === "TOKEN_REFRESHED" && newUser) {
          const { isLoadingData } = get();
          if (isLoadingData) {
            console.log("Data loading already in progress during token refresh, skipping...");
            return;
          }
          console.log("Token refreshed, ensuring data is loaded...");
          // Check if we have data, if not, load it
          const todoStore = useTodoStore.getState();
          if (todoStore.lists.length === 0) {
            try {
              await get().forceDataLoad();
            } catch (error) {
              console.error("Failed to load data on token refresh:", error);
            }
          }
        }
      });

      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Auth initialization error:", error);
      // Enhanced error handling for session-related errors in catch block
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error);

      if (
        errorMessage.includes("session_not_found") ||
        errorMessage.includes("Session from session_id claim in JWT does not exist") ||
        errorString.includes("session_not_found") ||
        (error as any)?.code === "session_not_found"
      ) {
        // Clear invalid session
        await supabase.auth.signOut();
        set({ user: null, initialized: true, loading: false, error: null });
        return;
      }

      set({
        error: error instanceof Error ? error.message : "Failed to initialize auth",
        user: null,
        loading: false,
        initialized: true,
      });
    }
  },

  signOut: async () => {
    // Check if a user is already signed out
    if (get().user === null) {
      return;
    }
    
    try {
      set({ isLoadingData: false }); // Reset loading state
      
      // Clear IndexedDB data BEFORE signing out
      const { indexedDBManager } = await import("../lib/indexedDB");
      await indexedDBManager.clearAllData();
      
      await supabase.auth.signOut();
      set({ user: null });
      // Reset todo store state
      useTodoStore.getState().reset();
    } catch (error) {
      console.error("Sign out error:", error);
      // Handle session-related errors during sign out
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = JSON.stringify(error);

      if (
        errorMessage.includes("session_not_found") ||
        errorMessage.includes("Session from session_id claim in JWT does not exist") ||
        errorString.includes("session_not_found") ||
        (error as any)?.code === "session_not_found"
      ) {
        // Even if logout fails due to session not found, clear local state
        const { indexedDBManager } = await import("../lib/indexedDB");
        await indexedDBManager.clearAllData();
        set({ user: null, error: null, isLoadingData: false });
        useTodoStore.getState().reset();
        return;
      }

      // For other errors, still clear the user state but set error message
      const { indexedDBManager } = await import("../lib/indexedDB");
      await indexedDBManager.clearAllData();
      set({
        error: error instanceof Error ? error.message : "Failed to sign out",
        user: null,
        isLoadingData: false,
      });
      useTodoStore.getState().reset();
    }
  },
}));