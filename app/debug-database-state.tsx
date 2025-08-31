import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function DebugDatabaseStateScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDatabaseState = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== CHECKING DATABASE STATE ===');
      
      // Check if tables exist
      addResult('Checking if tables exist...');
      
      // Check cameras table
      try {
        const { data: camerasData, error: camerasError, count: camerasCount } = await supabase
          .from('cameras')
          .select('*', { count: 'exact' });
        
        if (camerasError) {
          addResult(`Cameras table ERROR: ${camerasError.message}`);
          addResult(`Error code: ${camerasError.code}`);
          addResult(`Error details: ${camerasError.details}`);
        } else {
          const count = (camerasCount as number) || 0;
          addResult(`Cameras table EXISTS with ${count} rows`);
        }
      } catch (error) {
        addResult(`Cameras table check FAILED: ${error}`);
      }
      
      // Check photos table
      try {
        const { data: photosData, error: photosError, count: photosCount } = await supabase
          .from('photos')
          .select('*', { count: 'exact' });
        
        if (photosError) {
          addResult(`Photos table ERROR: ${photosError.message}`);
          addResult(`Error code: ${photosError.code}`);
          addResult(`Error details: ${photosError.details}`);
        } else {
          const count = (photosCount as number) || 0;
          addResult(`Photos table EXISTS with ${count} rows`);
        }
      } catch (error) {
        addResult(`Photos table check FAILED: ${error}`);
      }
      
      // List all cameras
      addResult('Listing all cameras...');
      try {
        const { data: allCameras, error: listError } = await supabase
          .from('cameras')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(10);
        
        if (listError) {
          addResult(`List cameras ERROR: ${listError.message}`);
        } else {
          addResult(`Found ${allCameras?.length || 0} cameras:`);
          allCameras?.forEach((camera, index) => {
            addResult(`  ${index + 1}. ${camera.id} - ${camera.name} (${camera.createdAt})`);
          });
        }
      } catch (error) {
        addResult(`List cameras FAILED: ${error}`);
      }
      
      // List all photos
      addResult('Listing all photos...');
      try {
        const { data: allPhotos, error: photosListError } = await supabase
          .from('photos')
          .select('*')
          .order('uploadedAt', { ascending: false })
          .limit(10);
        
        if (photosListError) {
          addResult(`List photos ERROR: ${photosListError.message}`);
        } else {
          addResult(`Found ${allPhotos?.length || 0} photos:`);
          allPhotos?.forEach((photo, index) => {
            addResult(`  ${index + 1}. ${photo.id} - Camera: ${photo.cameraId} (${photo.uploadedAt})`);
          });
        }
      } catch (error) {
        addResult(`List photos FAILED: ${error}`);
      }
      
      // Check storage bucket
      addResult('Checking storage bucket...');
      try {
        const { data: bucketFiles, error: storageError } = await supabase.storage
          .from('camera-photos')
          .list('', { limit: 10 });
        
        if (storageError) {
          addResult(`Storage bucket ERROR: ${storageError.message}`);
        } else {
          addResult(`Storage bucket EXISTS with ${bucketFiles?.length || 0} files`);
          bucketFiles?.forEach((file, index) => {
            addResult(`  ${index + 1}. ${file.name} (${file.created_at})`);
          });
        }
      } catch (error) {
        addResult(`Storage bucket check FAILED: ${error}`);
      }
      
      // Test specific camera ID that was failing
      const failingCameraId = '85ff2e05-a6a9-44b5-813d-a555d48bce09';
      addResult(`Checking specific failing camera ID: ${failingCameraId}`);
      try {
        const { data: specificCamera, error: specificError } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', failingCameraId)
          .single();
        
        if (specificError) {
          addResult(`Specific camera ERROR: ${specificError.message}`);
          addResult(`Error code: ${specificError.code}`);
        } else {
          addResult(`Specific camera FOUND: ${specificCamera.name}`);
        }
      } catch (error) {
        addResult(`Specific camera check FAILED: ${error}`);
      }
      
      // Check table schema
      addResult('Checking table schemas...');
      try {
        const { data: schemaData, error: schemaError } = await supabase
          .rpc('get_table_schema', { table_name: 'cameras' });
        
        if (schemaError) {
          addResult(`Schema check not available: ${schemaError.message}`);
        } else {
          addResult(`Schema data available: ${JSON.stringify(schemaData)}`);
        }
      } catch (error) {
        addResult('Schema check function not available (this is normal)');
      }
      
    } catch (error) {
      addResult(`Overall check FAILED: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Database State' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Database State Debug</Text>
        <Text style={styles.subtitle}>Check current database state and tables</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={checkDatabaseState}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Checking...' : 'Check Database State'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
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
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});