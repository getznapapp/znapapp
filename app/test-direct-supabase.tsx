import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function TestDirectSupabase() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testCameraId, setTestCameraId] = useState<string | null>(null);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testConnection = async () => {
    addResult('🔍 Testing direct Supabase connection...');
    
    try {
      const result = await supabaseDirect.testConnection();
      if (result.success) {
        addResult('✅ Supabase connection successful');
        addResult(`✅ Cameras table: ${result.camerasTable ? 'OK' : 'FAIL'}`);
        addResult(`✅ Photos table: ${result.photosTable ? 'OK' : 'FAIL'}`);
        addResult(`✅ Storage bucket: ${result.storageBucket ? 'OK' : 'FAIL'}`);
      }
    } catch (error) {
      addResult(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCameraCreation = async () => {
    addResult('📷 Testing camera creation...');
    
    try {
      const result = await supabaseDirect.createCamera({
        name: `Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        participantLimit: 20,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate',
      });
      
      if (result.success) {
        addResult(`✅ Camera created: ${result.cameraId}`);
        setTestCameraId(result.cameraId);
        
        // Test camera retrieval
        const getResult = await supabaseDirect.getCamera(result.cameraId);
        if (getResult.success) {
          addResult(`✅ Camera retrieved: ${getResult.camera.name}`);
        } else {
          addResult('❌ Camera retrieval failed');
        }
      } else {
        addResult('❌ Camera creation failed');
      }
    } catch (error) {
      addResult(`❌ Camera creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPhotoUpload = async () => {
    if (!testCameraId) {
      addResult('❌ No test camera available. Create a camera first.');
      return;
    }
    
    addResult('📸 Testing photo upload...');
    
    try {
      // Small test image (1x1 pixel JPEG)
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      const uploadResult = await supabaseDirect.uploadPhoto({
        cameraId: testCameraId,
        imageBase64: testImageBase64,
        mimeType: 'image/jpeg',
        userId: 'test-user',
        userName: 'Test User'
      });
      
      if (uploadResult.success) {
        addResult(`✅ Photo uploaded: ${uploadResult.photo.fileName}`);
        addResult(`📊 File size: ${uploadResult.photo.fileSize} bytes`);
        addResult(`🔗 URL: ${uploadResult.url.substring(0, 50)}...`);
        
        // Test photo listing
        const listResult = await supabaseDirect.listPhotos({ 
          cameraId: testCameraId,
          includeHidden: true 
        });
        
        addResult(`✅ Photo list: Found ${listResult.photos.length} photos`);
        
        // Check if our photo is in the list
        const ourPhoto = listResult.photos.find((p: any) => p.id === uploadResult.photo.id);
        if (ourPhoto) {
          addResult('🎉 Photo appears in list - UPLOAD SUCCESS!');
        } else {
          addResult('❌ Photo NOT in list - FAILED!');
        }
      } else {
        addResult('❌ Photo upload failed');
      }
    } catch (error) {
      addResult(`❌ Photo upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runCompleteTest = async () => {
    setTestResults([]);
    setIsLoading(true);
    setTestCameraId(null);
    
    try {
      addResult('🚀 Starting complete direct Supabase test...');
      
      // Step 1: Test connection
      await testConnection();
      
      // Step 2: Test camera creation
      await testCameraCreation();
      
      // Step 3: Test photo upload (if camera was created)
      if (testCameraId) {
        await testPhotoUpload();
      }
      
      addResult('✅ Complete test finished');
    } catch (error) {
      addResult(`❌ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setTestCameraId(null);
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

  return (
    <>
      <Stack.Screen options={{ title: 'Direct Supabase Test' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Direct Supabase Integration Test</Text>
          <Text style={styles.description}>
            Test Supabase directly without backend - bypasses tRPC timeout issues
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={runCompleteTest} 
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Running Tests...' : 'Run Complete Test'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testConnection}>
              <Text style={styles.buttonText}>Test Connection Only</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={debugDatabase}>
              <Text style={styles.buttonText}>Debug Database</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, !testCameraId && styles.buttonDisabled]} 
              onPress={testPhotoUpload}
              disabled={!testCameraId}
            >
              <Text style={styles.buttonText}>Test Photo Upload</Text>
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
            <Text style={styles.infoText}>✅ Direct Supabase connection (no backend)</Text>
            <Text style={styles.infoText}>✅ Camera creation in Supabase</Text>
            <Text style={styles.infoText}>✅ Photo upload to storage bucket</Text>
            <Text style={styles.infoText}>✅ Photo metadata in database</Text>
            <Text style={styles.infoText}>✅ Photo listing and retrieval</Text>
            <Text style={styles.infoText}>✅ End-to-end photo flow verification</Text>
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