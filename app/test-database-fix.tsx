import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabaseDirect } from '@/lib/supabase-direct';
import { generateUUID } from '@/lib/uuid';

export default function TestDatabaseFix() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabaseConnection = async () => {
    try {
      setStatus('Testing database connection...');
      addResult('Starting database connection test');
      
      const result = await supabaseDirect.testConnection();
      
      if (result.success) {
        addResult('✅ Database connection successful');
        addResult(`Cameras table: ${result.camerasTable ? 'OK' : 'FAIL'}`);
        addResult(`Photos table: ${result.photosTable ? 'OK' : 'FAIL'}`);
        addResult(`Storage bucket: ${result.storageBucket ? 'OK' : 'FAIL'}`);
        setStatus('Database connection test passed');
      } else {
        addResult('❌ Database connection failed');
        setStatus('Database connection test failed');
      }
    } catch (error) {
      addResult(`❌ Database connection error: ${error}`);
      setStatus('Database connection test failed');
    }
  };

  const testCameraCreation = async () => {
    try {
      setStatus('Testing camera creation...');
      addResult('Starting camera creation test');
      
      const testCamera = {
        name: `Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        participantLimit: 10,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: '24h',
      };
      
      const result = await supabaseDirect.createCamera(testCamera);
      
      if (result.success) {
        addResult(`✅ Camera created successfully: ${result.cameraId}`);
        addResult(`Camera name: ${result.camera.name}`);
        setStatus('Camera creation test passed');
        
        // Test retrieving the camera
        addResult('Testing camera retrieval...');
        const getResult = await supabaseDirect.getCamera(result.cameraId);
        
        if (getResult.success) {
          addResult(`✅ Camera retrieved successfully: ${getResult.camera?.name}`);
        } else {
          addResult('❌ Camera retrieval failed');
        }
      } else {
        addResult('❌ Camera creation failed');
        setStatus('Camera creation test failed');
      }
    } catch (error) {
      addResult(`❌ Camera creation error: ${error}`);
      setStatus('Camera creation test failed');
    }
  };

  const testPhotoUpload = async () => {
    try {
      setStatus('Testing photo upload...');
      addResult('Starting photo upload test');
      
      // First create a test camera
      const testCamera = {
        name: `Photo Test Camera ${Date.now()}`,
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        participantLimit: 10,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: '24h',
      };
      
      const cameraResult = await supabaseDirect.createCamera(testCamera);
      
      if (!cameraResult.success) {
        addResult('❌ Failed to create test camera for photo upload');
        return;
      }
      
      addResult(`✅ Test camera created: ${cameraResult.cameraId}`);
      
      // Create a simple test image (1x1 red pixel)
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
      
      const photoResult = await supabaseDirect.uploadPhoto({
        cameraId: cameraResult.cameraId,
        imageBase64: testImageBase64,
        mimeType: 'image/jpeg',
        userId: 'test-user',
        userName: 'Test User',
      });
      
      if (photoResult.success) {
        addResult(`✅ Photo uploaded successfully`);
        addResult(`Photo URL: ${photoResult.url}`);
        setStatus('Photo upload test passed');
      } else {
        addResult('❌ Photo upload failed');
        setStatus('Photo upload test failed');
      }
    } catch (error) {
      addResult(`❌ Photo upload error: ${error}`);
      setStatus('Photo upload test failed');
    }
  };

  const clearResults = () => {
    setResults([]);
    setStatus('Ready to test');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Database Fix Test</Text>
      
      <Text style={styles.status}>Status: {status}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testDatabaseConnection}>
          <Text style={styles.buttonText}>Test Database Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testCameraCreation}>
          <Text style={styles.buttonText}>Test Camera Creation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPhotoUpload}>
          <Text style={styles.buttonText}>Test Photo Upload</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
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
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    color: '#1976d2',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    minHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
    fontFamily: 'monospace',
  },
});