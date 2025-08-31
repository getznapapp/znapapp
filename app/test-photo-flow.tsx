import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { trpcClient } from '@/lib/trpc';

export default function TestPhotoFlow() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testCameraId, setTestCameraId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const createTestCamera = async () => {
    try {
      addResult('🏗️ Creating test camera...');
      
      const testCamera = {
        name: `Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        participantLimit: 20 as const,
        maxPhotosPerPerson: 20 as const,
        allowCameraRoll: true,
        filter: 'none' as const,
        paidUpgrade: false,
        revealDelayType: 'immediate' as const,
      };

      const result = await trpcClient.camera.create.mutate(testCamera);
      
      if (result.success) {
        setTestCameraId(result.cameraId);
        addResult(`✅ Camera created: ${result.cameraId}`);
        return result.cameraId;
      } else {
        addResult('❌ Camera creation failed');
        return null;
      }
    } catch (error) {
      addResult(`❌ Camera creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const uploadTestPhoto = async (cameraId: string) => {
    try {
      addResult('📸 Uploading test photo...');
      
      // Create a small test image as base64
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      const result = await trpcClient.photo.upload.mutate({
        cameraId,
        imageBase64: testImageBase64,
        mimeType: 'image/jpeg',
        userId: 'test-user',
        userName: 'Test User'
      });
      
      if (result.success) {
        addResult(`✅ Photo uploaded: ${result.photo.fileName}`);
        addResult(`📊 File size: ${result.photo.fileSize} bytes`);
        return result.photo;
      } else {
        addResult('❌ Photo upload failed');
        return null;
      }
    } catch (error) {
      addResult(`❌ Photo upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const fetchPhotos = async (cameraId: string) => {
    try {
      addResult('📋 Fetching photos...');
      
      const result = await trpcClient.photo.list.query({ 
        cameraId, 
        includeHidden: true 
      });
      
      addResult(`✅ Found ${result.photos.length} photos`);
      setPhotos(result.photos);
      
      result.photos.forEach((photo: any, index: number) => {
        addResult(`  📷 Photo ${index + 1}: ${photo.fileName} (${photo.fileSize} bytes)`);
      });
      
      return result.photos;
    } catch (error) {
      addResult(`❌ Photo fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  };

  const runFullTest = async () => {
    setTestResults([]);
    setPhotos([]);
    setIsLoading(true);
    
    try {
      addResult('🚀 Starting full photo flow test...');
      
      // Step 1: Create camera
      const cameraId = await createTestCamera();
      if (!cameraId) {
        addResult('❌ Test failed: Could not create camera');
        return;
      }
      
      // Step 2: Upload photo
      const photo = await uploadTestPhoto(cameraId);
      if (!photo) {
        addResult('❌ Test failed: Could not upload photo');
        return;
      }
      
      // Step 3: Fetch photos
      const fetchedPhotos = await fetchPhotos(cameraId);
      
      // Step 4: Verify photo appears in list
      const uploadedPhotoInList = fetchedPhotos.find((p: any) => p.id === photo.id);
      if (uploadedPhotoInList) {
        addResult('✅ Photo appears in gallery - SUCCESS!');
      } else {
        addResult('❌ Photo NOT found in gallery - FAILED!');
      }
      
      addResult('🎉 Full test completed!');
    } catch (error) {
      addResult(`❌ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setPhotos([]);
    setTestCameraId(null);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Test Photo Flow' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Photo Flow Test</Text>
          <Text style={styles.description}>
            Test the complete photo upload and gallery flow with Supabase
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={runFullTest} 
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Running Test...' : 'Run Full Test'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
              <Text style={styles.buttonText}>Clear Results</Text>
            </TouchableOpacity>
          </View>
          
          {testCameraId && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Test Camera ID:</Text>
              <Text style={styles.infoText}>{testCameraId}</Text>
            </View>
          )}
          
          {testResults.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Test Results:</Text>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          )}
          
          {photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.photosTitle}>Photos in Gallery:</Text>
              {photos.map((photo: any, index: number) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Text style={styles.photoText}>
                    {index + 1}. {photo.fileName}
                  </Text>
                  <Text style={styles.photoDetails}>
                    Size: {photo.fileSize} bytes | User: {photo.userName}
                  </Text>
                  <Text style={styles.photoDetails}>
                    Uploaded: {new Date(photo.uploadedAt).toLocaleString()}
                  </Text>
                  {photo.publicUrl && (
                    <Image 
                      source={{ uri: photo.publicUrl }} 
                      style={styles.photoPreview}
                      onError={() => console.log('Failed to load image:', photo.publicUrl)}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  infoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  resultsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  resultsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  photosSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  photosTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  photoItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  photoText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  photoDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
});