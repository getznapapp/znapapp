import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { X, RotateCcw, Zap, ZapOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  withSpring
} from 'react-native-reanimated';

export default function TestCameraOffline() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Zoom animation values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const zoomAnimatedValue = useSharedValue(0);
  
  const updateZoom = useCallback((newZoom: number) => {
    const min = 0;
    const max = facing === 'front' ? 3 : 10;
    const clampedZoom = Math.max(min, Math.min(max, newZoom));
    console.log('Updating zoom:', { newZoom, clampedZoom, min, max, facing });
    setZoom(clampedZoom);
    zoomAnimatedValue.value = clampedZoom;
  }, [facing, zoomAnimatedValue]);

  const updateZoomJS = useCallback((newZoom: number) => {
    updateZoom(newZoom);
  }, [updateZoom]);

  // Pinch-to-zoom gesture
  const pinchGesture = Platform.OS !== 'web' ? Gesture.Pinch()
    .onStart(() => {
      'worklet';
      console.log('Pinch gesture started, current zoom:', zoom);
      savedScale.value = zoom;
    })
    .onUpdate((event) => {
      'worklet';
      const min = 0;
      const max = facing === 'front' ? 3 : 10;
      
      const scaleMultiplier = event.scale;
      let newZoom = savedScale.value * scaleMultiplier;
      
      newZoom = Math.max(min, Math.min(max, newZoom));
      
      zoomAnimatedValue.value = newZoom;
      runOnJS(updateZoomJS)(newZoom);
      
      console.log('Pinch update:', { 
        gestureScale: event.scale,
        savedZoom: savedScale.value,
        newZoom,
        min,
        max,
        facing
      });
    })
    .onEnd(() => {
      'worklet';
      console.log('Pinch gesture ended');
    }) : null;

  const toggleCameraFacing = useCallback(() => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash((current: FlashMode) => (current === 'off' ? 'on' : 'off'));
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
        exif: false,
      });
      
      if (photo?.uri) {
        console.log('Photo captured:', photo.uri);
        // In offline mode, just log the photo
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera for taking photos
          </Text>
          
          <Pressable
            style={styles.grantPermissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.grantPermissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {Platform.OS !== 'web' && pinchGesture ? (
          <GestureDetector gesture={pinchGesture}>
            <Animated.View style={styles.camera}>
              <CameraView 
                style={styles.camera} 
                facing={facing} 
                ref={cameraRef}
                zoom={Math.max(0, Math.min(1, zoom / (facing === 'front' ? 3 : 10)))}
                flash={flash}
                enableTorch={false}
                animateShutter={false}
              />
            </Animated.View>
          </GestureDetector>
        ) : (
          <CameraView 
            style={styles.camera} 
            facing={facing} 
            ref={cameraRef}
            zoom={Math.max(0, Math.min(1, zoom / (facing === 'front' ? 3 : 10)))}
            flash={flash}
            enableTorch={false}
            animateShutter={false}
          />
        )}
        
        <View style={styles.overlayContainer}>
          <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <X size={24} color={theme.colors.text} />
              </Pressable>
              
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraName}>Test Camera (Offline)</Text>
                <Text style={styles.timeRemaining}>Zoom: {zoom.toFixed(1)}</Text>
              </View>
              
              <View style={styles.topRightSpace} />
            </View>

            {/* Right Side Controls */}
            <View style={styles.rightControls}>
              <Pressable
                style={[
                  styles.flashButton,
                  flash === 'on' && styles.flashButtonActive,
                ]}
                onPress={toggleFlash}
              >
                {flash === 'on' ? (
                  <Zap size={20} color={theme.colors.text} fill={theme.colors.primary} />
                ) : (
                  <ZapOff size={20} color={theme.colors.text} />
                )}
              </Pressable>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomContainer}>
              <View style={styles.cameraControls}>
                <Pressable
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
                >
                  <RotateCcw size={24} color={theme.colors.text} />
                </Pressable>

                <Pressable
                  style={styles.shutterButton}
                  onPress={takePicture}
                >
                  <View style={styles.shutterButtonOuter}>
                    <View style={styles.shutterButtonInner} />
                  </View>
                </Pressable>

                <View style={styles.placeholder} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topBar: {
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
  cameraInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
  },
  cameraName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  timeRemaining: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  topRightSpace: {
    width: 40,
  },
  rightControls: {
    position: 'absolute',
    top: 140,
    right: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flashButtonActive: {
    backgroundColor: 'rgba(123, 92, 255, 0.8)',
    borderColor: theme.colors.primary,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shutterButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: theme.colors.text,
  },
  shutterButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.text,
  },
  placeholder: {
    width: 56,
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
  grantPermissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  grantPermissionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
});