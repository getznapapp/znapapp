import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function JoinCameraByIdScreen() {
  const { cameraId } = useLocalSearchParams<{ cameraId: string }>();
  const user = useAuthStore(state => state.user);
  const initialized = useAuthStore(state => state.initialized);

  useEffect(() => {
    console.log('=== JOIN ROUTE DEBUG ===');
    console.log('Platform:', Platform.OS);
    console.log('Camera ID from route params:', JSON.stringify(cameraId));
    console.log('Camera ID type:', typeof cameraId);
    console.log('User:', !!user);
    console.log('Initialized:', initialized);
    
    // Wait for auth to initialize
    if (!initialized) {
      console.log('Waiting for auth to initialize...');
      return;
    }
    
    if (cameraId && cameraId.trim()) {
      console.log('Processing camera ID:', cameraId);
      
      // Allow both authenticated and unauthenticated users to join
      console.log('Redirecting to JoinCamera screen with ID:', cameraId);
      // Small delay to ensure proper navigation
      setTimeout(() => {
        router.replace(`/join-camera?cameraId=${encodeURIComponent(cameraId)}`);
      }, 100);
    } else {
      console.log('No camera ID provided, redirecting to home');
      // If no camera ID, go back to home or sign-in
      setTimeout(() => {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/sign-in');
        }
      }, 100);
    }
  }, [cameraId, user, initialized]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Joining camera...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },
});