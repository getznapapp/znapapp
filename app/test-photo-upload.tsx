import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { trpcClient } from '@/lib/trpc';

export default function TestPhotoUpload() {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testPhotoList = async () => {
    try {
      addResult('Testing photo list...');
      
      // Test with a known camera ID (you can change this to match your test camera)
      const testCameraId = 'test-camera-123';
      
      const result = await trpcClient.photo.list.query({ cameraId: testCameraId });
      
      addResult(`✅ Photo list success: Found ${result.photos.length} photos`);
      
      if (result.photos.length > 0) {
        result.photos.forEach((photo: any, index: number) => {
          addResult(`  Photo ${index + 1}: ${photo.fileName} (${photo.fileSize} bytes)`);
        });
      }
    } catch (error) {
      addResult(`❌ Photo list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testPhotoUpload = async () => {
    try {
      addResult('Testing photo upload...');
      
      // Create a small test image as base64
      const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      
      const testCameraId = 'test-camera-123';
      
      const result = await trpcClient.photo.upload.mutate({
        cameraId: testCameraId,
        imageBase64: testImageBase64,
        mimeType: 'image/jpeg',
        userId: 'test-user',
        userName: 'Test User'
      });
      
      if (result.success) {
        addResult(`✅ Photo upload success: ${result.photo.fileName}`);
        addResult(`   URL: ${result.url}`);
        addResult(`   File size: ${result.photo.fileSize} bytes`);
      } else {
        addResult('❌ Photo upload failed: No success flag');
      }
    } catch (error) {
      addResult(`❌ Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Test Photo Upload' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Photo Upload Test</Text>
        <Text style={styles.subtitle}>Test Supabase photo upload and retrieval</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testPhotoUpload}>
          <Text style={styles.buttonText}>Test Photo Upload</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testPhotoList}>
          <Text style={styles.buttonText}>Test Photo List</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {testResults.length === 0 && (
          <Text style={styles.noResults}>No tests run yet</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
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
  noResults: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});