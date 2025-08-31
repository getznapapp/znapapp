import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { trpcClient, shouldUseBackend } from '@/lib/trpc';
import { useCameraStore } from '@/store/camera-store';

export default function DebugCameraCreationScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { cameras, addCamera, setCurrentCamera } = useCameraStore();

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraCreation = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING CAMERA CREATION ===');
      
      // Test backend availability first
      addResult('Testing backend availability...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('/api/health', { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          addResult(`Backend health check: SUCCESS - ${data.message}`);
        } else {
          addResult(`Backend health check: FAILED - Status ${response.status}`);
        }
      } catch (healthError) {
        addResult(`Backend health check: FAILED - ${healthError}`);
        addResult('Note: This is expected if backend service is not running. Fallback to direct Supabase will be used.');
      }
      
      // Test 1: Create camera via backend
      if (shouldUseBackend()) {
        addResult('Testing backend camera creation...');
        try {
          const backendResult = await trpcClient.camera.create.mutate({
            name: 'Test Camera Backend',
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            participantLimit: 20,
            maxPhotosPerPerson: 20,
            allowCameraRoll: true,
            filter: 'none',
            paidUpgrade: false,
            revealDelayType: '24h',
          });
          
          addResult(`Backend creation success: ${JSON.stringify(backendResult)}`);
          
          // Verify it exists
          await new Promise(resolve => setTimeout(resolve, 1000));
          const verifyResult = await supabaseDirect.getCamera(backendResult.cameraId);
          addResult(`Backend verification: ${verifyResult.success ? 'SUCCESS' : 'FAILED'}`);
          
          if (verifyResult.success) {
            // Add to local store
            const localCamera = addCamera({
              name: 'Test Camera Backend',
              startDate: new Date(),
              endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              maxPhotosPerPerson: 20,
              allowCameraRoll: true,
              revealDelayType: '24h',
              customRevealAt: undefined,
              filter: 'none',
              maxGuests: 20,
              isActive: true,
              paidUpgrade: false,
            }, backendResult.cameraId);
            
            addResult(`Added to local store: ${localCamera.id}`);
          }
        } catch (backendError) {
          addResult(`Backend creation failed: ${backendError}`);
          addResult('Note: This is expected if backend service is not running. Fallback to direct Supabase will be used.');
        }
      } else {
        addResult('Backend not available, skipping backend test');
      }
      
      // Test 2: Create camera via direct Supabase
      addResult('Testing direct Supabase camera creation...');
      try {
        const directResult = await supabaseDirect.createCamera({
          name: 'Test Camera Direct',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 20,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: '24h',
        });
        
        addResult(`Direct creation success: ${JSON.stringify(directResult)}`);
        
        // Verify it exists
        await new Promise(resolve => setTimeout(resolve, 1000));
        const verifyResult = await supabaseDirect.getCamera(directResult.cameraId);
        addResult(`Direct verification: ${verifyResult.success ? 'SUCCESS' : 'FAILED'}`);
        
        if (verifyResult.success) {
          // Add to local store
          const localCamera = addCamera({
            name: 'Test Camera Direct',
            startDate: new Date(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            maxPhotosPerPerson: 20,
            allowCameraRoll: true,
            revealDelayType: '24h',
            customRevealAt: undefined,
            filter: 'none',
            maxGuests: 20,
            isActive: true,
            paidUpgrade: false,
          }, directResult.cameraId);
          
          addResult(`Added to local store: ${localCamera.id}`);
        }
      } catch (directError) {
        addResult(`Direct creation failed: ${directError}`);
      }
      
      // Test 3: List all cameras in Supabase
      addResult('Listing all cameras in Supabase...');
      try {
        const listResult = await supabaseDirect.listAllCameras();
        addResult(`Cameras in Supabase: ${listResult.count}`);
        listResult.cameras.forEach((camera: any, index: number) => {
          addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
        });
      } catch (listError) {
        addResult(`Failed to list cameras: ${listError}`);
      }
      
      // Test 4: Show local cameras
      addResult(`Local cameras count: ${cameras.length}`);
      cameras.forEach((camera, index) => {
        addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
      });
      
      addResult('=== TEST COMPLETE ===');
      
    } catch (error) {
      addResult(`Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Testing Supabase connection...');
      const connectionResult = await supabaseDirect.testConnection();
      addResult(`Connection test: ${connectionResult.success ? 'SUCCESS' : 'FAILED'}`);
      addResult(`Message: ${connectionResult.message}`);
      addResult(`Cameras table: ${connectionResult.camerasTable ? 'OK' : 'FAILED'}`);
      addResult(`Photos table: ${connectionResult.photosTable ? 'OK' : 'FAILED'}`);
      addResult(`Storage bucket: ${connectionResult.storageBucket ? 'OK' : 'FAILED'}`);
    } catch (error) {
      addResult(`Connection test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Debug Camera Creation',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testSupabaseConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Supabase Connection</Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testCameraCreation}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Camera Creation</Text>
        </Pressable>
        
        <Pressable
          style={styles.clearButton}
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </Pressable>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {isLoading && (
          <Text style={styles.loadingText}>Running tests...</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  clearButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});