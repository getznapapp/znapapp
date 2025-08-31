import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Polyfill for structuredClone - React Native compatible
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('structuredClone fallback failed:', error);
      return obj;
    }
  };
}

const supabaseUrl = 'https://swfgczocuudtdfstsjfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zmdjem9jdXVkdGRmc3RzamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzE0ODEsImV4cCI6MjA2ODIwNzQ4MX0.4bpgVoOu3OuwhkDs5Pk1M7NBDr0A-MqpyIaM5HwYxdg';

// Create storage adapter based on platform
const storage = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return Promise.resolve(null);
    }
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === 'undefined') {
      return Promise.resolve();
    }
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return Promise.resolve();
    }
    localStorage.removeItem(key);
    return Promise.resolve();
  },
} : AsyncStorage;

// Enhanced fetch with better error handling and timeout
const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  const options = init || {};
  
  // Only log in development to reduce noise
  if (__DEV__) {
    console.log('Supabase fetch:', url);
  }
  
  // Add timeout and better error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
  
  // Ensure API key is always included in headers
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    ...options.headers,
  };
  
  return fetch(input, {
    ...options,
    signal: controller.signal,
    headers,
  }).then(response => {
    clearTimeout(timeoutId);
    if (__DEV__) {
      console.log('Supabase response:', response.status, response.statusText);
    }
    return response;
  }).catch(error => {
    clearTimeout(timeoutId);
    
    // Only log errors in development or if they're not network-related
    if (__DEV__ || (!error.message?.includes('Network request failed') && !error.message?.includes('fetch'))) {
      console.error('Supabase fetch error:', error);
    }
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    if (error.message?.includes('Network request failed')) {
      throw new Error('Network error - please check your internet connection and try again');
    }
    throw error;
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    fetch: customFetch,
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const testPromise = supabase.from('cameras').select('count').limit(1);
    
    const { data, error } = await Promise.race([testPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      // Don't fail for network errors, just log them
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('fetch') ||
          error.message?.includes('timeout')) {
        console.log('Network error during connection test, continuing...');
        return false;
      }
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    // Handle network errors gracefully
    if (error instanceof Error && 
        (error.message?.includes('Network request failed') || 
         error.message?.includes('fetch') ||
         error.message?.includes('timeout'))) {
      console.log('Network error during connection test, continuing...');
      return false;
    }
    return false;
  }
};

