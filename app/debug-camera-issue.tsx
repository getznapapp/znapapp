import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { useCameraStore } from '@/store/camera-store';

export default function DebugCameraIssueScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { cameras, addCamera, findCameraById } = useCameraStore();

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCameraFlow = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING CAMERA CREATION AND PHOTO UPLOAD FLOW ===');
      
      // Step 1: List all cameras in database
      addResult('Step 1: Listing all cameras in database...');
      try {
        const allCameras = await supabaseDirect.listAllCameras();
        addResult(`Found ${allCameras.count} cameras in database`);
        allCameras.cameras.forEach((camera: any) => {
          addResult(`  - ${camera.id}: ${camera.name} (created: ${camera.createdAt})`);
        });
      } catch (error) {
        addResult(`Failed to list cameras: ${error}`);
      }
      
      // Step 2: List all cameras in local store
      addResult('Step 2: Listing all cameras in local store...');
      addResult(`Found ${cameras.length} cameras in local store`);
      cameras.forEach(camera => {
        addResult(`  - ${camera.id}: ${camera.name} (created: ${camera.createdAt})`);
      });
      
      // Step 3: Create a new camera directly in Supabase
      addResult('Step 3: Creating new camera directly in Supabase...');
      try {
        const createResult = await supabaseDirect.createCamera({
          name: 'Debug Test Camera',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 20,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: '24h',
        });
        
        addResult(`Camera created successfully: ${createResult.cameraId}`);
        
        // Step 4: Immediately verify the camera exists
        addResult('Step 4: Verifying camera exists in database...');
        const verifyResult = await supabaseDirect.getCamera(createResult.cameraId);
        if (verifyResult.success) {
          addResult(`Camera verification SUCCESS: ${verifyResult.camera.name}`);
          
          // Step 5: Add to local store
          addResult('Step 5: Adding camera to local store...');
          const localCamera = addCamera({
            name: 'Debug Test Camera',
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
          }, createResult.cameraId);
          
          addResult(`Camera added to local store: ${localCamera.id}`);
          
          // Step 6: Test photo upload
          addResult('Step 6: Testing photo upload...');
          try {
            // Create a simple test image (1x1 pixel red PNG)
            const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            const uploadResult = await supabaseDirect.uploadPhoto({
              cameraId: createResult.cameraId,
              imageBase64: testImageBase64,
              mimeType: 'image/png',
              userId: 'test-user',
              userName: 'Test User',
            });
            
            addResult(`Photo upload SUCCESS: ${uploadResult.url}`);
            
          } catch (uploadError) {
            addResult(`Photo upload FAILED: ${uploadError}`);
          }
          
        } else {
          addResult(`Camera verification FAILED: ${verifyResult}`);
        }
        
      } catch (createError) {
        addResult(`Camera creation FAILED: ${createError}`);
      }
      
      // Step 7: Test connection
      addResult('Step 7: Testing Supabase connection...');
      try {
        const connectionTest = await supabaseDirect.testConnection();
        addResult(`Connection test: ${connectionTest.success ? 'SUCCESS' : 'FAILED'}`);
        addResult(`  - Cameras table: ${connectionTest.camerasTable}`);
        addResult(`  - Photos table: ${connectionTest.photosTable}`);
        addResult(`  - Storage bucket: ${connectionTest.storageBucket}`);
      } catch (connectionError) {
        addResult(`Connection test FAILED: ${connectionError}`);
      }
      
    } catch (error) {
      addResult(`Overall test FAILED: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Camera Issue' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Camera Creation & Photo Upload Debug</Text>
        <Text style={styles.subtitle}>Test the complete flow to identify issues</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testCameraFlow}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Complete Test'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});