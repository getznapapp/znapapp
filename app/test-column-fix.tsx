import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function TestColumnFix() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, message]);
  };

  const testDatabaseColumns = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('=== Testing Database Column Names ===');
      
      // Test 1: Try to list photos with correct column names
      addResult('Test 1: Testing photo list with snake_case columns...');
      
      const testCameraId = 'a51f748d-197c-427b-9606-03b77c6d66f3'; // Use a known camera ID from logs
      
      try {
        const photoResult = await supabaseDirect.listPhotos({
          cameraId: testCameraId,
          includeHidden: true,
        });
        
        addResult(`✅ Photo list successful: ${photoResult.photos.length} photos found`);
        addResult(`Total photos: ${photoResult.total}, Hidden: ${photoResult.hiddenCount}`);
        
        if (photoResult.photos.length > 0) {
          const firstPhoto = photoResult.photos[0];
          addResult(`First photo columns: ${Object.keys(firstPhoto).join(', ')}`);
        }
      } catch (photoError) {
        addResult(`❌ Photo list failed: ${photoError}`);
      }
      
      // Test 2: Test connection to verify table structure
      addResult('\\nTest 2: Testing Supabase connection...');
      
      try {
        const connectionResult = await supabaseDirect.testConnection();
        addResult(`✅ Connection test successful`);
        addResult(`Cameras: ${connectionResult.camerasCount}, Photos: ${connectionResult.photosCount}`);
      } catch (connectionError) {
        addResult(`❌ Connection test failed: ${connectionError}`);
      }
      
      // Test 3: List all photos to see actual column structure
      addResult('\\nTest 3: Listing all photos to check column structure...');
      
      try {
        const allPhotosResult = await supabaseDirect.listAllPhotos();
        addResult(`✅ All photos list successful: ${allPhotosResult.count} photos total`);
        
        if (allPhotosResult.photos.length > 0) {
          const samplePhoto = allPhotosResult.photos[0];
          addResult(`Sample photo structure:`);
          Object.keys(samplePhoto).forEach(key => {
            addResult(`  - ${key}: ${typeof samplePhoto[key]}`);
          });
        }
      } catch (allPhotosError) {
        addResult(`❌ All photos list failed: ${allPhotosError}`);
      }
      
      addResult('\\n=== Test Complete ===');
      
    } catch (error) {
      addResult(`❌ Test failed with error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Column Fix Test</Text>
      <Text style={styles.subtitle}>
        Testing if database queries use correct snake_case column names
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testDatabaseColumns}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Run Column Test'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.results}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  results: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    minHeight: 200,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#333',
  },
});