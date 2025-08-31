import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { cameraUtils } from '@/lib/camera-utils';
import { useCameraStore } from '@/store/camera-store';

export default function TestCameraSyncScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testCameraId, setTestCameraId] = useState<string>('');

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraSync = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING CAMERA SYNC FLOW ===');
      
      // Step 1: Create camera locally first
      addResult('Step 1: Creating camera locally...');
      const { addCamera, setCurrentCamera } = useCameraStore.getState();
      
      const localCamera = addCamera({
        name: 'Sync Test Camera',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        revealDelayType: 'immediate',
        customRevealAt: undefined,
        filter: 'none',
        maxGuests: 20,
        isActive: true,
        paidUpgrade: false,
      });
      
      setCurrentCamera(localCamera);
      setTestCameraId(localCamera.id);
      addResult(`✅ Camera created locally: ${localCamera.id}`);
      addResult(`   Name: ${localCamera.name}`);
      
      // Step 2: Verify camera is in local store
      addResult('Step 2: Verifying local storage...');
      const { findCameraById } = useCameraStore.getState();
      const foundCamera = findCameraById(localCamera.id);
      
      if (foundCamera) {
        addResult(`✅ Camera found in local store: ${foundCamera.name}`);
      } else {
        addResult('❌ Camera not found in local store');
        return;
      }
      
      // Step 3: Try to ensure camera exists in database
      addResult('Step 3: Ensuring camera exists in database...');
      try {
        const ensureResult = await cameraUtils.ensureCameraExistsForPhoto(localCamera.id);
        if (ensureResult) {
          addResult('✅ Camera successfully ensured in database');
        } else {
          addResult('❌ Failed to ensure camera in database');
        }
      } catch (ensureError) {
        addResult(`❌ Error ensuring camera: ${ensureError}`);
      }
      
      // Step 4: Verify camera exists in database
      addResult('Step 4: Verifying camera in database...');
      try {
        const dbResult = await supabaseDirect.getCamera(localCamera.id);
        if (dbResult.success) {
          addResult(`✅ Camera verified in database: ${dbResult.camera.name}`);
        } else {
          addResult('❌ Camera not found in database');
        }
      } catch (dbError) {
        addResult(`❌ Database verification error: ${dbError}`);
      }
      
      // Step 5: Try photo upload
      addResult('Step 5: Testing photo upload...');
      try {
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId: localCamera.id,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-sync-user',
          userName: 'Sync Test User',
        });
        
        if (uploadResult.success) {
          addResult(`✅ Photo uploaded successfully: ${uploadResult.photo.id}`);
        } else {
          addResult('❌ Photo upload failed');
        }
      } catch (uploadError) {
        addResult(`❌ Photo upload error: ${uploadError}`);
      }
      
      // Step 6: List all cameras in database
      addResult('Step 6: Listing all cameras in database...');
      try {
        const listResult = await supabaseDirect.listAllCameras();
        if (listResult.success) {
          addResult(`✅ Found ${listResult.count} cameras in database:`);
          listResult.cameras.forEach((camera, index) => {
            addResult(`   ${index + 1}. ${camera.name} (${camera.id})`);
          });
        } else {
          addResult('❌ Failed to list cameras');
        }
      } catch (listError) {
        addResult(`❌ Camera listing error: ${listError}`);
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
    setTestCameraId('');
  };

  const syncAllCameras = async () => {
    setIsLoading(true);
    addResult('=== SYNCING ALL LOCAL CAMERAS ===');
    
    try {
      const syncResult = await cameraUtils.syncLocalCamerasToDatabase();
      
      if (syncResult.success) {
        addResult(`✅ Sync completed: ${syncResult.synced} cameras synced`);
      } else {
        addResult(`❌ Sync failed: ${syncResult.errors.length} errors`);
        syncResult.errors.forEach(error => {
          addResult(`   Error: ${error}`);
        });
      }
    } catch (error) {
      addResult(`❌ Sync error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Test Camera Sync',
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
            {isLoading ? 'Testing...' : 'Test Camera Sync'}
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
          onPress={syncAllCameras}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            Sync All Cameras
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
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
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