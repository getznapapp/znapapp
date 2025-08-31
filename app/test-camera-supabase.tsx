import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Button } from '@/components/Button';
import { theme } from '@/constants/theme';
import { trpc, trpcClient } from '@/lib/trpc';

export default function TestCameraSupabasePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };



  const testCameraCreation = async () => {
    setIsLoading(true);
    addResult('🧪 Starting camera creation test...');
    
    try {
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

      addResult(`📤 Sending camera data: ${JSON.stringify(testCamera, null, 2)}`);
      const result = await trpcClient.camera.create.mutate(testCamera);
      
      if (result.success) {
        addResult(`✅ Camera created successfully: ${result.cameraId}`);
        addResult(`📊 Camera data: ${JSON.stringify(result.camera, null, 2)}`);
        return result.cameraId;
      } else {
        addResult('❌ Camera creation failed');
        return null;
      }
    } catch (error) {
      addResult(`❌ Camera creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Full camera creation error:', error);
      return null;
    }
  };

  const testCameraRetrieval = async (cameraId: string) => {
    addResult('🔍 Testing camera retrieval...');
    
    try {
      const result = await trpcClient.camera.get.query({ cameraId });
      
      if (result.success && result.camera) {
        addResult(`✅ Camera retrieved successfully: ${result.camera.name}`);
        addResult(`📅 End date: ${result.camera.endDate.toISOString()}`);
        addResult(`🔓 Reveal type: ${result.camera.revealDelayType}`);
      } else {
        addResult('❌ Camera retrieval failed');
      }
    } catch (error) {
      addResult(`❌ Camera retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testRevealStatus = async (cameraId: string) => {
    addResult('🔍 Testing reveal status...');
    
    try {
      const result = await trpcClient.camera.isRevealed.query({ cameraId });
      
      addResult(`✅ Reveal status: ${result.revealed ? 'Revealed' : 'Hidden'}`);
      addResult(`⏰ Reveal time: ${result.revealTime}`);
      addResult(`🔧 Reveal type: ${result.revealDelayType}`);
    } catch (error) {
      addResult(`❌ Reveal status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPhotoUpload = async (cameraId: string) => {
    addResult('📸 Testing photo upload...');
    
    try {
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
        addResult(`✅ Photo upload success: ${result.photo.fileName}`);
        addResult(`🔗 URL: ${result.url}`);
        addResult(`📊 File size: ${result.photo.fileSize} bytes`);
        return result.photo.id;
      } else {
        addResult('❌ Photo upload failed: No success flag');
        return null;
      }
    } catch (error) {
      addResult(`❌ Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Full photo upload error:', error);
      return null;
    }
  };

  const testPhotoList = async (cameraId: string) => {
    addResult('📋 Testing photo list...');
    
    try {
      const result = await trpcClient.photo.list.query({ cameraId, includeHidden: true });
      
      addResult(`✅ Photo list success: Found ${result.photos.length} photos`);
      addResult(`📊 Total: ${result.total}, Hidden: ${result.hiddenCount}`);
      
      if (result.photos.length > 0) {
        result.photos.forEach((photo: any, index: number) => {
          addResult(`  📷 Photo ${index + 1}: ${photo.fileName} (${photo.fileSize} bytes)`);
        });
      }
    } catch (error) {
      addResult(`❌ Photo list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Full photo list error:', error);
    }
  };

  const runFullTest = async () => {
    setTestResults([]);
    setIsLoading(true);
    
    try {
      addResult('🚀 Starting comprehensive Supabase test...');
      
      // Test 1: Create camera
      const cameraId = await testCameraCreation();
      
      if (cameraId) {
        // Test 2: Retrieve camera
        await testCameraRetrieval(cameraId);
        
        // Test 3: Check reveal status
        await testRevealStatus(cameraId);
        
        // Test 4: Upload photo
        const photoId = await testPhotoUpload(cameraId);
        
        // Test 5: List photos
        await testPhotoList(cameraId);
      }
      
      addResult('🎉 All tests completed!');
    } catch (error) {
      addResult(`❌ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Full test suite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Camera Supabase Test' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera Supabase Integration Test</Text>
          <Text style={styles.description}>
            Test camera creation, retrieval, and reveal status using Supabase backend.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Run Full Test"
              onPress={runFullTest}
              disabled={isLoading}
              style={styles.button}
            />
            <Button
              title="Clear Results"
              onPress={clearResults}
              variant="secondary"
              style={styles.button}
            />
          </View>
          
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
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Expected Supabase Tables:</Text>
            <Text style={styles.infoSubtitle}>cameras table:</Text>
            <Text style={styles.infoText}>• id (text, primary key)</Text>
            <Text style={styles.infoText}>• name (text)</Text>
            <Text style={styles.infoText}>• endDate (timestamp)</Text>
            <Text style={styles.infoText}>• revealDelayType (text)</Text>
            <Text style={styles.infoText}>• customRevealAt (timestamp, nullable)</Text>
            <Text style={styles.infoText}>• createdAt (timestamp)</Text>
            <Text style={styles.infoText}>• createdBy (text, nullable)</Text>
            
            <Text style={styles.infoSubtitle}>photos table:</Text>
            <Text style={styles.infoText}>• id (text, primary key)</Text>
            <Text style={styles.infoText}>• cameraId (text)</Text>
            <Text style={styles.infoText}>• fileName (text)</Text>
            <Text style={styles.infoText}>• publicUrl (text)</Text>
            <Text style={styles.infoText}>• userId (text)</Text>
            <Text style={styles.infoText}>• userName (text)</Text>
            <Text style={styles.infoText}>• uploadedAt (timestamp)</Text>
            <Text style={styles.infoText}>• mimeType (text)</Text>
            <Text style={styles.infoText}>• fileSize (integer)</Text>
            
            <Text style={styles.infoSubtitle}>Storage bucket:</Text>
            <Text style={styles.infoText}>• camera-photos (public bucket)</Text>
          </View>
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
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
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
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
});