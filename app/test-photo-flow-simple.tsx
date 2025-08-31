import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { uploadImageToCloud } from '@/lib/image-upload';

export default function TestPhotoFlowSimple() {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const addResult = (result: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testCompleteFlow = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      addResult('🚀 Starting complete photo flow test...');
      
      // Step 1: Create test camera
      addResult('📷 Creating test camera...');
      const cameraResult = await supabaseDirect.createCamera({
        name: `Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participantLimit: 20,
        maxPhotosPerPerson: 5,
        allowCameraRoll: false,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate',
      });
      
      const testCameraId = cameraResult.cameraId;
      addResult(`✅ Camera created: ${testCameraId}`);
      
      // Step 2: Upload photo using the same method as the camera screen
      addResult('📸 Uploading photo...');
      
      // Create a small test image as base64
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      // Convert to data URL to simulate camera capture
      const dataUrl = `data:image/jpeg;base64,${testImageBase64}`;
      
      const uploadResult = await uploadImageToCloud(
        dataUrl,
        testCameraId,
        'test-user',
        'Test User'
      );
      
      if (uploadResult.success) {
        addResult(`✅ Photo uploaded successfully`);
        addResult(`   File: ${uploadResult.photoData?.fileName}`);
        addResult(`   URL: ${uploadResult.url}`);
        addResult(`   Size: ${uploadResult.photoData?.fileSize} bytes`);
      } else {
        addResult(`❌ Photo upload failed: ${uploadResult.error}`);
        return;
      }
      
      // Step 3: Verify photo appears in gallery
      addResult('📋 Checking gallery...');
      const photosResult = await supabaseDirect.listPhotos({
        cameraId: testCameraId,
        includeHidden: true,
      });
      
      addResult(`✅ Gallery check: ${photosResult.photos.length} photos found`);
      
      if (photosResult.photos.length > 0) {
        const photo = photosResult.photos[0];
        addResult(`   Photo: ${photo.fileName}`);
        addResult(`   By: ${photo.userName}`);
        addResult(`   Size: ${photo.fileSize} bytes`);
        addResult(`   URL: ${photo.publicUrl}`);
      }
      
      // Step 4: Test photo count logic
      addResult('🔢 Testing photo count logic...');
      const userPhotos = photosResult.photos.filter(photo => photo.userId === 'test-user');
      const maxPhotos = 5; // From camera settings
      const remaining = Math.max(0, maxPhotos - userPhotos.length);
      
      addResult(`✅ Photo count check:`);
      addResult(`   User photos: ${userPhotos.length}`);
      addResult(`   Max allowed: ${maxPhotos}`);
      addResult(`   Photos left: ${remaining}`);
      
      addResult('🎉 Complete flow test successful!');
      
    } catch (error) {
      addResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testSupabaseConnection = async () => {
    setIsRunning(true);
    
    try {
      addResult('🔗 Testing Supabase connection...');
      
      const result = await supabaseDirect.testConnection();
      addResult(`✅ Connection successful: ${result.message}`);
      addResult(`   Cameras table: ${result.camerasTable ? '✅' : '❌'}`);
      addResult(`   Photos table: ${result.photosTable ? '✅' : '❌'}`);
      addResult(`   Storage bucket: ${result.storageBucket ? '✅' : '❌'}`);
      
    } catch (error) {
      addResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Photo Flow Test' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Photo Flow Test</Text>
        <Text style={styles.subtitle}>Test the complete photo upload and display flow</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isRunning && styles.buttonDisabled]} 
          onPress={testCompleteFlow}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Test...' : 'Test Complete Flow'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, isRunning && styles.buttonDisabled]} 
          onPress={testSupabaseConnection}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Supabase Connection</Text>
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
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {results.length === 0 && (
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