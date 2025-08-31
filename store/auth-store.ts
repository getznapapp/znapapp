import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';



interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    user: null,
    session: null,
    loading: true,
    initialized: false,

    signIn: async (email: string, password: string) => {
      const maxRetries = 3;
      let lastError: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Starting sign in process... (attempt ${attempt}/${maxRetries})`);
          set({ loading: true });
          
          // Add a small delay between retries
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          console.log('Sign in response:', { data: !!data, error: error?.message });

          if (error) {
            console.error('Sign in error:', error);
            
            // Don't retry for authentication errors
            if (error.message.includes('Invalid login credentials') || 
                error.message.includes('Email not confirmed') ||
                error.message.includes('Too many requests')) {
              set({ loading: false });
              return { error: error.message };
            }
            
            // Retry for network errors
            if (attempt < maxRetries && 
                (error.message.includes('fetch') || 
                 error.message.includes('network') ||
                 error.message.includes('timeout'))) {
              lastError = error;
              continue;
            }
            
            set({ loading: false });
            return { error: error.message };
          }

          if (data?.user && data?.session) {
            console.log('Sign in successful, user:', data.user.email);
            // Set the user and session immediately
            set({ 
              user: data.user, 
              session: data.session, 
              loading: false 
            });
            return {};
          } else {
            set({ loading: false });
            return { error: 'Sign in failed - no user data received' };
          }
        } catch (error) {
          console.error(`Sign in failed (attempt ${attempt}):`, error);
          lastError = error;
          
          // Don't retry for non-network errors
          if (error instanceof Error) {
            if (error.message.includes('structuredClone') ||
                error.message.includes('Invalid login credentials')) {
              set({ loading: false });
              return { error: error.message };
            }
          }
          
          // Continue to next attempt for network errors
          if (attempt < maxRetries) {
            continue;
          }
        }
      }
      
      // All attempts failed
      set({ loading: false });
      
      if (lastError instanceof Error) {
        if (lastError.message.includes('structuredClone')) {
          return { error: 'Authentication system error. Please restart the app and try again.' };
        }
        if (lastError.message.includes('fetch') || 
            lastError.message.includes('network') ||
            lastError.message.includes('timeout')) {
          return { error: 'Network error. Please check your internet connection and try again.' };
        }
        return { error: lastError.message };
      }
      
      return { error: 'Sign in failed after multiple attempts. Please try again later.' };
    },

    signUp: async (email: string, password: string, fullName: string) => {
      try {
        console.log('Starting sign up process...');
        set({ loading: true });
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        console.log('Sign up response:', { data: !!data, error: error?.message });

        if (error) {
          console.error('Sign up error:', error);
          set({ loading: false });
          return { error: error.message };
        }

        if (data?.user && data?.session) {
          console.log('Sign up successful, user:', data.user.email);
          // Set the user and session immediately
          set({ 
            user: data.user, 
            session: data.session, 
            loading: false 
          });
        } else {
          set({ loading: false });
        }
        
        return {};
      } catch (error) {
        console.error('Sign up failed:', error);
        set({ loading: false });
        
        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('structuredClone')) {
            return { error: 'Authentication system error. Please restart the app and try again.' };
          }
          if (error.message.includes('fetch') || error.message.includes('network')) {
            return { error: 'Network error. Please check your internet connection and try again.' };
          }
          if (error.message.includes('User already registered')) {
            return { error: 'An account with this email already exists. Please sign in instead.' };
          }
          return { error: error.message };
        }
        
        return { error: 'An unexpected error occurred. Please try again.' };
      }
    },

    signOut: async () => {
      try {
        console.log('Starting sign out process...');
        set({ loading: true });
        await supabase.auth.signOut();
        // Clear the state immediately
        set({ 
          user: null, 
          session: null, 
          loading: false 
        });
        console.log('Sign out successful');
      } catch (error) {
        console.error('Sign out failed:', error);
        set({ loading: false });
      }
    },

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setLoading: (loading) => set({ loading }),
    setInitialized: (initialized) => set({ initialized }),
  })
);