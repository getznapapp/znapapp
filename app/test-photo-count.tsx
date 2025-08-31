import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { trpcClient, shouldUseBackend } from '@/lib/trpc';
import { useCameraStore } from '@/store/camera-store';
import { cameraUtils } from '@/lib/camera-utils';

export default function TestPhotoCountScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testCameraId, setTestCameraId] = useState<string>('');
  const { cameras, addCamera } = useCameraStore();

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPhotoCountFlow = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING PHOTO COUNT FLOW ===');
      
      // Step 1: Create a test camera
      addResult('Step 1: Creating test camera...');
      const createResult = await cameraUtils.createCameraWithVerification({
        name: 'Photo Count Test Camera',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participantLimit: 20,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: '24h',
      });
      
      if (!createResult.success) {
        addResult(`Camera creation failed: ${createResult.error}`);
        return;
      }
      
      const cameraId = createResult.cameraId!;
      setTestCameraId(cameraId);
      addResult(`Camera created successfully: ${cameraId}`);
      
      // Step 2: Verify camera exists in database
      addResult('Step 2: Verifying camera in database...');
      const verifyResult = await supabaseDirect.getCamera(cameraId);
      if (verifyResult.success) {
        addResult(`Camera verified in database: ${verifyResult.camera.name}`);
      } else {
        addResult('Camera verification failed');
        return;
      }
      
      // Step 3: Test photo upload
      addResult('Step 3: Testing photo upload...');
      try {
        // Create a simple test image (1x1 pixel PNG)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-user',
          userName: 'Test User',
        });
        
        if (uploadResult.success) {
          addResult(`Photo uploaded successfully: ${uploadResult.photo.id}`);
        } else {
          addResult('Photo upload failed');
        }
      } catch (uploadError) {
        addResult(`Photo upload error: ${uploadError}`);
      }
      
      // Step 4: Check photo count via backend
      if (shouldUseBackend()) {
        addResult('Step 4: Checking photo count via backend...');
        try {
          const photoListResult = await trpcClient.photo.list.query({
            cameraId,
            includeHidden: true,
          });
          
          addResult(`Backend photo count: ${photoListResult.totalAll || 0} total, ${photoListResult.total || 0} revealed`);
        } catch (backendError) {
          addResult(`Backend photo count failed: ${backendError}`);
        }
      }
      
      // Step 5: Check photo count via direct Supabase
      addResult('Step 5: Checking photo count via direct Supabase...');
      try {
        const directPhotoResult = await supabaseDirect.listPhotos({
          cameraId,
          includeHidden: true,
        });
        
        if (directPhotoResult.success) {
          addResult(`Direct Supabase photo count: ${directPhotoResult.total} photos`);
        } else {
          addResult('Direct Supabase photo count failed');
        }
      } catch (directError) {
        addResult(`Direct Supabase error: ${directError}`);
      }
      
      // Step 6: Check local camera store
      addResult('Step 6: Checking local camera store...');
      const localCamera = cameras.find(c => c.id === cameraId);
      if (localCamera) {
        addResult(`Local camera found: ${localCamera.name}, ${localCamera.photos.length} photos`);
      } else {
        addResult('Local camera not found');
      }
      
      addResult('=== TEST COMPLETE ===');
      
    } catch (error) {
      addResult(`Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGalleryNavigation = () => {
    if (testCameraId) {
      router.push(`/gallery/${testCameraId}`);
    } else {
      addResult('No test camera ID available for navigation');
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Test Photo Count',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testPhotoCountFlow}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Photo Count Flow</Text>
        </Pressable>
        
        {testCameraId && (
          <Pressable
            style={styles.button}
            onPress={testGalleryNavigation}
          >
            <Text style={styles.buttonText}>Open Test Gallery</Text>
          </Pressable>
        )}
        
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