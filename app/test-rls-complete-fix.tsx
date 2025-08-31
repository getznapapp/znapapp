import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabaseDirect } from '@/lib/supabase-direct';
import { generateUUID } from '@/lib/uuid';

export default function TestRLSCompleteFix() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting complete RLS fix test...');
      
      // Test 1: Test Supabase connection
      addResult('📡 Testing Supabase connection...');
      try {
        const connectionTest = await supabaseDirect.testConnection();
        if (connectionTest.success) {
          addResult('✅ Supabase connection successful');
          addResult(`📊 Found ${connectionTest.camerasCount} cameras, ${connectionTest.photosCount} photos`);
        } else {
          addResult('❌ Supabase connection failed');
          return;
        }
      } catch (error) {
        addResult(`❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }

      // Test 2: Create a test camera
      addResult('📷 Creating test camera...');
      const testCameraId = generateUUID();
      try {
        const cameraResult = await supabaseDirect.createCamera({
          name: `RLS Test Camera ${Date.now()}`,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          participantLimit: 10,
          maxPhotosPerPerson: 20,
          allowCameraRoll: true,
          filter: 'none',
          paidUpgrade: false,
          revealDelayType: 'immediate',
          cameraId: testCameraId,
        });
        
        if (cameraResult.success) {
          addResult(`✅ Camera created successfully: ${cameraResult.camera.name}`);
        } else {
          addResult('❌ Camera creation failed');
          return;
        }
      } catch (error) {
        addResult(`❌ Camera creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }

      // Test 3: Test photo upload with minimal data
      addResult('📸 Testing photo upload...');
      try {
        // Create a minimal test image (1x1 pixel red PNG in base64)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const uploadResult = await supabaseDirect.uploadPhoto({
          cameraId: testCameraId,
          imageBase64: testImageBase64,
          mimeType: 'image/png',
          userId: 'test-user',
          userName: 'Test User',
        });
        
        if (uploadResult.success) {
          addResult('✅ Photo upload successful!');
          addResult(`📷 Photo URL: ${uploadResult.url}`);
          addResult('🎉 RLS FIX IS WORKING!');
        } else {
          addResult('❌ Photo upload failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addResult(`❌ Photo upload failed: ${errorMessage}`);
        
        if (errorMessage.includes('row-level security policy')) {
          addResult('🚨 RLS POLICY ERROR STILL EXISTS!');
          addResult('💡 Please run the SUPABASE_COMPLETE_RLS_FIX.sql script in your Supabase dashboard');
        } else if (errorMessage.includes('Bucket not found')) {
          addResult('🚨 STORAGE BUCKET ERROR!');
          addResult('💡 Please create the "camera-photos" bucket in Supabase Storage');
        }
      }

      // Test 4: List photos to verify they were saved
      addResult('📋 Testing photo listing...');
      try {
        const photosResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        if (photosResult.success) {
          addResult(`✅ Photo listing successful: ${photosResult.photos.length} photos found`);
        } else {
          addResult('❌ Photo listing failed');
        }
      } catch (error) {
        addResult(`❌ Photo listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      addResult('🏁 Test completed!');
      
    } catch (error) {
      addResult(`💥 Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const showInstructions = () => {
    Alert.alert(
      'RLS Fix Instructions',
      '1. Copy the SUPABASE_COMPLETE_RLS_FIX.sql file content\n\n' +
      '2. Go to your Supabase dashboard\n\n' +
      '3. Navigate to SQL Editor\n\n' +
      '4. Paste the entire script and run it\n\n' +
      '5. Come back and run this test\n\n' +
      '6. If the test passes, your RLS issues are fixed!',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RLS Complete Fix Test</Text>
      <Text style={styles.subtitle}>Test if the RLS policies are working correctly</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runCompleteTest}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '🧪 Running Test...' : '🧪 Run Complete Test'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={showInstructions}
        >
          <Text style={styles.buttonText}>📋 Show Instructions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>🗑️ Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 5,
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  resultText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
});