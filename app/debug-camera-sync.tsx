import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { useCameraStore } from '@/store/camera-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DebugCameraSyncScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { cameras, loadCameras, saveCameras } = useCameraStore();

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const debugCameraSync = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== DEBUGGING CAMERA SYNC ===');
      
      // 1. Check local storage directly
      addResult('Checking local storage...');
      const storedData = await AsyncStorage.getItem('znap-cameras');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        addResult(`Local storage has ${parsedData.length} cameras:`);
        parsedData.forEach((camera: any, index: number) => {
          addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
        });
      } else {
        addResult('No data in local storage');
      }
      
      // 2. Check camera store state
      addResult(`Camera store has ${cameras.length} cameras:`);
      cameras.forEach((camera, index) => {
        addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
      });
      
      // 3. Check Supabase database
      addResult('Checking Supabase database...');
      try {
        const supabaseResult = await supabaseDirect.listAllCameras();
        addResult(`Supabase has ${supabaseResult.count} cameras:`);
        supabaseResult.cameras.forEach((camera: any, index: number) => {
          addResult(`  ${index + 1}. ${camera.name} (${camera.id})`);
        });
      } catch (error) {
        addResult(`Failed to check Supabase: ${error}`);
      }
      
      // 4. Find mismatches
      addResult('=== ANALYZING MISMATCHES ===');
      
      // Check if local cameras exist in Supabase
      for (const localCamera of cameras) {
        try {
          const supabaseResult = await supabaseDirect.getCamera(localCamera.id);
          if (supabaseResult.success) {
            addResult(`✓ Camera ${localCamera.name} (${localCamera.id}) exists in both`);
          } else {
            addResult(`✗ Camera ${localCamera.name} (${localCamera.id}) missing from Supabase`);
          }
        } catch (error) {
          addResult(`✗ Error checking ${localCamera.name}: ${error}`);
        }
      }
      
      addResult('=== SYNC ANALYSIS COMPLETE ===');
      
    } catch (error) {
      addResult(`Debug failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fixCameraSync = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== FIXING CAMERA SYNC ===');
      
      // 1. Get all cameras from Supabase
      const supabaseResult = await supabaseDirect.listAllCameras();
      addResult(`Found ${supabaseResult.count} cameras in Supabase`);
      
      // 2. Clear local storage and reload
      addResult('Clearing local storage...');
      await AsyncStorage.removeItem('znap-cameras');
      
      // 3. Reload cameras from store (should be empty now)
      await loadCameras();
      addResult('Local storage cleared and reloaded');
      
      // 4. For each Supabase camera, add to local store
      const { addCamera } = useCameraStore.getState();
      
      for (const supabaseCamera of supabaseResult.cameras) {
        try {
          addResult(`Adding camera to local store: ${supabaseCamera.name}`);
          
          const localCamera = addCamera({
            name: supabaseCamera.name,
            startDate: new Date(supabaseCamera.createdAt),
            endDate: new Date(supabaseCamera.endDate),
            maxPhotosPerPerson: supabaseCamera.maxPhotosPerPerson || 20,
            allowCameraRoll: true,
            revealDelayType: supabaseCamera.revealDelayType || '24h',
            customRevealAt: supabaseCamera.customRevealAt ? new Date(supabaseCamera.customRevealAt) : undefined,
            filter: 'none',
            maxGuests: 20,
            isActive: true,
            paidUpgrade: false,
          }, supabaseCamera.id); // Use the Supabase camera ID
          
          addResult(`✓ Added: ${localCamera.name} (${localCamera.id})`);
        } catch (error) {
          addResult(`✗ Failed to add ${supabaseCamera.name}: ${error}`);
        }
      }
      
      // 5. Save the synchronized data
      await saveCameras();
      addResult('Synchronized data saved to local storage');
      
      addResult('=== SYNC FIX COMPLETE ===');
      
    } catch (error) {
      addResult(`Fix failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalStorage = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Clearing local storage...');
      await AsyncStorage.removeItem('znap-cameras');
      await loadCameras();
      addResult('Local storage cleared and cameras reloaded');
    } catch (error) {
      addResult(`Failed to clear storage: ${error}`);
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
          title: 'Debug Camera Sync',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={debugCameraSync}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Debug Camera Sync</Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, styles.fixButton, isLoading && styles.buttonDisabled]}
          onPress={fixCameraSync}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Fix Camera Sync</Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, styles.dangerButton, isLoading && styles.buttonDisabled]}
          onPress={clearLocalStorage}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Clear Local Storage</Text>
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
          <Text style={styles.loadingText}>Running operation...</Text>
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
  fixButton: {
    backgroundColor: '#10B981', // Green
  },
  dangerButton: {
    backgroundColor: '#EF4444', // Red
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