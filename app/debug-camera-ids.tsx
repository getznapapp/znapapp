import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { useCameraStore } from '@/store/camera-store';
import { trpcClient } from '@/lib/trpc';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function DebugCameraIds() {
  const { cameras } = useCameraStore();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const isUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  };

  const testCameraId = async (cameraId: string) => {
    addResult(`\n🔍 Testing camera ID: ${cameraId}`);
    addResult(`Format: ${isUUID(cameraId) ? 'UUID (New)' : 'Legacy (Old)'}`);

    // Test backend camera retrieval
    try {
      const result = await trpcClient.camera.get.query({ cameraId });
      if (result.success) {
        addResult(`✅ Backend retrieval: SUCCESS`);
      } else {
        addResult(`⚠️ Backend retrieval: ${result.error}`);
      }
    } catch (error) {
      addResult(`❌ Backend retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test direct Supabase retrieval
    try {
      const result = await supabaseDirect.getCamera(cameraId);
      if (result.success) {
        addResult(`✅ Direct Supabase retrieval: SUCCESS`);
      } else {
        addResult(`⚠️ Direct Supabase retrieval: FAILED`);
      }
    } catch (error) {
      addResult(`❌ Direct Supabase retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test photo listing
    try {
      const result = await trpcClient.photo.list.query({ cameraId });
      addResult(`✅ Photo listing: Found ${result.photos.length} photos`);
    } catch (error) {
      addResult(`❌ Photo listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAllCameras = async () => {
    setTestResults([]);
    setIsLoading(true);

    try {
      addResult('🚀 Starting camera ID compatibility test...');
      addResult(`Found ${cameras.length} cameras in local storage\n`);

      for (const camera of cameras) {
        await testCameraId(camera.id);
      }

      addResult('\n🎉 All camera tests completed!');
    } catch (error) {
      addResult(`❌ Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Debug Camera IDs' }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera ID Compatibility Test</Text>
          <Text style={styles.description}>
            This page helps debug issues with old vs new camera ID formats.
            Old format IDs (like camera_123_ABC) cannot be used with Supabase.
            New format IDs are UUIDs that work with the backend.
          </Text>

          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Local Cameras:</Text>
            {cameras.map((camera, index) => (
              <View key={camera.id} style={styles.cameraItem}>
                <Text style={styles.cameraName}>{camera.name}</Text>
                <Text style={styles.cameraId}>ID: {camera.id}</Text>
                <Text style={[
                  styles.cameraFormat,
                  isUUID(camera.id) ? styles.formatNew : styles.formatOld
                ]}>
                  {isUUID(camera.id) ? '✅ UUID (Compatible)' : '⚠️ Legacy (Limited)'}
                </Text>
              </View>
            ))}
            {cameras.length === 0 && (
              <Text style={styles.noCameras}>No cameras found in local storage</Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={testAllCameras}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Testing...' : 'Test All Cameras'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearResults}
            >
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
            <Text style={styles.infoTitle}>Understanding Camera ID Formats:</Text>
            <Text style={styles.infoSubtitle}>UUID Format (New):</Text>
            <Text style={styles.infoText}>• Example: 12345678-1234-4567-8901-123456789012</Text>
            <Text style={styles.infoText}>• ✅ Works with Supabase backend</Text>
            <Text style={styles.infoText}>• ✅ Supports photo upload/sync</Text>
            <Text style={styles.infoText}>• ✅ Full feature support</Text>

            <Text style={styles.infoSubtitle}>Legacy Format (Old):</Text>
            <Text style={styles.infoText}>• Example: camera_1753222088235_FKJ5T3</Text>
            <Text style={styles.infoText}>• ⚠️ Local storage only</Text>
            <Text style={styles.infoText}>• ⚠️ No backend sync</Text>
            <Text style={styles.infoText}>• ⚠️ Limited features</Text>

            <Text style={styles.infoSubtitle}>Solution:</Text>
            <Text style={styles.infoText}>• Create new cameras for full functionality</Text>
            <Text style={styles.infoText}>• Old cameras will continue to work locally</Text>
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
  statsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cameraItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cameraName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  cameraId: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: theme.spacing.xs,
  },
  cameraFormat: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
  },
  formatNew: {
    color: theme.colors.success,
  },
  formatOld: {
    color: theme.colors.warning,
  },
  noCameras: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  infoSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
});