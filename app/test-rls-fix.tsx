import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { generateUUID } from '@/lib/uuid';

export default function TestRLSFix() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testRLSFix = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔧 Starting RLS fix verification...');
      
      // Test 1: Connection test
      addResult('📡 Testing Supabase connection...');
      try {
        const connectionResult = await supabaseDirect.testConnection();
        if (connectionResult.success) {
          addResult('✅ Supabase connection successful');
          addResult(`📊 Found ${connectionResult.camerasCount} cameras, ${connectionResult.photosCount} photos`);
        } else {
          addResult('❌ Supabase connection failed');
        }
      } catch (error) {
        addResult(`❌ Connection test failed: ${error}`);
      }

      // Test 2: Create test camera
      addResult('📷 Testing camera creation...');
      const testCameraId = generateUUID();
      try {
        const cameraResult = await supabaseDirect.createCamera({
          name: 'RLS Test Camera',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 10,
          maxPhotosPerPerson: 20,
          allowCameraRoll: false,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: 'immediate',
          cameraId: testCameraId,
        });
        
        if (cameraResult.success) {
          addResult('✅ Camera creation successful');
          addResult(`📷 Camera ID: ${cameraResult.cameraId}`);
        } else {
          addResult('❌ Camera creation failed');
        }
      } catch (error) {
        addResult(`❌ Camera creation failed: ${error}`);
      }

      // Test 3: Create test photo
      addResult('📸 Testing photo upload...');
      try {
        // Create a simple base64 test image (1x1 pixel red PNG)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const photoResult = await supabaseDirect.uploadPhoto({
          cameraId: testCameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-user',
          userName: 'Test User',
        });
        
        if (photoResult.success) {
          addResult('✅ Photo upload successful');
          addResult(`📸 Photo URL: ${photoResult.url}`);
        } else {
          addResult('❌ Photo upload failed');
        }
      } catch (error) {
        addResult(`❌ Photo upload failed: ${error}`);
        
        // Check if it's an RLS error
        if (error instanceof Error && error.message.includes('row-level security policy')) {
          addResult('🚨 RLS ERROR DETECTED! The RLS fix script needs to be run in Supabase.');
          addResult('📋 Please run the SUPABASE_RLS_COMPLETE_FIX.sql script in your Supabase SQL editor.');
          Alert.alert(
            'RLS Error Detected',
            'The RLS fix script needs to be run in your Supabase dashboard. Please run the SUPABASE_RLS_COMPLETE_FIX.sql script.',
            [{ text: 'OK' }]
          );
        }
      }

      // Test 4: List photos
      addResult('📋 Testing photo listing...');
      try {
        const photosResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        if (photosResult.success) {
          addResult(`✅ Photo listing successful: ${photosResult.total} photos found`);
        } else {
          addResult('❌ Photo listing failed');
        }
      } catch (error) {
        addResult(`❌ Photo listing failed: ${error}`);
      }

      // Test 5: Get camera
      addResult('🔍 Testing camera retrieval...');
      try {
        const getCameraResult = await supabaseDirect.getCamera(testCameraId);
        
        if (getCameraResult.success) {
          addResult('✅ Camera retrieval successful');
          addResult(`📷 Camera name: ${getCameraResult.camera?.name}`);
        } else {
          addResult('❌ Camera retrieval failed');
        }
      } catch (error) {
        addResult(`❌ Camera retrieval failed: ${error}`);
      }

      addResult('🎉 RLS fix verification completed!');
      
    } catch (error) {
      addResult(`💥 Test suite failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>RLS Fix Test</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          This test verifies that the RLS (Row Level Security) fix has been applied correctly to your Supabase database.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testRLSFix}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Run RLS Fix Test'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearResults}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Clear Results
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  resultItem: {
    marginBottom: theme.spacing.sm,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});