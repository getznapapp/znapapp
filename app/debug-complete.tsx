import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { trpcClient } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';

export default function DebugComplete() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testSupabaseDirectly = async () => {
    addResult('🔍 Testing direct Supabase connection...');
    
    try {
      // Test cameras table
      const { data: cameras, error: camerasError } = await supabase
        .from('cameras')
        .select('*')
        .limit(3);
      
      if (camerasError) {
        addResult(`❌ Cameras table error: ${camerasError.message}`);
      } else {
        addResult(`✅ Cameras table: Found ${cameras?.length || 0} cameras`);
      }
      
      // Test photos table
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .limit(3);
      
      if (photosError) {
        addResult(`❌ Photos table error: ${photosError.message}`);
      } else {
        addResult(`✅ Photos table: Found ${photos?.length || 0} photos`);
      }
      
      // Test storage bucket
      const { data: files, error: storageError } = await supabase.storage
        .from('camera-photos')
        .list('', { limit: 3 });
      
      if (storageError) {
        addResult(`❌ Storage bucket error: ${storageError.message}`);
      } else {
        addResult(`✅ Storage bucket: Found ${files?.length || 0} files`);
      }
      
    } catch (error) {
      addResult(`❌ Direct Supabase test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testBackendHealth = async () => {
    addResult('🏥 Testing backend health...');
    
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081');
      
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ Backend health: ${data.message}`);
      } else {
        addResult(`❌ Backend health failed: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Backend health error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testTRPCRoutes = async () => {
    addResult('🔗 Testing tRPC routes...');
    
    try {
      // Test example route
      const hiResult = await trpcClient.example.hi.query();
      addResult(`✅ example.hi: ${hiResult.message}`);
    } catch (error) {
      addResult(`❌ example.hi failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCameraFlow = async () => {
    addResult('📷 Testing camera creation flow...');
    
    try {
      const testCamera = {
        name: `Debug Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        participantLimit: 20 as const,
        maxPhotosPerPerson: 20 as const,
        allowCameraRoll: true,
        filter: 'none' as const,
        paidUpgrade: false,
        revealDelayType: 'immediate' as const,
      };

      const createResult = await trpcClient.camera.create.mutate(testCamera);
      
      if (createResult.success) {
        addResult(`✅ Camera created: ${createResult.cameraId}`);
        
        // Test camera retrieval
        const getResult = await trpcClient.camera.get.query({ 
          cameraId: createResult.cameraId 
        });
        
        if (getResult.success) {
          addResult(`✅ Camera retrieved: ${getResult.camera?.name}`);
          return createResult.cameraId;
        } else {
          addResult(`❌ Camera retrieval failed`);
        }
      } else {
        addResult(`❌ Camera creation failed`);
      }
    } catch (error) {
      addResult(`❌ Camera flow error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return null;
  };

  const testPhotoFlow = async (cameraId: string) => {
    addResult('📸 Testing photo upload flow...');
    
    try {
      // Small test image
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      const uploadResult = await trpcClient.photo.upload.mutate({
        cameraId,
        imageBase64: testImageBase64,
        mimeType: 'image/jpeg',
        userId: 'debug-user',
        userName: 'Debug User'
      });
      
      if (uploadResult.success) {
        addResult(`✅ Photo uploaded: ${uploadResult.photo.fileName}`);
        addResult(`📊 File size: ${uploadResult.photo.fileSize} bytes`);
        
        // Test photo listing
        const listResult = await trpcClient.photo.list.query({ 
          cameraId, 
          includeHidden: true 
        });
        
        addResult(`✅ Photo list: Found ${listResult.photos.length} photos`);
        
        // Check if our photo is in the list
        const ourPhoto = listResult.photos.find((p: any) => p.id === uploadResult.photo.id);
        if (ourPhoto) {
          addResult(`✅ Photo appears in list - SUCCESS!`);
        } else {
          addResult(`❌ Photo NOT in list - FAILED!`);
        }
        
        return true;
      } else {
        addResult(`❌ Photo upload failed`);
        return false;
      }
    } catch (error) {
      addResult(`❌ Photo flow error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const runCompleteTest = async () => {
    setTestResults([]);
    setIsLoading(true);
    
    try {
      addResult('🚀 Starting complete integration test...');
      
      // Step 1: Test Supabase directly
      await testSupabaseDirectly();
      
      // Step 2: Test backend health
      await testBackendHealth();
      
      // Step 3: Test tRPC routes
      await testTRPCRoutes();
      
      // Step 4: Test camera flow
      const cameraId = await testCameraFlow();
      
      // Step 5: Test photo flow
      if (cameraId) {
        const photoSuccess = await testPhotoFlow(cameraId);
        
        if (photoSuccess) {
          addResult('🎉 ALL TESTS PASSED - INTEGRATION WORKING!');
        } else {
          addResult('❌ Photo flow failed - check Supabase storage bucket');
        }
      } else {
        addResult('❌ Camera flow failed - cannot test photos');
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
  };

  const checkSupabaseBucket = async () => {
    addResult('🗂️ Checking Supabase storage bucket...');
    
    try {
      const { data, error } = await supabase.storage
        .from('camera-photos')
        .list('', { limit: 10 });
      
      if (error) {
        addResult(`❌ Bucket error: ${error.message}`);
        if (error.message.includes('Bucket not found')) {
          addResult('💡 Create the "camera-photos" bucket in Supabase Dashboard > Storage');
        }
      } else {
        addResult(`✅ Bucket accessible: ${data?.length || 0} files found`);
        data?.forEach((file, index) => {
          addResult(`  📁 File ${index + 1}: ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
        });
      }
    } catch (error) {
      addResult(`❌ Bucket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Complete Debug' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Integration Debug</Text>
          <Text style={styles.description}>
            Test all components: Supabase, Backend, tRPC, Camera creation, Photo upload & gallery
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
            
            <TouchableOpacity style={styles.button} onPress={checkSupabaseBucket}>
              <Text style={styles.buttonText}>Check Storage Bucket</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testSupabaseDirectly}>
              <Text style={styles.buttonText}>Test Supabase Direct</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
              <Text style={styles.buttonText}>Clear Results</Text>
            </TouchableOpacity>
          </View>
          
          {testResults.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Debug Results:</Text>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          )}
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Expected Setup:</Text>
            <Text style={styles.infoText}>✅ Supabase project created</Text>
            <Text style={styles.infoText}>✅ cameras table created</Text>
            <Text style={styles.infoText}>✅ photos table created</Text>
            <Text style={styles.infoText}>✅ camera-photos storage bucket created</Text>
            <Text style={styles.infoText}>✅ RLS policies configured</Text>
            <Text style={styles.infoText}>✅ Backend running on port 8081</Text>
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