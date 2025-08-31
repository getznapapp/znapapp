import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { trpcClient } from '@/lib/trpc';

export default function DebugCameraFlow() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testCameraId, setTestCameraId] = useState<string | null>(null);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testCameraCreationFlow = async () => {
    setTestResults([]);
    setIsLoading(true);
    setTestCameraId(null);
    
    try {
      addResult('🚀 Starting camera creation flow test...');
      
      // Step 1: Test direct Supabase camera creation
      addResult('📷 Testing direct Supabase camera creation...');
      
      const directResult = await supabaseDirect.createCamera({
        name: `Test Camera Direct ${Date.now()}`,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        participantLimit: 20,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate',
      });
      
      if (directResult.success) {
        addResult(`✅ Direct camera created: ${directResult.cameraId}`);
        setTestCameraId(directResult.cameraId);
        
        // Step 2: Test direct camera retrieval
        addResult('🔍 Testing direct camera retrieval...');
        const getResult = await supabaseDirect.getCamera(directResult.cameraId);
        
        if (getResult.success) {
          addResult(`✅ Direct camera retrieved: ${getResult.camera.name}`);
          
          // Step 3: Test backend camera retrieval
          addResult('🔍 Testing backend camera retrieval...');
          try {
            const backendResult = await trpcClient.camera.get.query({ 
              cameraId: directResult.cameraId 
            });
            
            if (backendResult.success && backendResult.camera) {
              addResult(`✅ Backend camera retrieved: ${backendResult.camera.name}`);
            } else {
              addResult(`❌ Backend camera retrieval failed: ${backendResult.error}`);
            }
          } catch (backendError) {
            addResult(`❌ Backend camera retrieval error: ${backendError instanceof Error ? backendError.message : 'Unknown error'}`);
          }
          
          // Step 4: Test photo upload
          addResult('📸 Testing photo upload...');
          const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
          
          const uploadResult = await supabaseDirect.uploadPhoto({
            cameraId: directResult.cameraId,
            imageBase64: testImageBase64,
            mimeType: 'image/jpeg',
            userId: 'test-user',
            userName: 'Test User'
          });
          
          if (uploadResult.success) {
            addResult(`✅ Photo uploaded: ${uploadResult.photo.fileName}`);
            
            // Step 5: Test photo listing
            addResult('📋 Testing photo listing...');
            const listResult = await supabaseDirect.listPhotos({ 
              cameraId: directResult.cameraId,
              includeHidden: true 
            });
            
            addResult(`✅ Photo list: Found ${listResult.photos.length} photos`);
            
            if (listResult.photos.length > 0) {
              const ourPhoto = listResult.photos.find((p: any) => p.id === uploadResult.photo.id);
              if (ourPhoto) {
                addResult('🎉 Photo appears in list - COMPLETE SUCCESS!');
              } else {
                addResult('❌ Photo NOT in list - FAILED!');
              }
            }
          } else {
            addResult('❌ Photo upload failed');
          }
        } else {
          addResult('❌ Direct camera retrieval failed');
        }
      } else {
        addResult('❌ Direct camera creation failed');
      }
      
      // Step 6: Test backend camera creation
      addResult('📷 Testing backend camera creation...');
      try {
        const backendCreateResult = await trpcClient.camera.create.mutate({
          name: `Test Camera Backend ${Date.now()}`,
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          participantLimit: 20,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: 'immediate',
        });
        
        if (backendCreateResult.success) {
          addResult(`✅ Backend camera created: ${backendCreateResult.cameraId}`);
          
          // Test backend camera retrieval
          const backendGetResult = await trpcClient.camera.get.query({ 
            cameraId: backendCreateResult.cameraId 
          });
          
          if (backendGetResult.success && backendGetResult.camera) {
            addResult(`✅ Backend camera retrieved: ${backendGetResult.camera.name}`);
          } else {
            addResult(`❌ Backend camera retrieval failed: ${backendGetResult.error}`);
          }
        } else {
          addResult('❌ Backend camera creation failed');
        }
      } catch (backendError) {
        addResult(`❌ Backend camera creation error: ${backendError instanceof Error ? backendError.message : 'Unknown error'}`);
      }
      
      addResult('✅ Camera flow test completed');
    } catch (error) {
      addResult(`❌ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const debugDatabase = async () => {
    addResult('🔍 Debugging database contents...');
    
    try {
      // List all cameras
      const camerasResult = await supabaseDirect.listAllCameras();
      addResult(`📷 Found ${camerasResult.count} cameras in database`);
      
      if (camerasResult.cameras.length > 0) {
        camerasResult.cameras.forEach((camera: any, index: number) => {
          addResult(`  Camera ${index + 1}: ${camera.name} (ID: ${camera.id})`);
        });
      }
      
      // List all photos
      const photosResult = await supabaseDirect.listAllPhotos();
      addResult(`📸 Found ${photosResult.count} photos in database`);
      
      if (photosResult.photos.length > 0) {
        photosResult.photos.forEach((photo: any, index: number) => {
          addResult(`  Photo ${index + 1}: ${photo.fileName} (Camera: ${photo.cameraId})`);
        });
      }
    } catch (error) {
      addResult(`❌ Database debug error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setTestCameraId(null);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Debug Camera Flow' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera Flow Debug</Text>
          <Text style={styles.description}>
            Test complete camera creation, retrieval, and photo upload flow
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={testCameraCreationFlow} 
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Running Tests...' : 'Test Complete Flow'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={debugDatabase}>
              <Text style={styles.buttonText}>Debug Database</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
              <Text style={styles.buttonText}>Clear Results</Text>
            </TouchableOpacity>
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
            <Text style={styles.infoTitle}>What this tests:</Text>
            <Text style={styles.infoText}>✅ Direct Supabase camera creation</Text>
            <Text style={styles.infoText}>✅ Direct Supabase camera retrieval</Text>
            <Text style={styles.infoText}>✅ Backend camera retrieval</Text>
            <Text style={styles.infoText}>✅ Photo upload to Supabase</Text>
            <Text style={styles.infoText}>✅ Photo listing from Supabase</Text>
            <Text style={styles.infoText}>✅ Backend camera creation</Text>
            <Text style={styles.infoText}>✅ End-to-end verification</Text>
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
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
});