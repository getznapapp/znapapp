import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function DatabaseSetupScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSetup = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 CHECKING SUPABASE SETUP...');
      addResult('');
      
      const connectionResult = await supabaseDirect.testConnection();
      
      if (connectionResult.success) {
        addResult('✅ All components are working!');
        addResult(`   Cameras table: ${connectionResult.camerasTable ? 'OK' : 'MISSING'}`);
        addResult(`   Photos table: ${connectionResult.photosTable ? 'OK' : 'MISSING'}`);
        addResult(`   Storage bucket: ${connectionResult.storageBucket ? 'OK' : 'MISSING'}`);
        addResult('');
        addResult('🎉 Your database is ready to use!');
        addResult('You can now create cameras and upload photos.');
      } else {
        throw new Error('Setup incomplete');
      }
      
    } catch (error) {
      addResult('❌ Setup is incomplete');
      addResult('');
      addResult('📋 REQUIRED SETUP STEPS:');
      addResult('');
      addResult('1️⃣ CREATE DATABASE TABLES');
      addResult('   • Go to your Supabase Dashboard');
      addResult('   • Navigate to SQL Editor');
      addResult('   • Create a new query');
      addResult('   • Copy and paste the SQL below:');
      addResult('');
      addResult('-- Create cameras table');
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
      addResult('-- Enable security');
      addResult('ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;');
      addResult('');
      addResult('-- Allow public access');
      addResult('CREATE POLICY "Allow camera creation" ON cameras');
      addResult('  FOR INSERT WITH CHECK (true);');
      addResult('CREATE POLICY "Allow camera viewing" ON cameras');
      addResult('  FOR SELECT USING (true);');
      addResult('');
      addResult('-- Create photos table');
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
      addResult('-- Enable security');
      addResult('ALTER TABLE photos ENABLE ROW LEVEL SECURITY;');
      addResult('');
      addResult('-- Allow public access');
      addResult('CREATE POLICY "Allow photo uploads" ON photos');
      addResult('  FOR INSERT WITH CHECK (true);');
      addResult('CREATE POLICY "Allow photo viewing" ON photos');
      addResult('  FOR SELECT USING (true);');
      addResult('');
      addResult('2️⃣ CREATE STORAGE BUCKET');
      addResult('   • Go to Storage in your Supabase Dashboard');
      addResult('   • Click "New bucket"');
      addResult('   • Name: camera-photos');
      addResult('   • Make it Public');
      addResult('   • Click "Create bucket"');
      addResult('');
      addResult('3️⃣ TEST AGAIN');
      addResult('   • After completing steps 1 & 2');
      addResult('   • Click "Test Setup" again');
      addResult('   • You should see all green checkmarks');
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
          title: 'Database Setup',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Database Setup Required</Text>
        <Text style={styles.subtitle}>
          Your Supabase database needs to be configured before you can use the camera app.
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={testSetup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Checking...' : 'Test Setup'}
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
        {results.length === 0 && (
          <Text style={styles.instructionText}>
            Click "Test Setup" to check if your database is configured correctly.
            {'\n\n'}
            If setup is incomplete, you'll see step-by-step instructions to fix it.
          </Text>
        )}
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {isLoading && (
          <Text style={styles.loadingText}>Checking database setup...</Text>
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
    lineHeight: 22,
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
  instructionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
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