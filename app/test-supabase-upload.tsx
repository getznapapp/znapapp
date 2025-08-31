import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { uploadImageToCloud } from '@/lib/image-upload';

export default function TestSupabaseUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBucketExists = async () => {
    setIsLoading(true);
    addResult('Testing if camera-photos bucket exists...');
    
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        addResult(`❌ Error listing buckets: ${error.message}`);
        return;
      }
      
      const buckets = data || [];
      addResult(`📦 Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`);
      
      const cameraPhotosBucket = buckets.find(b => b.name === 'camera-photos');
      if (cameraPhotosBucket) {
        addResult('✅ camera-photos bucket exists!');
        addResult(`   - Public: ${cameraPhotosBucket.public}`);
        addResult(`   - Created: ${cameraPhotosBucket.created_at}`);
      } else {
        addResult('❌ camera-photos bucket NOT found!');
        addResult('   Please create it in your Supabase dashboard');
      }
    } catch (error) {
      addResult(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUploadDummyImage = async () => {
    setIsLoading(true);
    addResult('Testing dummy image upload...');
    
    try {
      // Create a simple base64 image (1x1 red pixel)
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const fileName = `test_${Date.now()}.png`;
      
      addResult(`📤 Uploading ${fileName}...`);
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(dummyBase64, 'base64');
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('camera-photos')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: false,
        });
      
      if (uploadError) {
        addResult(`❌ Upload failed: ${uploadError.message}`);
        return;
      }
      
      addResult('✅ Upload successful!');
      addResult(`   - Path: ${uploadData.path}`);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('camera-photos')
        .getPublicUrl(fileName);
      
      addResult(`🔗 Public URL: ${urlData.publicUrl}`);
      
    } catch (error) {
      addResult(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testImageUploadFunction = async () => {
    setIsLoading(true);
    addResult('Testing uploadImageToCloud function...');
    
    try {
      // Create a dummy data URI
      const dummyDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const result = await uploadImageToCloud(
        dummyDataUri,
        'test-camera-123',
        'test-user',
        'Test User'
      );
      
      if (result.success) {
        addResult('✅ uploadImageToCloud successful!');
        addResult(`   - URL: ${result.url}`);
        addResult(`   - Photo ID: ${result.photoData?.id}`);
      } else {
        addResult(`❌ uploadImageToCloud failed: ${result.error}`);
      }
      
    } catch (error) {
      addResult(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestCamera = async () => {
    setIsLoading(true);
    addResult('Creating test camera...');
    
    try {
      const { useCameraStore } = await import('@/store/camera-store');
      const { addCamera, setCurrentCamera } = useCameraStore.getState();
      
      const testCamera = addCamera({
        name: 'Test Camera for Upload',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        maxPhotosPerPerson: 50,
        allowCameraRoll: true,
        revealDelayType: 'immediate' as const,
        filter: 'none' as const,
        maxGuests: 50,
        isActive: true,
        paidUpgrade: false,
      });
      
      setCurrentCamera(testCamera);
      
      addResult('✅ Test camera created successfully!');
      addResult(`   - Camera ID: ${testCamera.id}`);
      addResult(`   - Camera Name: ${testCamera.name}`);
      addResult('   - Set as current camera for testing');
      
    } catch (error) {
      addResult(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Upload Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={testBucketExists}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Bucket Exists</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={testUploadDummyImage}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Direct Upload</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={testImageUploadFunction}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Upload Function</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.createButton]} 
          onPress={createTestCamera}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Create Test Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {isLoading && (
          <Text style={styles.loadingText}>⏳ Testing...</Text>
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
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#10B981', // Green color
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
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
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});