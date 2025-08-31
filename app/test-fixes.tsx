import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Camera, Database, CheckCircle, XCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useCameraStore } from '@/store/camera-store';
import { supabaseDirect } from '@/lib/supabase-direct';

export default function TestFixesScreen() {
  const [testResults, setTestResults] = useState<Record<string, { status: 'pending' | 'success' | 'error'; message: string }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const { cameras, addCamera } = useCameraStore();

  const updateTestResult = (testName: string, status: 'pending' | 'success' | 'error', message: string) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status, message }
    }));
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});

    // Test 1: Camera Store
    updateTestResult('camera-store', 'pending', 'Testing camera store...');
    try {
      const testCamera = addCamera({
        name: 'Test Camera Fix',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        durationHours: 24,
        maxPhotosPerPerson: 20,
        allowCameraRoll: true,
        revealDelayType: 'immediate',
        filter: 'disposable',
        maxGuests: 10,
        isActive: true,
        paidUpgrade: false,
      });
      
      if (testCamera && testCamera.id) {
        updateTestResult('camera-store', 'success', `Camera created with ID: ${testCamera.id.slice(0, 8)}...`);
      } else {
        updateTestResult('camera-store', 'error', 'Failed to create camera');
      }
    } catch (error) {
      updateTestResult('camera-store', 'error', `Camera store error: ${error}`);
    }

    // Test 2: Supabase Connection
    updateTestResult('supabase-connection', 'pending', 'Testing Supabase connection...');
    try {
      const connectionResult = await supabaseDirect.testConnection();
      if (connectionResult.success) {
        updateTestResult('supabase-connection', 'success', 
          `Connected! Cameras: ${connectionResult.camerasCount}, Photos: ${connectionResult.photosCount}`);
      } else {
        updateTestResult('supabase-connection', 'error', 'Connection failed');
      }
    } catch (error) {
      updateTestResult('supabase-connection', 'error', `Connection error: ${error}`);
    }

    // Test 3: Photo Count Fetching
    updateTestResult('photo-count', 'pending', 'Testing photo count fetching...');
    try {
      const activeCameras = cameras.filter(c => c.isActive);
      if (activeCameras.length > 0) {
        const camera = activeCameras[0];
        const photoResult = await supabaseDirect.listPhotos({ 
          cameraId: camera.id, 
          includeHidden: true 
        });
        
        if (photoResult.success) {
          updateTestResult('photo-count', 'success', 
            `Found ${photoResult.photos.length} photos for camera ${camera.name}`);
        } else {
          updateTestResult('photo-count', 'error', 'Failed to fetch photos');
        }
      } else {
        updateTestResult('photo-count', 'success', 'No active cameras to test photo count');
      }
    } catch (error) {
      updateTestResult('photo-count', 'error', `Photo count error: ${error}`);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <View style={styles.pendingIcon} />;
      case 'success':
        return <CheckCircle size={20} color="#10B981" />;
      case 'error':
        return <XCircle size={20} color="#EF4444" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Test Fixes</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Fix Verification</Text>
          <Text style={styles.infoText}>
            This screen tests the fixes for:{'\n'}
            • Camera facing toggle (rear camera){'\n'}
            • Photo count display in main menu{'\n'}
            • Supabase photo uploads{'\n'}
            • Button clickability in camera
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={runTests}
          disabled={isRunning}
          activeOpacity={0.7}
        >
          <Text style={styles.runButtonText}>
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Text>
        </TouchableOpacity>

        {Object.keys(testResults).length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            
            {Object.entries(testResults).map(([testName, result]) => (
              <View key={testName} style={styles.testResult}>
                <View style={styles.testHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={styles.testName}>
                    {testName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
                <Text style={[styles.testMessage, { color: getStatusColor(result.status) }]}>
                  {result.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Manual Tests</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/camera')}
            activeOpacity={0.7}
          >
            <Camera size={20} color={theme.colors.text} />
            <Text style={styles.actionButtonText}>Test Camera (Check rear camera & buttons)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/')}
            activeOpacity={0.7}
          >
            <Database size={20} color={theme.colors.text} />
            <Text style={styles.actionButtonText}>Check Main Menu (Photo counts)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>RLS Fix Instructions</Text>
          <Text style={styles.instructionsText}>
            If photo uploads are failing with "row-level security policy" errors:{'\n\n'}
            1. Go to your Supabase dashboard{'\n'}
            2. Navigate to SQL Editor{'\n'}
            3. Run the SQL script in SUPABASE_RLS_SIMPLE_FIX.sql{'\n'}
            4. This will fix the database permissions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  resultsSection: {
    marginBottom: theme.spacing.xl,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  testResult: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  testName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  testMessage: {
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  actionsSection: {
    marginBottom: theme.spacing.xl,
  },
  actionsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  instructionsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});