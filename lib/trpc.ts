import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // Check for environment variable first
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('Using EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // For web development - use current origin
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin;
    console.log('Using window.location.origin:', baseUrl);
    return baseUrl;
  }
  
  // For mobile development - try different localhost ports
  if (process.env.NODE_ENV === 'development') {
    // Try the standard Expo dev server port first
    const devUrl = 'http://localhost:8081';
    console.log('Using development URL:', devUrl);
    return devUrl;
  }
  
  // Production fallback - use the correct production URL
  const fallbackUrl = 'https://znapapp.netlify.app';
  console.log('Using production URL:', fallbackUrl);
  return fallbackUrl;
};

// Test function to check if backend is available
const testBackendConnection = async (baseUrl: string) => {
  try {
    console.log('Testing backend connection to:', `${baseUrl}/api/health`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Increased timeout for better reliability
    
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    
    console.log('Backend health check status:', response.status);
    
    if (!response.ok) {
      console.log('Backend health check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Backend health check successful:', data);
    return data.status === 'ok';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Backend health check timed out - backend not available');
    } else {
      console.log('Backend health check failed:', error);
    }
    return false;
  }
};

// Add error handling for fetch with better error messages
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  try {
    // Add timeout to prevent hanging requests - reduced for faster failure
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    console.log('Making tRPC request to:', url);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options?.headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    console.log('tRPC Response status:', response.status, 'for URL:', url);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('tRPC Error response:', {
        status: response.status,
        statusText: response.statusText,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        url: url.toString()
      });
      
      // Check if it's an HTML error page (like 404) or server error
      if (text.includes('<html>') || response.status >= 500) {
        backendAvailable = false; // Mark backend as unavailable
        throw new Error('Backend service not available');
      }
      
      // For 404 or other client errors, still mark as unavailable
      if (response.status === 404) {
        backendAvailable = false;
        throw new Error('Backend service not available');
      }
      
      // For other errors, try to parse as JSON for better error messages
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    }
    
    // If we get here, the backend is working
    if (!backendAvailable) {
      backendAvailable = true;
      console.log('Backend became available during request');
    }
    
    return response;
  } catch (error) {
    console.log('tRPC Fetch error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      url: url.toString()
    });
    
    // Handle timeout and network errors gracefully
    if (error instanceof Error && error.name === 'AbortError') {
      backendAvailable = false;
      throw new Error('Backend service not available (timeout)');
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      backendAvailable = false;
      throw new Error('Backend service not available (network error)');
    }
    
    // If it's already our custom error, don't wrap it
    if (error instanceof Error && error.message.includes('Backend service not available')) {
      backendAvailable = false;
      throw error;
    }
    
    throw error;
  }
};

const baseUrl = getBaseUrl();
const trpcUrl = `${baseUrl}/api/trpc`;
console.log('tRPC URL:', trpcUrl);

// Test backend connection on initialization
let backendAvailable = false;

// Test backend connection on initialization with retry logic
const testBackendWithRetry = async (retries = 1) => {
  for (let i = 0; i < retries; i++) {
    try {
      const isAvailable = await testBackendConnection(baseUrl);
      if (isAvailable) {
        backendAvailable = true;
        console.log('Backend is available - online features enabled');
        return;
      }
    } catch (error) {
      console.log(`Backend test attempt ${i + 1} failed:`, error);
    }
    
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between retries
    }
  }
  
  backendAvailable = false;
  console.log('Backend not available after all retries - using offline mode');
};

// Start the backend test but don't block initialization
// Set backend as unavailable by default for faster fallback
backendAvailable = false;

// Test backend connection with a shorter delay for faster startup
setTimeout(() => {
  testBackendWithRetry().catch(() => {
    backendAvailable = false;
    console.log('Backend connection failed - using offline mode');
  });
}, 100); // Reduced to 100ms for even faster startup

// Periodically retry backend connection in case it comes back online
setInterval(() => {
  if (!backendAvailable) {
    testBackendConnection(baseUrl).then(isAvailable => {
      if (isAvailable && !backendAvailable) {
        backendAvailable = true;
        console.log('Backend came back online - online features re-enabled');
      }
    }).catch(() => {
      // Silently fail - we're already in offline mode
    });
  }
}, 30000); // Check every 30 seconds

// Export backend availability status
export const isBackendAvailable = () => backendAvailable;

// Function to manually test and update backend availability
export const checkBackendAvailability = async () => {
  try {
    const isAvailable = await testBackendConnection(baseUrl);
    backendAvailable = isAvailable;
    console.log('Manual backend check:', isAvailable ? 'Available' : 'Not available');
    return isAvailable;
  } catch (error) {
    backendAvailable = false;
    console.log('Manual backend check failed:', error);
    return false;
  }
};

// Create a mock client for offline mode
const createMockClient = () => {
  const mockQuery = async () => {
    throw new Error('Backend not available - using offline mode');
  };
  
  const mockMutation = async () => {
    throw new Error('Backend not available - using offline mode');
  };

  const mockProcedure = {
    useQuery: () => ({ 
      data: null, 
      error: { message: 'Backend not available' }, 
      isLoading: false, 
      refetch: () => Promise.resolve() 
    }),
    useMutation: () => ({
      mutate: () => {},
      isPending: false,
      isError: true,
      error: { message: 'Backend not available' },
    }),
    query: mockQuery,
    mutate: mockMutation,
  };

  return {
    example: { hi: mockProcedure },
    camera: {
      create: mockProcedure,
      join: mockProcedure,
      isRevealed: mockProcedure,
      get: mockProcedure,
      saveNotification: mockProcedure,
    },
    photo: {
      upload: mockProcedure,
      list: mockProcedure,
      getSignedUrl: mockProcedure,
    },
  };
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: trpcUrl,
      transformer: superjson,
      headers() {
        return {
          'Content-Type': 'application/json',
        };
      },
      fetch: customFetch,
    }),
  ],
});

// Export a function to create the client with error handling
export const createTRPCClient = () => {
  // If backend is not available, return mock client
  if (!backendAvailable) {
    console.log('Creating mock tRPC client for offline mode');
    return createMockClient() as any;
  }

  return trpc.createClient({
    links: [
      httpLink({
        url: trpcUrl,
        transformer: superjson,
        headers() {
          return {
            'Content-Type': 'application/json',
          };
        },
        fetch: customFetch,
      }),
    ],
  });
};

// Utility function to check if we should attempt backend calls
export const shouldUseBackend = () => {
  // Always check if backend is actually available
  return backendAvailable;
};

// Utility function to handle backend errors gracefully
export const handleBackendError = (error: any, fallbackAction?: () => void) => {
  console.log('Backend error, using offline mode:', error.message || 'Unknown error');
  
  if (fallbackAction) {
    console.log('Executing fallback action...');
    fallbackAction();
  }
};

// Utility to generate offline camera IDs (using UUID format for Supabase compatibility)
export const generateOfflineCameraId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};