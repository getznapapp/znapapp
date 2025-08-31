import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { uploadImageToCloud } from '@/lib/image-upload';
import { useAuthStore } from '@/store/auth-store';

export default function TestSupabaseComplete() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuthStore();
  
  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🚀 Starting complete Supabase integration test...');
      
      // Step 1: Test Supabase connection
      addResult('📡 Testing Supabase connection...');
      try {
        const connectionResult = await supabaseDirect.testConnection();
        addResult(`✅ Supabase connection: ${connectionResult.message}`);
      } catch (error) {
        addResult(`❌ Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Step 2: Create a test camera
      addResult('📷 Creating test camera...');
      let testCameraId: string;
      try {
        const cameraResult = await supabaseDirect.createCamera({
          name: `Test Camera ${Date.now()}`,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          participantLimit: 20,
          maxPhotosPerPerson: 10,
          allowCameraRoll: false,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: 'immediate',
        });
        
        testCameraId = cameraResult.cameraId;
        addResult(`✅ Camera created: ${testCameraId}`);
      } catch (error) {
        addResult(`❌ Camera creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Step 3: Test photo upload
      addResult('📸 Testing photo upload...');
      try {
        // Create a small test image as base64 (1x1 pixel JPEG)
        const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId: testCameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/jpeg',
          userId: user?.id || 'test-user',
          userName: user?.email || 'Test User',
        });
        
        addResult(`✅ Photo uploaded: ${uploadResult.photo.fileName}`);
        addResult(`   URL: ${uploadResult.url}`);
        addResult(`   Size: ${uploadResult.photo.fileSize} bytes`);
      } catch (error) {
        addResult(`❌ Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Step 4: Test photo listing
      addResult('📋 Testing photo listing...');
      try {
        const photosResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        addResult(`✅ Photos listed: ${photosResult.photos.length} photos found`);
        
        if (photosResult.photos.length > 0) {
          const photo = photosResult.photos[0];
          addResult(`   First photo: ${photo.fileName}`);
          addResult(`   Uploaded by: ${photo.userName}`);
          addResult(`   File size: ${photo.fileSize} bytes`);
        }
      } catch (error) {
        addResult(`❌ Photo listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Step 5: Test photo count for user limits
      addResult('🔢 Testing photo count limits...');
      try {
        const photosResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        const userPhotos = photosResult.photos.filter(photo => 
          photo.userId === (user?.id || 'test-user')
        );
        
        const maxPhotos = 10; // From camera creation above
        const remaining = Math.max(0, maxPhotos - userPhotos.length);
        
        addResult(`✅ Photo count check:`);
        addResult(`   User photos: ${userPhotos.length}`);
        addResult(`   Max allowed: ${maxPhotos}`);
        addResult(`   Remaining: ${remaining}`);
      } catch (error) {
        addResult(`❌ Photo count check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      addResult('🎉 Complete test finished successfully!');
      
    } catch (error) {
      addResult(`💥 Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testImageUploadFlow = async () => {
    setIsRunning(true);
    
    try {
      addResult('🖼️ Testing image upload flow...');
      
      // Create a test camera first
      const cameraResult = await supabaseDirect.createCamera({
        name: `Upload Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participantLimit: 20,
        maxPhotosPerPerson: 5,
        allowCameraRoll: false,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate',
      });
      
      const testCameraId = cameraResult.cameraId;
      addResult(`✅ Test camera created: ${testCameraId}`);
      
      // Create a data URL for a small test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.fillText('TEST', 25, 55);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      addResult('✅ Test image created');
      
      // Test the upload flow
      const uploadResult = await uploadImageToCloud(
        dataUrl,
        testCameraId,
        user?.id || 'test-user',
        user?.email || 'Test User'
      );
      
      if (uploadResult.success) {
        addResult(`✅ Upload successful: ${uploadResult.photoData?.fileName}`);
        addResult(`   URL: ${uploadResult.url}`);
        
        // Verify the photo appears in the list
        const photosResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        addResult(`✅ Verification: ${photosResult.photos.length} photos in gallery`);
      } else {
        addResult(`❌ Upload failed: ${uploadResult.error}`);
      }
      
    } catch (error) {
      addResult(`❌ Image upload test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Complete Supabase Test' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Complete Supabase Integration Test</Text>
        <Text style={styles.subtitle}>Test all photo upload and storage functionality</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isRunning && styles.buttonDisabled]} 
          onPress={runCompleteTest}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Complete Test...' : 'Run Complete Test'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isRunning && styles.buttonDisabled]} 
          onPress={testImageUploadFlow}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Image Upload Flow</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {testResults.length === 0 && (
          <Text style={styles.noResults}>No tests run yet</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  noResults: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});