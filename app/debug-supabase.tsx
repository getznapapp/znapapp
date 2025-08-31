import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function DebugSupabasePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    addResult('🔍 Testing Supabase connection...');
    
    try {
      // Test 1: Basic connection
      const { data, error } = await supabase
        .from('cameras')
        .select('count')
        .limit(1);
      
      if (error) {
        addResult(`❌ Supabase connection failed: ${error.message}`);
        addResult(`📋 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addResult('✅ Supabase connection successful');
      }
    } catch (error) {
      addResult(`❌ Supabase test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testCamerasTable = async () => {
    setIsLoading(true);
    addResult('📋 Testing cameras table...');
    
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .limit(5);
      
      if (error) {
        addResult(`❌ Cameras table error: ${error.message}`);
        addResult(`📋 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addResult(`✅ Cameras table accessible: Found ${data?.length || 0} cameras`);
        if (data && data.length > 0) {
          data.forEach((camera, index) => {
            addResult(`  📷 Camera ${index + 1}: ${camera.name} (${camera.id})`);
          });
        }
      }
    } catch (error) {
      addResult(`❌ Cameras table test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testPhotosTable = async () => {
    setIsLoading(true);
    addResult('📸 Testing photos table...');
    
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .limit(5);
      
      if (error) {
        addResult(`❌ Photos table error: ${error.message}`);
        addResult(`📋 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addResult(`✅ Photos table accessible: Found ${data?.length || 0} photos`);
        if (data && data.length > 0) {
          data.forEach((photo, index) => {
            addResult(`  📷 Photo ${index + 1}: ${photo.fileName} (${photo.cameraId})`);
          });
        }
      }
    } catch (error) {
      addResult(`❌ Photos table test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testStorageBucket = async () => {
    setIsLoading(true);
    addResult('🗂️ Testing storage bucket...');
    
    try {
      const { data, error } = await supabase.storage
        .from('camera-photos')
        .list('', { limit: 5 });
      
      if (error) {
        addResult(`❌ Storage bucket error: ${error.message}`);
        addResult(`📋 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addResult(`✅ Storage bucket accessible: Found ${data?.length || 0} files`);
        if (data && data.length > 0) {
          data.forEach((file, index) => {
            addResult(`  📁 File ${index + 1}: ${file.name} (${file.metadata?.size || 'unknown size'})`);
          });
        }
      }
    } catch (error) {
      addResult(`❌ Storage bucket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testBackendHealth = async () => {
    setIsLoading(true);
    addResult('🏥 Testing backend health...');
    
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081');
      
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();
      
      if (response.ok) {
        addResult(`✅ Backend health check passed: ${data.message}`);
      } else {
        addResult(`❌ Backend health check failed: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Backend health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const testSupabaseBackend = async () => {
    setIsLoading(true);
    addResult('🔗 Testing backend Supabase connection...');
    
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081');
      
      const response = await fetch(`${baseUrl}/api/supabase-test`);
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        addResult(`✅ Backend Supabase connection successful: ${data.message}`);
      } else {
        addResult(`❌ Backend Supabase connection failed: ${data.error || data.message}`);
      }
    } catch (error) {
      addResult(`❌ Backend Supabase test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult('🚀 Starting comprehensive Supabase debug tests...');
    
    await testBackendHealth();
    await testSupabaseBackend();
    await testSupabaseConnection();
    await testCamerasTable();
    await testPhotosTable();
    await testStorageBucket();
    
    addResult('🎉 All debug tests completed!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Debug Supabase' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Supabase Debug Console</Text>
          <Text style={styles.description}>
            Test all aspects of Supabase integration including tables, storage, and backend connection.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={runAllTests} disabled={isLoading}>
              <Text style={styles.buttonText}>Run All Tests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testSupabaseConnection} disabled={isLoading}>
              <Text style={styles.buttonText}>Test Connection</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testCamerasTable} disabled={isLoading}>
              <Text style={styles.buttonText}>Test Cameras Table</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testPhotosTable} disabled={isLoading}>
              <Text style={styles.buttonText}>Test Photos Table</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={testStorageBucket} disabled={isLoading}>
              <Text style={styles.buttonText}>Test Storage</Text>
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
});