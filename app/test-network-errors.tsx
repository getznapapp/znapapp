import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { trpcClient, shouldUseBackend, checkBackendAvailability } from '@/lib/trpc';
import { supabaseDirect } from '@/lib/supabase-direct';
import { useCameraStore } from '@/store/camera-store';

export default function TestNetworkErrorsScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { cameras } = useCameraStore();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testBackendAvailability = async () => {
    setIsLoading(true);
    addResult('Testing backend availability...');
    
    try {
      const isAvailable = await checkBackendAvailability();
      addResult(`Backend available: ${isAvailable}`);
      addResult(`shouldUseBackend(): ${shouldUseBackend()}`);
    } catch (error) {
      addResult(`Backend test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testTRPCPhotoList = async () => {
    setIsLoading(true);
    addResult('Testing tRPC photo list...');
    
    // Use a test camera ID or the first available camera
    const testCameraId = cameras.length > 0 ? cameras[0].id : 'test-camera-id';
    addResult(`Using camera ID: ${testCameraId}`);
    
    try {
      const result = await trpcClient.photo.list.query({
        cameraId: testCameraId,
        includeHidden: true
      });
      
      addResult(`tRPC photo list success: ${result.photos.length} photos`);
      if ('networkError' in result && result.networkError) {
        addResult('Network error detected but handled gracefully');
      }
    } catch (error) {
      addResult(`tRPC photo list error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testSupabaseDirectPhotoList = async () => {
    setIsLoading(true);
    addResult('Testing Supabase direct photo list...');
    
    // Use a test camera ID or the first available camera
    const testCameraId = cameras.length > 0 ? cameras[0].id : 'test-camera-id';
    addResult(`Using camera ID: ${testCameraId}`);
    
    try {
      const result = await supabaseDirect.listPhotos({
        cameraId: testCameraId,
        includeHidden: true
      });
      
      addResult(`Supabase direct photo list success: ${result.photos.length} photos`);
      if ('networkError' in result && result.networkError) {
        addResult('Network error detected but handled gracefully');
      }
    } catch (error) {
      addResult(`Supabase direct photo list error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    addResult('Testing Supabase connection...');
    
    try {
      const result = await supabaseDirect.testConnection();
      addResult(`Supabase connection success: ${result.message}`);
      addResult(`Cameras table: ${result.camerasTable}`);
      addResult(`Photos table: ${result.photosTable}`);
      addResult(`Storage bucket: ${result.storageBucket}`);
    } catch (error) {
      addResult(`Supabase connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('Starting comprehensive network error tests...');
    
    await testBackendAvailability();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    
    await testTRPCPhotoList();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSupabaseDirectPhotoList();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSupabaseConnection();
    
    addResult('All tests completed!');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Network Error Tests',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <Text style={styles.title}>Network Error Handling Tests</Text>
      <Text style={styles.subtitle}>
        Test how the app handles network failures and backend unavailability
      </Text>
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </Pressable>
        
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
            onPress={testBackendAvailability}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Backend Test</Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
            onPress={testTRPCPhotoList}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>tRPC Test</Text>
          </Pressable>
        </View>
        
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 8 }]}
            onPress={testSupabaseDirectPhotoList}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Supabase Direct</Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
            onPress={testSupabaseConnection}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Connection Test</Text>
          </Pressable>
        </View>
        
        <Pressable
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </Pressable>
      </View>
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        <ScrollView style={styles.resultsScroll}>
          {testResults.length === 0 ? (
            <Text style={styles.noResults}>No test results yet. Run a test to see results.</Text>
          ) : (
            testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  clearButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  resultsScroll: {
    flex: 1,
  },
  noResults: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});