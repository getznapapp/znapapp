import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { useCameraStore } from '@/store/camera-store';
import { cameraUtils } from '@/lib/camera-utils';

export default function DebugCameraSyncFixScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraSync = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING CAMERA SYNC FIX ===');
      
      // Step 1: Check local cameras
      const { cameras, findCameraById } = useCameraStore.getState();
      addResult(`Local cameras count: ${cameras.length}`);
      
      if (cameras.length === 0) {
        addResult('No local cameras found, creating test camera...');
        
        // Create a test camera
        const createResult = await cameraUtils.createCameraWithVerification({
          name: 'Sync Test Camera',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 20,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: 'immediate',
        });
        
        if (createResult.success) {
          addResult(`✅ Test camera created: ${createResult.cameraId}`);
        } else {
          addResult(`❌ Failed to create test camera: ${createResult.error}`);
          return;
        }
      }
      
      // Step 2: List all database cameras
      try {
        const dbResult = await supabaseDirect.listAllCameras();
        addResult(`Database cameras count: ${dbResult.count}`);
        
        if (dbResult.cameras.length > 0) {
          addResult('Database cameras:');
          dbResult.cameras.forEach((camera, index) => {
            addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
          });
        }
      } catch (dbError) {
        addResult(`❌ Failed to list database cameras: ${dbError}`);
      }
      
      // Step 3: Test sync for each local camera
      addResult('Testing sync for each local camera...');
      const { cameras: currentCameras } = useCameraStore.getState();
      
      for (const camera of currentCameras) {
        addResult(`Testing camera: ${camera.name} (${camera.id})`);
        
        // Check if it's a UUID format
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(camera.id);
        
        if (!isUUID) {
          addResult(`  ⚠️ Old format ID, skipping: ${camera.id}`);
          continue;
        }
        
        try {
          // Try to get from database
          const getResult = await supabaseDirect.getCamera(camera.id);
          if (getResult.success) {
            addResult(`  ✅ Camera exists in database: ${getResult.camera.name}`);
          }
        } catch (getError) {
          addResult(`  ❌ Camera not in database, attempting to sync...`);
          
          try {
            // Try to ensure it exists
            const ensureResult = await supabaseDirect.ensureCameraExists(camera.id, {
              name: camera.name,
              endTime: camera.endDate,
              maxPhotosPerPerson: camera.maxPhotosPerPerson,
              revealDelayType: camera.revealDelayType,
            });
            
            if (ensureResult.success) {
              addResult(`  ✅ Camera synced successfully: ${ensureResult.camera.name}`);
            } else {
              addResult(`  ❌ Failed to sync camera`);
            }
          } catch (syncError) {
            addResult(`  ❌ Sync error: ${syncError}`);
          }
        }
      }
      
      // Step 4: Test photo upload to first camera
      const testCamera = currentCameras.find(c => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.id)
      );
      
      if (testCamera) {
        addResult(`Testing photo upload to: ${testCamera.name}`);
        
        try {
          // Simple 1x1 red pixel PNG
          const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
          
          const uploadResult = await supabaseDirect.uploadPhoto({
            cameraId: testCamera.id,
            imageBase64: testImageBase64,
            mimeType: 'image/png',
            userId: 'sync-test-user',
            userName: 'Sync Test User',
          });
          
          if (uploadResult.success) {
            addResult(`✅ Photo uploaded successfully: ${uploadResult.photo.id}`);
          } else {
            addResult(`❌ Photo upload failed`);
          }
        } catch (uploadError) {
          addResult(`❌ Photo upload error: ${uploadError}`);
        }
      } else {
        addResult('No UUID format cameras available for photo test');
      }
      
      addResult('=== SYNC TEST COMPLETE ===');
      
    } catch (error) {
      addResult(`❌ Sync test failed: ${error}`);
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
          title: 'Debug Camera Sync Fix',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testCameraSync}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Camera Sync Fix'}
          </Text>
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
          <Text style={styles.loadingText}>Running sync test...</Text>
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