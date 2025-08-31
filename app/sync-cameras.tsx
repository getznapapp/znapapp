import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';
import { cameraUtils } from '@/lib/camera-utils';
import { useCameraStore } from '@/store/camera-store';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function SyncCamerasScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { cameras } = useCameraStore();

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const syncCameras = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== SYNCING LOCAL CAMERAS TO DATABASE ===');
      addResult(`Found ${cameras.length} local cameras`);
      
      for (const camera of cameras) {
        addResult(`Processing camera: ${camera.name} (${camera.id})`);
        
        // Check if this is a UUID format camera
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(camera.id);
        
        if (!isUUID) {
          addResult(`  Skipping old format camera: ${camera.id}`);
          continue;
        }
        
        try {
          // Check if camera exists in database
          const existsResult = await supabaseDirect.getCamera(camera.id);
          
          if (existsResult.success) {
            addResult(`  Camera already exists in database`);
            continue;
          }
          
          // Create camera in database
          addResult(`  Creating camera in database...`);
          const createResult = await supabaseDirect.createCamera({
            name: camera.name,
            endTime: camera.endDate,
            participantLimit: camera.maxGuests,
            maxPhotosPerPerson: camera.maxPhotosPerPerson,
            allowCameraRoll: camera.allowCameraRoll,
            filter: camera.filter,
            paidUpgrade: camera.paidUpgrade,
            revealDelayType: camera.revealDelayType,
            customRevealAt: camera.customRevealAt,
            cameraId: camera.id, // Use the existing camera ID
          });
          
          if (createResult.success) {
            addResult(`  ✅ Camera synced successfully`);
          } else {
            addResult(`  ❌ Failed to sync camera`);
          }
        } catch (error) {
          addResult(`  ❌ Error syncing camera: ${error}`);
        }
      }
      
      addResult('=== SYNC COMPLETE ===');
      
      // List all cameras in database after sync
      addResult('Listing all cameras in database...');
      try {
        const listResult = await supabaseDirect.listAllCameras();
        addResult(`Database now has ${listResult.count} cameras:`);
        listResult.cameras.forEach((camera: any, index: number) => {
          addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
        });
      } catch (listError) {
        addResult(`Failed to list cameras: ${listError}`);
      }
      
    } catch (error) {
      addResult(`Sync failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Sync Cameras',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={syncCameras}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            Sync Local Cameras to Database ({cameras.length} cameras)
          </Text>
        </Pressable>
        
        <Pressable
          style={styles.clearButton}
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </Pressable>
      </View>
      
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {isLoading && (
          <Text style={styles.loadingText}>Syncing cameras...</Text>
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
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  clearButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  resultText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});