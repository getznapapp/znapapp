import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function TestSimpleFlow() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testSimpleFlow = async () => {
    setTestResults([]);
    setIsLoading(true);
    
    try {
      addResult('🚀 Starting simple camera flow test...');
      
      // Step 1: Create camera
      addResult('📷 Creating camera...');
      const createResult = await supabaseDirect.createCamera({
        name: `Simple Test ${Date.now()}`,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        participantLimit: 20,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        filter: 'none',
        paidUpgrade: false,
        revealDelayType: 'immediate',
      });
      
      if (!createResult.success) {
        addResult('❌ Camera creation failed');
        return;
      }
      
      const cameraId = createResult.cameraId;
      addResult(`✅ Camera created with ID: ${cameraId}`);
      
      // Step 2: Immediately try to retrieve the camera
      addResult('🔍 Retrieving camera immediately...');
      const getResult = await supabaseDirect.getCamera(cameraId);
      
      if (getResult.success) {
        addResult(`✅ Camera retrieved: ${getResult.camera.name}`);
      } else {
        addResult('❌ Camera retrieval failed immediately after creation!');
        addResult('This indicates a problem with camera creation or ID generation');
        return;
      }
      
      // Step 3: Wait 2 seconds and try again
      addResult('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addResult('🔍 Retrieving camera after 2 seconds...');
      const getResult2 = await supabaseDirect.getCamera(cameraId);
      
      if (getResult2.success) {
        addResult(`✅ Camera still retrievable: ${getResult2.camera.name}`);
      } else {
        addResult('❌ Camera retrieval failed after 2 seconds!');
        return;
      }
      
      // Step 4: List all cameras to see what's in the database
      addResult('📋 Listing all cameras in database...');
      const listResult = await supabaseDirect.listAllCameras();
      addResult(`📊 Found ${listResult.count} cameras total`);
      
      const ourCamera = listResult.cameras.find((c: any) => c.id === cameraId);
      if (ourCamera) {
        addResult(`✅ Our camera found in list: ${ourCamera.name}`);
      } else {
        addResult('❌ Our camera NOT found in list!');
        addResult('Available cameras:');
        listResult.cameras.forEach((c: any, i: number) => {
          addResult(`  ${i + 1}. ${c.name} (${c.id})`);
        });
      }
      
      addResult('🎉 Simple flow test completed successfully!');
    } catch (error) {
      addResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Simple flow test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Simple Flow Test' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Simple Camera Flow Test</Text>
          <Text style={styles.description}>
            Test basic camera creation and retrieval to identify the root issue
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={testSimpleFlow} 
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Running Test...' : 'Run Simple Test'}
              </Text>
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