import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SetupSupabaseScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const createTables = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('=== MANUAL SETUP INSTRUCTIONS ===');
      addResult('');
      addResult('📋 STEP 1: Create Database Tables');
      addResult('1. Go to your Supabase Dashboard');
      addResult('2. Navigate to SQL Editor');
      addResult('3. Create a new query');
      addResult('4. Copy and paste this SQL:');
      addResult('');
      addResult('-- CAMERAS TABLE --');
      addResult('CREATE TABLE IF NOT EXISTS cameras (');
      addResult('  id TEXT PRIMARY KEY,');
      addResult('  name TEXT NOT NULL,');
      addResult('  endDate TIMESTAMP WITH TIME ZONE NOT NULL,');
      addResult('  revealDelayType TEXT NOT NULL DEFAULT \'24h\',');
      addResult('  customRevealAt TIMESTAMP WITH TIME ZONE,');
      addResult('  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),');
      addResult('  createdBy TEXT,');
      addResult('  maxPhotosPerPerson INTEGER DEFAULT 20,');
      addResult('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      addResult('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      addResult(');');
      addResult('');
      addResult('ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;');
      addResult('');
      addResult('CREATE POLICY "Allow camera creation" ON cameras');
      addResult('  FOR INSERT WITH CHECK (true);');
      addResult('');
      addResult('CREATE POLICY "Allow camera viewing" ON cameras');
      addResult('  FOR SELECT USING (true);');
      addResult('');
      addResult('-- PHOTOS TABLE --');
      addResult('CREATE TABLE IF NOT EXISTS photos (');
      addResult('  id TEXT PRIMARY KEY,');
      addResult('  cameraId TEXT NOT NULL,');
      addResult('  fileName TEXT NOT NULL,');
      addResult('  publicUrl TEXT NOT NULL,');
      addResult('  userId TEXT NOT NULL DEFAULT \'anonymous\',');
      addResult('  userName TEXT NOT NULL DEFAULT \'Anonymous User\',');
      addResult('  uploadedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),');
      addResult('  mimeType TEXT NOT NULL DEFAULT \'image/jpeg\',');
      addResult('  fileSize INTEGER NOT NULL DEFAULT 0,');
      addResult('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      addResult('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      addResult(');');
      addResult('');
      addResult('ALTER TABLE photos ENABLE ROW LEVEL SECURITY;');
      addResult('');
      addResult('CREATE POLICY "Allow photo uploads" ON photos');
      addResult('  FOR INSERT WITH CHECK (true);');
      addResult('');
      addResult('CREATE POLICY "Allow photo viewing" ON photos');
      addResult('  FOR SELECT USING (true);');
      addResult('');
      addResult('📦 STEP 2: Create Storage Bucket');
      addResult('1. Go to Storage in your Supabase Dashboard');
      addResult('2. Click "New bucket"');
      addResult('3. Name it "camera-photos"');
      addResult('4. Make it Public');
      addResult('5. Click "Create bucket"');
      addResult('');
      addResult('✅ STEP 3: Test Setup');
      addResult('After running the SQL and creating the bucket,');
      addResult('use "Test Connection" to verify everything works.');
      
    } catch (error) {
      addResult(`Setup failed: ${error}`);
      Alert.alert('Setup Failed', `Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Testing Supabase connection...');
      
      // Test cameras table
      const { data: camerasData, error: camerasError } = await supabase
        .from('cameras')
        .select('*')
        .limit(1);
      
      if (camerasError) {
        addResult(`❌ Cameras table: ${camerasError.message}`);
        if (camerasError.message.includes('does not exist')) {
          addResult('   Cameras table does not exist. Please create it first.');
        }
      } else {
        addResult('✅ Cameras table: OK');
        addResult(`   Found ${camerasData?.length || 0} cameras`);
      }
      
      // Test photos table
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .limit(1);
      
      if (photosError) {
        addResult(`❌ Photos table: ${photosError.message}`);
        if (photosError.message.includes('does not exist')) {
          addResult('   Photos table does not exist. Please create it first.');
        }
      } else {
        addResult('✅ Photos table: OK');
        addResult(`   Found ${photosData?.length || 0} photos`);
      }
      
      // Test storage bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('camera-photos')
        .list('', { limit: 1 });
      
      if (storageError) {
        addResult(`❌ Storage bucket: ${storageError.message}`);
        if (storageError.message.includes('not found')) {
          addResult('   Storage bucket does not exist. Please create it first.');
        }
      } else {
        addResult('✅ Storage bucket: OK');
        addResult(`   Found ${storageData?.length || 0} files`);
      }
      
      // Overall status
      const allGood = !camerasError && !photosError && !storageError;
      addResult('');
      if (allGood) {
        addResult('🎉 All components are working correctly!');
        addResult('Your Supabase setup is complete.');
      } else {
        addResult('⚠️  Some components need to be set up.');
        addResult('Please follow the manual setup instructions.');
      }
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
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
          title: 'Setup Supabase',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </Pressable>
        
        <Pressable
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={createTables}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Create Tables</Text>
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
          <Text style={styles.loadingText}>Running setup...</Text>
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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