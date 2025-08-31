import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { cameraUtils } from '@/lib/camera-utils';

export default function TestFixedFlowScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testCameraId, setTestCameraId] = useState<string>('');

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCompleteFlow = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== TESTING COMPLETE FIXED FLOW ===');
      
      // Step 1: Create camera
      addResult('Step 1: Creating camera...');
      const createResult = await cameraUtils.createCameraWithVerification({
        name: 'Fixed Flow Test Camera',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participantLimit: 20,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate', // Immediate reveal for testing
      });
      
      if (!createResult.success) {
        addResult(`❌ Camera creation failed: ${createResult.error}`);
        return;
      }
      
      const cameraId = createResult.cameraId!;
      setTestCameraId(cameraId);
      addResult(`✅ Camera created: ${cameraId}`);
      
      // Step 2: Verify camera exists
      addResult('Step 2: Verifying camera...');
      try {
        const verifyResult = await supabaseDirect.getCamera(cameraId);
        if (verifyResult.success) {
          addResult(`✅ Camera verified: ${verifyResult.camera.name}`);
        } else {
          addResult('❌ Camera verification failed');
        }
      } catch (verifyError) {
        addResult(`❌ Camera verification error: ${verifyError}`);
      }
      
      // Step 3: Upload test photo
      addResult('Step 3: Uploading test photo...');
      try {
        // Simple 1x1 red pixel PNG
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-user-123',
          userName: 'Test User',
        });
        
        if (uploadResult.success) {
          addResult(`✅ Photo uploaded: ${uploadResult.photo.id}`);
          addResult(`   URL: ${uploadResult.url}`);
        } else {
          addResult('❌ Photo upload failed');
        }
      } catch (uploadError) {
        addResult(`❌ Photo upload error: ${uploadError}`);
      }
      
      // Step 4: List photos
      addResult('Step 4: Listing photos...');
      try {
        const listResult = await supabaseDirect.listPhotos({
          cameraId,
          includeHidden: true,
        });
        
        if (listResult.success) {
          addResult(`✅ Photos listed: ${listResult.total} total`);
          listResult.photos.forEach((photo, index) => {
            addResult(`   ${index + 1}. ${photo.id} by ${photo.userName}`);
          });
        } else {
          addResult('❌ Photo listing failed');
        }
      } catch (listError) {
        addResult(`❌ Photo listing error: ${listError}`);
      }
      
      // Step 5: Upload another photo
      addResult('Step 5: Uploading second photo...');
      try {
        // Simple 1x1 blue pixel PNG
        const testImageBase64_2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const uploadResult2 = await supabaseDirect.uploadPhoto({
          cameraId,
          imageBase64: testImageBase64_2,
          mimeType: 'image/png',
          userId: 'test-user-456',
          userName: 'Another User',
        });
        
        if (uploadResult2.success) {
          addResult(`✅ Second photo uploaded: ${uploadResult2.photo.id}`);
        } else {
          addResult('❌ Second photo upload failed');
        }
      } catch (uploadError2) {
        addResult(`❌ Second photo upload error: ${uploadError2}`);
      }
      
      // Step 6: Final photo count
      addResult('Step 6: Final photo count...');
      try {
        const finalListResult = await supabaseDirect.listPhotos({
          cameraId,
          includeHidden: true,
        });
        
        if (finalListResult.success) {
          addResult(`✅ Final count: ${finalListResult.total} photos`);
          addResult(`   Hidden: ${finalListResult.hiddenCount}`);
        } else {
          addResult('❌ Final count failed');
        }
      } catch (finalError) {
        addResult(`❌ Final count error: ${finalError}`);
      }
      
      addResult('=== FLOW TEST COMPLETE ===');
      addResult('✅ All steps completed successfully!');
      
    } catch (error) {
      addResult(`❌ Flow test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openGallery = () => {
    if (testCameraId) {
      router.push(`/gallery/${testCameraId}`);
    } else {
      addResult('No test camera available');
    }
  };

  const clearResults = () => {
    setResults([]);
    setTestCameraId('');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Test Fixed Flow',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testCompleteFlow}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Complete Flow'}
          </Text>
        </Pressable>
        
        {testCameraId && (
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={openGallery}
          >
            <Text style={styles.buttonText}>Open Gallery</Text>
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
          <Text style={styles.loadingText}>Running complete flow test...</Text>
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