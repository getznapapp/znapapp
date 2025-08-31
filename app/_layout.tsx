import 'react-native-gesture-handler';
import 'core-js/actual/structured-clone';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { theme } from "@/constants/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { useCameraStore } from "@/store/camera-store";
import { AuthProvider } from "@/components/AuthProvider";
import { useAuthStore } from "@/store/auth-store";
import { useGuestStore } from "@/store/guest-store";
import { LoadingScreen } from "@/components/LoadingScreen";
import { setupSupabaseBucket } from "@/lib/supabase-setup";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    
    // If it's a timeout error, try to recover
    if (error.message?.includes('timeout') || error.message?.includes('6000ms')) {
      console.log('Timeout error detected, attempting recovery...');
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show loading screen for timeout errors while recovering
      if (this.state.error?.message?.includes('timeout') || 
          this.state.error?.message?.includes('6000ms')) {
        return <LoadingScreen />;
      }
      
      // For other errors, show a simple error message
      return <LoadingScreen />;
    }

    return this.props.children;
  }
}

// Global error handler for web platform to suppress browser extension errors
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Set up error suppression immediately
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  const shouldSuppressMessage = (message: string) => {
    return message.includes('MetaMask') || 
           message.includes('chrome-extension://') ||
           message.includes('Failed to connect to MetaMask') ||
           message.includes('ethereum') ||
           message.includes('web3') ||
           message.includes('wallet') ||
           (message.includes('Network request failed') && 
            (message.includes('Supabase') || message.includes('connection test'))) ||
           message.includes('No API key found in request') ||
           message.includes('No `apikey` request header') ||
           message.includes('headers must have required property') ||
           (message.includes('Bucket') && message.includes('not found'));
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    if (shouldSuppressMessage(message)) {
      return; // Suppress these errors
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (shouldSuppressMessage(message)) {
      return; // Suppress these warnings
    }
    originalConsoleWarn.apply(console, args);
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    
    // Suppress browser extension related errors and other handled errors
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      event.preventDefault();
      return;
    }
  });
  
  // Handle general errors
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    
    if (typeof message === 'string' && shouldSuppressMessage(message)) {
      event.preventDefault();
      return;
    }
  });
}

// Create a client with timeout settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});

export const unstable_settings = {
  initialRouteName: "(auth)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" backgroundColor={theme.colors.background} />
              <RootLayoutNav />
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const loadCameras = useCameraStore(state => state.loadCameras);
  const user = useAuthStore(state => state.user);
  const initialized = useAuthStore(state => state.initialized);
  const loading = useAuthStore(state => state.loading);
  const loadSessions = useGuestStore(state => state.loadSessions);
  const currentSession = useGuestStore(state => state.currentSession);
  const hasLoadedRef = useRef(false);
  const router = useRouter();
  const segments = useSegments();
  
  useEffect(() => {
    if (initialized && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      // Always load guest sessions
      loadSessions();
      
      // Load cameras if user is authenticated
      if (user) {
        loadCameras();
        
        // Verify Supabase bucket access (non-blocking)
        setupSupabaseBucket().then(success => {
          if (success) {
            console.log('✅ Supabase storage is ready');
          } else {
            console.log('⚠️  Supabase storage not available');
            console.log('📖 To enable cloud storage:');
            console.log('   1. Go to your Supabase dashboard');
            console.log('   2. Create a public bucket named "camera-photos"');
            console.log('   3. See SUPABASE_SETUP.md for detailed instructions');
          }
        }).catch(error => {
          console.log('⚠️  Supabase storage check failed:', error.message);
          console.log('📖 See SUPABASE_SETUP.md for setup instructions');
        });
      }
    }
  }, [user, initialized]);
  
  // Handle authentication routing
  useEffect(() => {
    if (!initialized) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inJoinRoute = segments[0] === 'join';
    const inRedirectRoute = segments[0] === 'redirect';
    const inJoinCameraRoute = segments[0] === 'join-camera';
    const inCameraDetailsRoute = segments[0] === 'camera-details';
    const inCameraRoute = segments[0] === 'camera';
    const inDebugRoute = segments[0] === 'debug';
    const inTabsRoute = segments[0] === '(tabs)';
    
    // Use the currentSession from the hook instead of getState()
    
    console.log('Auth routing check:', { 
      user: !!user, 
      hasGuestSession: !!currentSession,
      inAuthGroup, 
      inJoinRoute,
      inRedirectRoute,
      inJoinCameraRoute,
      inCameraDetailsRoute,
      inCameraRoute,
      inDebugRoute,
      inTabsRoute,
      segments, 
      initialized,
      currentUrl: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.href : 'N/A') : 'N/A'
    });
    
    // Don't redirect if user has a guest session or is in allowed routes
    const hasGuestAccess = currentSession && currentSession.isActive;
    const isInAllowedRoute = inAuthGroup || inJoinRoute || inRedirectRoute || inJoinCameraRoute || inCameraDetailsRoute || inCameraRoute || inDebugRoute || inTabsRoute;
    
    if (!user && !hasGuestAccess && !isInAllowedRoute) {
      // Redirect to sign in if not authenticated and no guest session
      console.log('Redirecting to sign-in');
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      console.log('Redirecting to main app');
      router.replace('/(tabs)');
    }
  }, [user, initialized, segments, currentSession]);
  
  // Show loading screen while initializing
  if (!initialized || loading) {
    return <LoadingScreen />;
  }
  
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="create-camera" options={{ presentation: "modal" }} />
      <Stack.Screen name="instant-camera" options={{ presentation: "modal" }} />
      <Stack.Screen name="screens/CreateCamera" options={{ presentation: "modal" }} />
      <Stack.Screen name="screens/JoinCamera" options={{ presentation: "modal" }} />
      <Stack.Screen name="join/[cameraId]" options={{ headerShown: false }} />
      <Stack.Screen name="join-camera" options={{ headerShown: false }} />
      <Stack.Screen name="redirect" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="camera-details/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="debug/join-test" options={{ headerShown: true }} />
      <Stack.Screen name="test-camera-offline" options={{ headerShown: false }} />
      <Stack.Screen name="test-pinch-debug" options={{ headerShown: true, title: "Pinch Debug" }} />
      <Stack.Screen name="scan-qr" options={{ presentation: "modal" }} />
    </Stack>
  );
}