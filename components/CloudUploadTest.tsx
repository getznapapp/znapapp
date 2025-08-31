import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Upload, Check, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { uploadImageToCloud, getOfflinePhotosByCamera, syncOfflinePhotos } from '@/lib/image-upload';
import { setupSupabaseBucket, testBucketAccess } from '@/lib/supabase-setup';
import { shouldUseBackend } from '@/lib/trpc';

interface CloudUploadTestProps {
  cameraId: string;
}

export function CloudUploadTest({ cameraId }: CloudUploadTestProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const runBucketTest = async () => {
    setTestStatus('testing');
    
    if (!shouldUseBackend()) {
      setTestStatus('error');
      setTestMessage('Backend not available - running in offline mode');
      Alert.alert('Offline Mode', 'Backend is not available. The app is running in offline mode. Photos will be stored locally.');
      return;
    }

    setTestMessage('Setting up bucket...');

    try {
      // Verify bucket access
      const setupSuccess = await setupSupabaseBucket();
      if (!setupSuccess) {
        throw new Error('Bucket not accessible. Please create the "camera-photos" bucket in your Supabase dashboard.');
      }

      setTestMessage('Testing bucket access...');
      
      // Test bucket access
      await testBucketAccess();

      setTestStatus('success');
      setTestMessage('Bucket test successful!');
      
      Alert.alert('Success', 'Cloud storage is working correctly!');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      Alert.alert('Error', `Cloud storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testImageUpload = async () => {
    setTestStatus('testing');
    setTestMessage('Testing image upload...');

    try {
      // Create a test image data URL (1x1 pixel PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg==';
      const testImageUri = `data:image/png;base64,${testImageBase64}`;

      const result = await uploadImageToCloud(
        testImageUri,
        cameraId,
        'test-user',
        'Test User'
      );

      if (result.success) {
        setTestStatus('success');
        const isOffline = result.photoData?.isOffline;
        const message = isOffline 
          ? 'Image stored offline successfully!' 
          : 'Image uploaded to cloud successfully!';
        setTestMessage(message);
        
        const alertMessage = isOffline
          ? `Image stored offline successfully!\nWill sync when backend is available.`
          : `Image uploaded successfully!\nURL: ${result.url}`;
        Alert.alert('Success', alertMessage);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', `Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testOfflineSync = async () => {
    setTestStatus('testing');
    setTestMessage('Syncing offline photos...');

    try {
      if (!shouldUseBackend()) {
        throw new Error('Backend not available - cannot sync');
      }

      const result = await syncOfflinePhotos();
      setTestStatus('success');
      setTestMessage(`Sync complete: ${result.synced} synced, ${result.failed} failed`);
      Alert.alert('Sync Complete', `${result.synced} photos synced successfully\n${result.failed} photos failed to sync`);
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkOfflinePhotos = async () => {
    try {
      const offlinePhotos = await getOfflinePhotosByCamera(cameraId);
      Alert.alert('Offline Photos', `Found ${offlinePhotos.length} offline photos for this camera`);
    } catch (error) {
      Alert.alert('Error', 'Failed to check offline photos');
    }
  };

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <Upload size={16} color={theme.colors.primary} />;
      case 'success':
        return <Check size={16} color={theme.colors.success} />;
      case 'error':
        return <X size={16} color={theme.colors.error} />;
      default:
        return <Upload size={16} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = () => {
    switch (testStatus) {
      case 'testing':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Test</Text>
      <Text style={styles.subtitle}>
        {shouldUseBackend() ? 'Backend Available - Cloud Mode' : 'Backend Offline - Local Mode'}
      </Text>
      
      <View style={styles.testRow}>
        <Pressable 
          style={[styles.testButton, testStatus === 'testing' && styles.testButtonDisabled]} 
          onPress={runBucketTest}
          disabled={testStatus === 'testing'}
        >
          <Text style={styles.testButtonText}>Test Bucket</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.testButton, testStatus === 'testing' && styles.testButtonDisabled]} 
          onPress={testImageUpload}
          disabled={testStatus === 'testing'}
        >
          <Text style={styles.testButtonText}>Test Upload</Text>
        </Pressable>
      </View>

      <View style={styles.testRow}>
        <Pressable 
          style={[styles.testButton, styles.secondaryButton, testStatus === 'testing' && styles.testButtonDisabled]} 
          onPress={testOfflineSync}
          disabled={testStatus === 'testing'}
        >
          <Text style={[styles.testButtonText, styles.secondaryButtonText]}>Sync Offline</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.testButton, styles.secondaryButton, testStatus === 'testing' && styles.testButtonDisabled]} 
          onPress={checkOfflinePhotos}
          disabled={testStatus === 'testing'}
        >
          <Text style={[styles.testButtonText, styles.secondaryButtonText]}>Check Offline</Text>
        </Pressable>
      </View>

      {testMessage && (
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {testMessage}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: -theme.spacing.sm,
  },
  testRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  testButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
    flex: 1,
  },
});