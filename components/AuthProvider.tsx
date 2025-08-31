import React, { useEffect, useRef } from 'react';
import { supabase, testSupabaseConnection } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore(state => state.setUser);
  const setSession = useAuthStore(state => state.setSession);
  const setLoading = useAuthStore(state => state.setLoading);
  const setInitialized = useAuthStore(state => state.setInitialized);
  const initialized = useRef(false);

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout;
    
    // Prevent multiple initializations
    if (initialized.current) return;
    initialized.current = true;
    
    console.log('AuthProvider: Initializing...');
    
    // Set a maximum initialization timeout to prevent hanging
    const maxInitTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthProvider: Initialization timeout reached, forcing completion');
        setSession(null);
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
    }, 4000); // 4 second max timeout
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        // Test connection with timeout (non-blocking)
        console.log('AuthProvider: Testing Supabase connection...');
        
        // Don't block initialization on connection test
        testSupabaseConnection().then(connectionOk => {
          if (connectionOk) {
            console.log('AuthProvider: Supabase connection successful');
          } else {
            console.warn('AuthProvider: Supabase connection test failed, but continuing...');
          }
        }).catch(error => {
          console.warn('AuthProvider: Connection test error:', error.message);
        });
        
        if (!mounted) return;
        
        // Get session with shorter timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 3000)
        );
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          // Don't fail initialization for network errors
          if (!error.message?.includes('fetch') && 
              !error.message?.includes('network') && 
              !error.message?.includes('timeout')) {
            throw error;
          }
        }
        
        console.log('AuthProvider: Initial session:', !!session, session?.user?.email);
        
        clearTimeout(maxInitTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('Error getting session (catch):', error);
        if (!mounted) return;
        
        // Even if there's an error, we should still initialize
        clearTimeout(maxInitTimeout);
        setSession(null);
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    let subscription: any;
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        console.log('AuthProvider: Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Don't set loading to false here for sign-in events
        // Let the auth store handle loading state
        if (event !== 'SIGNED_IN') {
          setLoading(false);
        }
      });
      subscription = sub;
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    return () => {
      mounted = false;
      clearTimeout(maxInitTimeout);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth listener:', error);
        }
      }
    };
  }, []); // Empty dependency array since Zustand functions are stable

  return <>{children}</>;
}