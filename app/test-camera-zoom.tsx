import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { ZoomIn, ZoomOut } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  withSpring
} from 'react-native-reanimated';

export default function TestCameraZoom() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Zoom animation values
  const savedScale = useSharedValue(1);
  const zoomAnimatedValue = useSharedValue(0);
  const facingSharedValue = useSharedValue(facing === 'front' ? 1 : 0);
  
  // Zoom levels
  const getZoomLevels = () => {
    if (facing === 'front') {
      return { min: 0, max: 3, step: 0.1 };
    }
    return { min: 0, max: 10, step: 0.1 };
  };
  
  // Update zoom function
  const updateZoom = useCallback((newZoom: number) => {
    const { min, max } = getZoomLevels();
    const clampedZoom = Math.max(min, Math.min(max, newZoom));
    console.log('Updating zoom:', { newZoom, clampedZoom, min, max, facing });
    setZoom(clampedZoom);
    zoomAnimatedValue.value = clampedZoom;
  }, [facing, zoomAnimatedValue]);

  const updateZoomJS = useCallback((newZoom: number) => {
    try {
      updateZoom(newZoom);
    } catch (error) {
      console.error('Error updating zoom from JS:', error);
    }
  }, [updateZoom]);

  // Pinch gesture for zoom
  const pinchGesture = Platform.OS !== 'web' ? Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = zoomAnimatedValue.value;
      runOnJS(() => console.log('🤏 Pinch gesture started, current zoom:', zoomAnimatedValue.value))();
    })
    .onUpdate((event) => {
      'worklet';
      const min = 0;
      const max = facingSharedValue.value === 1 ? 3 : 10;
      
      const scaleMultiplier = event.scale;
      let newZoom = savedScale.value + (scaleMultiplier - 1) * (max * 0.5);
      newZoom = Math.max(min, Math.min(max, newZoom));
      
      runOnJS(() => console.log('Pinch update:', { 
        scale: scaleMultiplier, 
        savedScale: savedScale.value, 
        newZoom, 
        min, 
        max,
        facing: facingSharedValue.value === 1 ? 'front' : 'back'
      }))();
      
      zoomAnimatedValue.value = newZoom;
      runOnJS(updateZoomJS)(newZoom);
    })
    .onEnd(() => {
      'worklet';
      runOnJS(() => console.log('Pinch gesture ended'))();
    }) : null;

  // Zoom buttons
  const zoomIn = useCallback(() => {
    console.log('Zoom in pressed, current zoom:', zoom);
    const { min, max } = getZoomLevels();
    const increment = max * 0.2;
    const newZoom = Math.min(max, zoom + increment);
    
    zoomAnimatedValue.value = withSpring(newZoom, {
      damping: 20,
      stiffness: 300,
      mass: 0.5
    });
    
    updateZoom(newZoom);
  }, [zoom, updateZoom, facing, zoomAnimatedValue]);

  const zoomOut = useCallback(() => {
    console.log('Zoom out pressed, current zoom:', zoom);
    const { min, max } = getZoomLevels();
    const decrement = max * 0.2;
    const newZoom = Math.max(min, zoom - decrement);
    
    zoomAnimatedValue.value = withSpring(newZoom, {
      damping: 20,
      stiffness: 300,
      mass: 0.5
    });
    
    updateZoom(newZoom);
  }, [zoom, updateZoom, facing, zoomAnimatedValue]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {/* Camera View */}
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
          zoom={Math.max(0, Math.min(1, zoom / (facing === 'front' ? 3 : 10)))}
          flash={flash}
        />
        
        {/* Gesture overlay - only handles pinch, doesn't block other touches */}
        {Platform.OS !== 'web' && pinchGesture && (
          <GestureDetector gesture={pinchGesture}>
            <Animated.View 
              style={styles.gestureOverlay}
              pointerEvents="box-only"
            >
              {/* This view only captures gestures, UI elements are outside */}
            </Animated.View>
          </GestureDetector>
        )}
      </View>
      
      {/* UI Overlay - Completely separate from gesture detector */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="auto">
          <Text style={styles.title}>Camera Zoom Test</Text>
        </View>
        
        <View style={styles.controls} pointerEvents="auto">
          <Text style={styles.zoomText}>
            Zoom: {(zoom / (facing === 'front' ? 3 : 10) * 100).toFixed(0)}%
          </Text>
          
          <View style={styles.zoomControls}>
            <Pressable
              style={[styles.zoomButton, zoom <= getZoomLevels().min && styles.disabled]}
              onPress={() => {
                console.log('🔍 Zoom out button pressed!');
                zoomOut();
              }}
              disabled={zoom <= getZoomLevels().min}
            >
              <ZoomOut size={20} color={theme.colors.text} />
            </Pressable>
            
            <Pressable
              style={[styles.zoomButton, zoom >= getZoomLevels().max && styles.disabled]}
              onPress={() => {
                console.log('🔍 Zoom in button pressed!');
                zoomIn();
              }}
              disabled={zoom >= getZoomLevels().max}
            >
              <ZoomIn size={20} color={theme.colors.text} />
            </Pressable>
          </View>
          
          <Text style={styles.instructionText}>
            {Platform.OS !== 'web' 
              ? 'Use two fingers to pinch and zoom, or use the buttons above'
              : 'Use the zoom buttons above'
            }
          </Text>
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
  gestureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  zoomText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  zoomControls: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  zoomButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  disabled: {
    opacity: 0.5,
  },
  instructionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
  },
  permissionText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});