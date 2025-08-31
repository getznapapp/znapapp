import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Flashlight, FlashlightOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';

interface QRScannerProps {
  onClose: () => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      let cameraId = '';
      
      console.log('=== QR SCANNER DEBUG ===');
      console.log('Raw QR Code data:', JSON.stringify(data));
      console.log('Data length:', data.length);
      console.log('Data type:', typeof data);
      console.log('Trimmed data:', JSON.stringify(data.trim()));
      
      // Check if it's a valid join URL (exp://, https://, or znap://)
      const expUrlPattern = /exp:\/\/[^/]+\/--\/join\/(.+)/;
      const httpsUrlPattern = /https:\/\/[^/]+\/join\/(.+)/;
      const znapUrlPattern = /https:\/\/znap\.app\/join\/(.+)/;
      const znapProtocolPattern = /znap:\/\/join\/(.+)/;
      const generalUrlPattern = /\/join\/(.+)/; // Catch any URL with /join/
      
      const expMatch = data.match(expUrlPattern);
      const httpsMatch = data.match(httpsUrlPattern);
      const znapMatch = data.match(znapUrlPattern);
      const znapProtocolMatch = data.match(znapProtocolPattern);
      const generalMatch = data.match(generalUrlPattern);
      
      if (expMatch && expMatch[1]) {
        cameraId = expMatch[1];
        console.log('Found camera ID from exp URL:', cameraId);
      } else if (httpsMatch && httpsMatch[1]) {
        cameraId = httpsMatch[1];
        console.log('Found camera ID from https URL:', cameraId);
      } else if (znapMatch && znapMatch[1]) {
        cameraId = znapMatch[1];
        console.log('Found camera ID from znap URL:', cameraId);
      } else if (znapProtocolMatch && znapProtocolMatch[1]) {
        cameraId = znapProtocolMatch[1];
        console.log('Found camera ID from znap protocol:', cameraId);
      } else if (generalMatch && generalMatch[1]) {
        cameraId = generalMatch[1];
        console.log('Found camera ID from general URL pattern:', cameraId);
      } else {
        // Check if it looks like a camera ID (starts with 'camera_')
        const trimmedData = data.trim();
        console.log('Checking direct camera ID patterns for:', trimmedData);
        
        if (trimmedData.startsWith('camera_')) {
          cameraId = trimmedData;
          console.log('Using direct camera ID:', cameraId);
        } else if (trimmedData.length > 10 && trimmedData.includes('_')) {
          // Might be a camera ID without the 'camera_' prefix or with different format
          cameraId = trimmedData;
          console.log('Using potential camera ID:', cameraId);
        } else {
          console.log('No recognizable camera ID pattern found');
        }
      }
      
      if (cameraId) {
        console.log('Navigating to join camera with ID:', cameraId);
        // Navigate to the join route which will redirect to JoinCamera screen
        router.push(`/join/${encodeURIComponent(cameraId)}`);
        onClose();
      } else {
        console.log('No valid camera ID found in QR data:', data);
        Alert.alert(
          'No Usable Data Found',
          `This QR code does not contain valid camera data. Scanned: "${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"\n\nPlease make sure you're scanning a QR code from the Znap app.`,
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        flash={flashOn ? 'on' : 'off'}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color={theme.colors.text} />
            </Pressable>
            
            <Text style={styles.title}>Scan QR Code</Text>
            
            <Pressable style={styles.flashButton} onPress={toggleFlash}>
              {flashOn ? (
                <Flashlight size={24} color={theme.colors.text} />
              ) : (
                <FlashlightOff size={24} color={theme.colors.text} />
              )}
            </Pressable>
          </View>

          {/* Scanning Area */}
          <View style={styles.scanningArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Point your camera at a QR code to join a camera
            </Text>
          </View>
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  permissionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});