import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '@/constants/theme';

export default function CameraTestScreen() {
  const [webCameraGranted, setWebCameraGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const cameraPermissionGranted = Platform.OS === 'web' ? webCameraGranted : permission?.granted;

  const handleDirectCameraTest = async () => {
    console.log('=== DIRECT CAMERA TEST ===');
    setIsRequesting(true);
    
    try {
      if (Platform.OS === 'web') {
        console.log('Testing web camera access...');
        console.log('Location:', window.location.href);
        console.log('Protocol:', window.location.protocol);
        console.log('User Agent:', navigator.userAgent);
        
        if (!navigator.mediaDevices?.getUserMedia) {
          Alert.alert('Not Supported', 'Camera not supported in this browser');
          return;
        }
        
        console.log('Requesting camera stream...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        console.log('SUCCESS! Stream obtained');
        console.log('Active:', stream.active);
        console.log('Video tracks:', stream.getVideoTracks().length);
        
        // Test track details
        stream.getVideoTracks().forEach((track, index) => {
          console.log(`Track ${index}:`, {
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          });
        });
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        
        setWebCameraGranted(true);
        Alert.alert('Success!', 'Camera access granted and working');
        
      } else {
        console.log('Testing mobile camera...');
        const result = await requestPermission();
        console.log('Mobile permission result:', result);
        
        if (result.granted) {
          Alert.alert('Success!', 'Mobile camera permission granted');
        } else {
          Alert.alert('Failed', 'Mobile camera permission denied');
        }
      }
      
    } catch (error: any) {
      console.error('Camera test failed:', error);
      Alert.alert('Failed', `Camera test failed: ${error.name || error.message || 'Unknown error'}`);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!cameraPermissionGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera Test</Text>
          <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
          <Text style={styles.subtitle}>
            Location: {Platform.OS === 'web' ? window.location.href : 'N/A'}
          </Text>
          
          {/* HTML Debug Button */}
          {Platform.OS === 'web' && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => alert('HTML button works!')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Test HTML Button
              </button>
            </div>
          )}
          
          <TouchableOpacity
            style={[styles.button, isRequesting && styles.buttonDisabled]}
            onPress={handleDirectCameraTest}
            disabled={isRequesting}
          >
            <Text style={styles.buttonText}>
              {isRequesting ? 'Testing...' : 'Test Camera Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <Text style={styles.successText}>Camera is working!</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setWebCameraGranted(false)}
          >
            <Text style={styles.buttonText}>Reset Test</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    marginTop: theme.spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.textSecondary,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  successText: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
});