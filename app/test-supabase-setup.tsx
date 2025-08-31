import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { generateUUID } from '@/lib/uuid';

export default function TestSupabaseSetupScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFullFlow = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING FULL SUPABASE FLOW ===');
      
      // Step 1: Test connection
      addResult('Step 1: Testing Supabase connection...');
      try {
        const connectionResult = await supabaseDirect.testConnection();
        addResult(`✅ Connection: ${connectionResult.success ? 'SUCCESS' : 'FAILED'}`);
        addResult(`   Cameras table: ${connectionResult.camerasTable ? 'OK' : 'MISSING'}`);
        addResult(`   Photos table: ${connectionResult.photosTable ? 'OK' : 'MISSING'}`);
        addResult(`   Storage bucket: ${connectionResult.storageBucket ? 'OK' : 'MISSING'}`);
        
        if (!connectionResult.success) {
          throw new Error('Connection test failed');
        }
      } catch (error) {
        addResult(`❌ Connection failed: ${error}`);
        addResult('Please run the SQL scripts in your Supabase dashboard first.');
        return;
      }
      
      // Step 2: Create a test camera
      addResult('Step 2: Creating test camera...');
      let testCameraId: string;
      try {
        const cameraResult = await supabaseDirect.createCamera({
          name: 'Test Camera Setup',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 20,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: '24h',
        });
        
        testCameraId = cameraResult.cameraId;
        addResult(`✅ Camera created: ${testCameraId}`);
      } catch (error) {
        addResult(`❌ Camera creation failed: ${error}`);
        return;
      }
      
      // Step 3: Verify camera exists
      addResult('Step 3: Verifying camera exists...');
      try {
        const getResult = await supabaseDirect.getCamera(testCameraId);
        if (getResult.success) {
          addResult(`✅ Camera verified: ${getResult.camera.name}`);
        } else {
          throw new Error('Camera not found');
        }
      } catch (error) {
        addResult(`❌ Camera verification failed: ${error}`);
        return;
      }
      
      // Step 4: Test photo upload (with dummy data)
      addResult('Step 4: Testing photo upload...');
      try {
        // Create a small test image (1x1 pixel red PNG in base64)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId: testCameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-user',
          userName: 'Test User',
        });
        
        addResult(`✅ Photo uploaded: ${uploadResult.photo.id}`);
        addResult(`   URL: ${uploadResult.url}`);
      } catch (error) {
        addResult(`❌ Photo upload failed: ${error}`);
        return;
      }
      
      // Step 5: List photos
      addResult('Step 5: Listing photos...');
      try {
        const listResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
        });
        
        addResult(`✅ Photos listed: ${listResult.total} photos found`);
        listResult.photos.forEach((photo: any, index: number) => {
          addResult(`   ${index + 1}. ${photo.fileName} (${photo.userName})`);
        });
      } catch (error) {
        addResult(`❌ Photo listing failed: ${error}`);
        return;
      }
      
      addResult('');
      addResult('🎉 ALL TESTS PASSED!');
      addResult('Your Supabase integration is working correctly.');
      addResult('You can now use the camera app with confidence.');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Testing Supabase connection...');
      const result = await supabaseDirect.testConnection();
      
      if (result.success) {
        addResult('✅ Connection successful!');
        addResult(`Cameras table: ${result.camerasTable ? 'OK' : 'MISSING'}`);
        addResult(`Photos table: ${result.photosTable ? 'OK' : 'MISSING'}`);
        addResult(`Storage bucket: ${result.storageBucket ? 'OK' : 'MISSING'}`);
        addResult(`Cameras count: ${result.camerasCount}`);
        addResult(`Photos count: ${result.photosCount}`);
      } else {
        addResult('❌ Connection failed');
      }
    } catch (error) {
      addResult(`❌ Connection test failed: ${String(error)}`);
      if (String(error).includes('does not exist')) {
        addResult('');
        addResult('Tables do not exist. Please:');
        addResult('1. Go to your Supabase Dashboard');
        addResult('2. Navigate to SQL Editor');
        addResult('3. Run the SQL from SETUP_INSTRUCTIONS.md');
      }
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
          title: 'Test Supabase Setup',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Connection Only</Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={testFullFlow}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Full Flow</Text>
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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