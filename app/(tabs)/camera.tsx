import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { X, RotateCcw, Zap, ZapOff, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { uploadImageToCloud } from '@/lib/image-upload';
import { useCameraStore } from '@/store/camera-store';
import { useAuthStore } from '@/store/auth-store';
import { useGuestStore } from '@/store/guest-store';

import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';

export default function CameraScreen() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL IN THE SAME ORDER EVERY TIME
  
  // 1. State hooks - always called in same order
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isUploading, setIsUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [photosLeft, setPhotosLeft] = useState(20);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // 2. Ref hooks - always called in same order
  const cameraRef = useRef<CameraView>(null);
  const zoomIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const lastCaptureTime = useRef(0);
  
  // 3. Animated values - always called in same order
  const savedScale = useSharedValue(1);
  const zoomAnimatedValue = useSharedValue(0);
  const zoomIndicatorOpacity = useSharedValue(0);
  const facingSharedValue = useSharedValue(facing === 'front' ? 1 : 0);
  
  // 4. Store hooks - always called in same order
  const { currentCamera, findCameraById } = useCameraStore();
  const { user } = useAuthStore();
  const { currentSession } = useGuestStore();
  
  // 5. Permission hook - always called in same order
  const [permission, requestPermission] = useCameraPermissions();
  
  // 6. All useCallback hooks - always called in same order
  const getZoomLevels = useCallback(() => {
    if (facing === 'front') {
      return { min: 0, max: 3, step: 0.1 };
    }
    return { min: 0, max: 10, step: 0.1 };
  }, [facing]);

  const formatZoomDisplay = useCallback((zoomValue: number) => {
    if (zoomValue === 0) return '1×';
    const displayZoom = 1 + zoomValue;
    return displayZoom < 10 ? `${displayZoom.toFixed(1)}×` : `${Math.round(displayZoom)}×`;
  }, []);

  const showZoomIndicatorJS = useCallback(() => {
    setShowZoomIndicator(true);
    zoomIndicatorOpacity.value = withTiming(1, { duration: 200 });
    
    // Clear existing timer
    if (zoomIndicatorTimer.current) {
      clearTimeout(zoomIndicatorTimer.current);
    }
    
    // Set new timer
    zoomIndicatorTimer.current = setTimeout(() => {
      zoomIndicatorOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => setShowZoomIndicator(false), 300);
    }, 1200);
  }, [zoomIndicatorOpacity]);

  const updateZoom = useCallback((newZoom: number) => {
    const { min, max } = getZoomLevels();
    const clampedZoom = Math.max(min, Math.min(max, newZoom));
    console.log('Updating zoom:', { 
      newZoom, 
      clampedZoom, 
      min, 
      max, 
      facing
    });
    setZoom(clampedZoom);
    zoomAnimatedValue.value = clampedZoom;
    
    // Show zoom indicator when manually adjusting
    showZoomIndicatorJS();
  }, [getZoomLevels, facing, showZoomIndicatorJS, zoomAnimatedValue]);



  const toggleCameraFacing = useCallback(() => {
    console.log('🔄 Toggling camera facing from:', facing);
    
    // Force camera to be not ready during switch to prevent capture attempts
    setIsCameraReady(false);
    
    const newFacing = facing === 'back' ? 'front' : 'back';
    console.log('🔄 New camera facing:', newFacing);
    
    // Update facing state immediately
    setFacing(newFacing);
    facingSharedValue.value = newFacing === 'front' ? 1 : 0;
    
    // Reset zoom when switching cameras
    setZoom(0);
    zoomAnimatedValue.value = 0;
  }, [facing, facingSharedValue, zoomAnimatedValue]);

  const toggleFlash = useCallback(() => {
    setFlash((current: FlashMode) => (current === 'off' ? 'on' : 'off'));
  }, []);

  const zoomIn = useCallback(() => {
    try {
      console.log('Zoom in pressed, current zoom:', zoom);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(e => console.log('Haptics error:', e));
      }
      const { min, max } = getZoomLevels();
      const increment = max * 0.2;
      const newZoom = Math.min(max, zoom + increment);
      
      console.log('Zooming in:', { currentZoom: zoom, newZoom, max, increment, min });
      
      // Animate zoom smoothly
      zoomAnimatedValue.value = withSpring(newZoom, {
        damping: 20,
        stiffness: 300,
        mass: 0.5
      });
      
      updateZoom(newZoom);
    } catch (error) {
      console.error('Zoom in error:', error);
    }
  }, [zoom, updateZoom, getZoomLevels, zoomAnimatedValue]);

  const zoomOut = useCallback(() => {
    try {
      console.log('Zoom out pressed, current zoom:', zoom);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(e => console.log('Haptics error:', e));
      }
      const { min, max } = getZoomLevels();
      const decrement = max * 0.2;
      const newZoom = Math.max(min, zoom - decrement);
      
      console.log('Zooming out:', { currentZoom: zoom, newZoom, min, max, decrement });
      
      // Animate zoom smoothly
      zoomAnimatedValue.value = withSpring(newZoom, {
        damping: 20,
        stiffness: 300,
        mass: 0.5
      });
      
      updateZoom(newZoom);
    } catch (error) {
      console.error('Zoom out error:', error);
    }
  }, [zoom, updateZoom, getZoomLevels, zoomAnimatedValue]);

  const cycleZoomPresets = useCallback(() => {
    try {
      console.log('Cycling zoom presets, current zoom:', zoom);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(e => console.log('Haptics error:', e));
      }
      const getPresetZoomLevels = () => {
        const { max } = getZoomLevels();
        if (facing === 'front') {
          return [0, max * 0.33, max * 0.67]; 
        }
        return [0, max * 0.1, max * 0.3, max * 0.5, max * 0.7]; 
      };
      
      const presets = getPresetZoomLevels();
      const { max } = getZoomLevels();
      const tolerance = max * 0.15;
      const currentIndex = presets.findIndex(preset => Math.abs(preset - zoom) < tolerance);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % presets.length : 0;
      
      const targetZoom = presets[nextIndex];
      console.log('Cycling to zoom preset:', { 
        currentZoom: zoom, 
        currentIndex, 
        nextIndex, 
        targetZoom, 
        presets, 
        tolerance,
        facing 
      });
      
      zoomAnimatedValue.value = withSpring(targetZoom, {
        damping: 25,
        stiffness: 400,
        mass: 0.3
      });
      updateZoom(targetZoom);
    } catch (error) {
      console.error('Error cycling zoom presets:', error);
    }
  }, [zoom, facing, updateZoom, getZoomLevels, zoomAnimatedValue]);

  const getEffectiveCamera = useCallback(() => {
    if (currentCamera) return currentCamera;
    if (currentSession) {
      // Try to find camera in store first
      const foundCamera = findCameraById(currentSession.cameraId);
      if (foundCamera) return foundCamera;
      
      // Create a mock camera object for guest users
      return {
        id: currentSession.cameraId,
        name: `Event Camera`,
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        maxPhotosPerPerson: 20,
        photos: [],
        isActive: true,
      };
    }
    return null;
  }, [currentCamera, currentSession, findCameraById]);

  const fetchPhotoCount = useCallback(async () => {
      const effectiveCamera = getEffectiveCamera();
      if (!effectiveCamera) {
        setPhotoCount(0);
        setPhotosLeft(20);
        return;
      }
      
      setIsLoadingPhotos(true);
      try {
        console.log('=== FETCHING PHOTO COUNT ===');
        console.log('Camera ID:', effectiveCamera.id);
        console.log('Camera name:', effectiveCamera.name);
        
        let maxPhotos = effectiveCamera.maxPhotosPerPerson || 20;
        let photoList: any[] = [];
        
        // Always start with local data as the primary source
        const localCamera = useCameraStore.getState().findCameraById(effectiveCamera.id);
        if (localCamera) {
          console.log('Using local camera data - photos:', localCamera.photos.length);
          maxPhotos = localCamera.maxPhotosPerPerson;
          photoList = localCamera.photos.map(photo => ({
            userId: photo.takenBy || user?.id || 'anonymous',
            ...photo
          }));
        }
        
        // Count photos by current user
        const currentUserId = user?.id || (currentSession ? currentSession.guestName : 'anonymous');
        const userPhotos = photoList.filter((photo: any) => {
          const photoUserId = photo.userId || photo.takenBy || 'anonymous';
          return photoUserId === currentUserId;
        });
        
        const currentPhotoCount = userPhotos.length;
        const remaining = Math.max(0, maxPhotos - currentPhotoCount);
        
        console.log('Photo count result:', {
          totalPhotos: photoList.length,
          userPhotos: currentPhotoCount,
          maxPhotos,
          remaining,
          currentUserId
        });
        
        setPhotoCount(currentPhotoCount);
        setPhotosLeft(remaining);
      } catch (error) {
        console.error('Failed to fetch photo count:', error);
        // Set reasonable defaults on error
        setPhotoCount(0);
        setPhotosLeft(20);
      } finally {
        setIsLoadingPhotos(false);
      }
    }, [getEffectiveCamera, user, currentSession]);

  const takePicture = useCallback(async () => {
    // Prevent rapid successive captures (debounce)
    const now = Date.now();
    if (now - lastCaptureTime.current < 1000) {
      console.log('Ignoring rapid capture attempt');
      return;
    }
    lastCaptureTime.current = now;
    
    // Early return checks
    if (isUploading) {
      console.log('Already uploading, ignoring take picture request');
      return;
    }
    
    // Check if component is still mounted before starting
    if (!isMountedRef.current) {
      console.log('Component unmounted, aborting photo capture');
      return;
    }
    
    if (!cameraRef.current) {
      console.log('Camera ref not available');
      Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
      return;
    }
    
    if (!isCameraReady) {
      console.log('Camera not ready yet');
      Alert.alert('Camera Loading', 'Camera is still loading. Please wait a moment.');
      return;
    }
    
    // Check if we have a current camera
    const effectiveCamera = getEffectiveCamera();
    if (!effectiveCamera) {
      Alert.alert('No Camera Selected', 'Please join or create a camera first');
      return;
    }
    
    // Check if user has photos left
    if (photosLeft <= 0) {
      Alert.alert('Photo Limit Reached', 'You have reached your photo limit for this camera.');
      return;
    }
    
    // Store camera ref locally to prevent it from changing during capture
    const currentCameraRef = cameraRef.current;
    if (!currentCameraRef) {
      console.log('Camera ref became null');
      Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
      return;
    }
    
    // Additional check to ensure camera is still mounted and ready
    try {
      // Test if camera ref is still valid by accessing a property
      if (!currentCameraRef.takePictureAsync) {
        console.log('Camera ref is invalid - missing takePictureAsync method');
        Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
        return;
      }
    } catch (error) {
      console.log('Camera ref validation failed:', error);
      Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
      return;
    }
    
    setIsUploading(true);
    
    try {
      console.log('Starting photo capture...');
      
      // Final check before capture
      if (!isMountedRef.current) {
        console.log('Component unmounted before capture, aborting');
        return;
      }
      
      // Create an abort controller to handle cleanup
      const abortController = new AbortController();
      

      
      let photo: any = null;
      
      try {
        // Wrap the capture in a timeout to prevent hanging
        const capturePromise = currentCameraRef.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false, // Enable processing for better quality
          exif: false,
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Photo capture timeout'));
          }, 8000); // Reduced timeout to 8 seconds
          
          // Clear timeout if aborted
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Photo capture aborted - component unmounted'));
          });
        });
        
        // Race between capture and timeout
        photo = await Promise.race([capturePromise, timeoutPromise]);
        
        console.log('Photo capture completed:', { hasUri: !!photo?.uri });
        
      } catch (captureError: any) {
        // Handle specific camera unmount errors
        if (captureError?.message?.includes('aborted') || captureError?.message?.includes('unmounted')) {
          console.log('Photo capture aborted due to component unmount');
          throw new Error('Camera unmounted during taking photo process');
        }
        throw captureError;
      }
      
      // Check if component is still mounted after capture
      if (!isMountedRef.current) {
        console.log('Component unmounted after capture, skipping upload');
        throw new Error('Camera unmounted during taking photo process');
      }
      
      if (photo?.uri) {
        console.log('Photo captured successfully, starting upload...');
        
        // Prepare upload data
        const currentUserId = user?.id || (currentSession ? currentSession.guestName : 'anonymous');
        const currentUserEmail = user?.email || (currentSession ? currentSession.email || 'Guest User' : 'Anonymous User');
        
        // Upload the photo with timeout and abort handling
        const uploadPromise = uploadImageToCloud(
          photo.uri,
          effectiveCamera.id,
          currentUserId,
          currentUserEmail
        );
        
        const uploadTimeoutPromise = new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Upload timeout'));
          }, 30000);
          
          // Clear timeout if aborted
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Upload aborted - component unmounted'));
          });
        });
        
        const uploadResult = await Promise.race([uploadPromise, uploadTimeoutPromise]) as any;
        
        console.log('Upload result:', uploadResult);
        
        // Check if component is still mounted after upload
        if (!isMountedRef.current) {
          console.log('Component unmounted after upload, skipping state update');
          throw new Error('Camera unmounted during taking photo process');
        }
        
        if (uploadResult.success) {
          console.log('Photo uploaded successfully:', uploadResult.photoData);
          
          // Add photo to local store for immediate UI update
          const { addPhoto } = useCameraStore.getState();
          addPhoto(effectiveCamera.id, {
            uri: uploadResult.url || photo.uri,
            takenBy: currentUserId,
            takenAt: new Date(),
            isRevealed: false,
          });
          
          // Update photo counts immediately for instant feedback
          const newPhotoCount = photoCount + 1;
          const newPhotosLeft = Math.max(0, photosLeft - 1);
          console.log('Updating photo counts immediately:', {
            oldCount: photoCount,
            newCount: newPhotoCount,
            oldLeft: photosLeft,
            newLeft: newPhotosLeft
          });
          setPhotoCount(newPhotoCount);
          setPhotosLeft(newPhotosLeft);
          
          // Refresh photo count from server to ensure accuracy after a short delay
          setTimeout(() => {
            if (isMountedRef.current) {
              console.log('Refreshing photo count from server...');
              fetchPhotoCount().catch(err => {
                console.log('Photo count refresh failed:', err);
              });
            }
          }, 500); // Faster refresh for better UX
          
          // Show success feedback
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        } else {
          console.error('Upload failed:', uploadResult.error);
          if (isMountedRef.current) {
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
          }
        }
      } else {
        throw new Error('Photo capture returned no image');
      }
    } catch (error: any) {
      console.error('Error taking picture:', error);
      
      // Handle unmount errors gracefully without showing alerts
      if (error?.message?.includes('Camera unmounted during taking photo process')) {
        console.log('Camera unmounted during photo process - this is expected when navigating away');
        return; // Don't show error to user
      }
      
      // Only show alerts if component is still mounted and it's not an unmount-related error
      if (isMountedRef.current && !error?.message?.includes('unmounted') && !error?.message?.includes('aborted')) {
        if (error?.message?.includes('timeout')) {
          Alert.alert('Timeout Error', 'Photo capture took too long. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to take picture. Please try again.');
        }
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  }, [isUploading, isCameraReady, user, currentSession, photoCount, photosLeft, getEffectiveCamera, fetchPhotoCount]);

  // 7. Create gestures - ALWAYS create them to avoid conditional hooks
  
  // ULTRA SIMPLE pinch gesture - no worklet complexity
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      console.log('🤏 PINCH BEGAN!');
      savedScale.value = zoom;
      showZoomIndicatorJS();
    })
    .onUpdate((event) => {
      const baseZoom = savedScale.value;
      const sensitivity = 1.5;
      let newZoom = baseZoom + ((event.scale - 1) * sensitivity);
      
      // Clamp zoom
      const max = facing === 'front' ? 3 : 10;
      newZoom = Math.max(0, Math.min(max, newZoom));
      
      console.log('🤏 PINCH UPDATE - scale:', event.scale.toFixed(2), 'zoom:', newZoom.toFixed(2));
      
      // Update zoom directly
      setZoom(newZoom);
      zoomAnimatedValue.value = newZoom;
    })
    .onEnd(() => {
      console.log('🤏 PINCH ENDED');
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    })
    .runOnJS(true); // Force JS thread for simplicity

  // 8. Animated styles - always called in same order
  const zoomIndicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: zoomIndicatorOpacity.value,
    transform: [{ scale: zoomIndicatorOpacity.value }]
  }));

  // 9. All useEffect hooks - always called in same order
  useEffect(() => {
    fetchPhotoCount();
  }, [fetchPhotoCount]);

  useEffect(() => {
    facingSharedValue.value = facing === 'front' ? 1 : 0;
    updateZoom(0);
    // Reset camera ready state when facing changes
    setIsCameraReady(false);
    
    // Add a small delay to ensure camera is properly initialized
    const timer = setTimeout(() => {
      console.log('Camera facing changed to:', facing, '- waiting for camera ready');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [facing, updateZoom, facingSharedValue]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (zoomIndicatorTimer.current) {
        clearTimeout(zoomIndicatorTimer.current);
      }
    };
  }, []);
  
  // Refresh photo count periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current && !isUploading && !isLoadingPhotos) {
        console.log('Periodic photo count refresh...');
        fetchPhotoCount().catch(err => {
          console.log('Periodic photo count refresh failed:', err);
        });
      }
    }, 10000); // Refresh every 10 seconds when not busy
    
    return () => clearInterval(refreshInterval);
  }, [fetchPhotoCount, isUploading, isLoadingPhotos]);

  // NOW WE CAN DO CONDITIONAL RENDERING AFTER ALL HOOKS ARE CALLED
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ZNAP</Text>
          </View>
          
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera for taking photos
          </Text>
          
          <TouchableOpacity
            style={styles.grantPermissionButton}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <Text style={styles.grantPermissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {/* Camera View - Always at the bottom layer */}
        <CameraView 
          key={`camera-${facing}`} // Force remount when facing changes
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
          zoom={Math.max(0, Math.min(1, zoom / (facing === 'front' ? 3 : 10)))} // Normalize zoom to 0-1 range
          flash={flash}
          enableTorch={false}
          animateShutter={false}
          onCameraReady={() => {
            console.log('📷 Camera is ready, facing:', facing);
            // Add a small delay to ensure camera is fully ready
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsCameraReady(true);
              }
            }, 300);
          }}
          onMountError={(error) => {
            console.error('📷 Camera mount error:', error);
            setIsCameraReady(false);
            // Try to recover by toggling camera ready state after a delay
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('Attempting camera recovery...');
                setIsCameraReady(true);
              }
            }, 1500);
          }}
        />
        
        {/* Web zoom notice */}
        {Platform.OS === 'web' && (
          <View style={styles.webZoomNotice}>
            <Text style={styles.webZoomNoticeText}>
              Use zoom buttons for zoom control on web
            </Text>
          </View>
        )}
        
        {/* Gesture Layer - Only for mobile, transparent overlay for pinch detection */}
        {Platform.OS !== 'web' && (
          <GestureDetector gesture={pinchGesture}>
            <View style={styles.gestureOverlay} pointerEvents="box-none" />
          </GestureDetector>
        )}
        
        {/* UI Overlay - Always on top, allows button interactions */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <View style={styles.overlay} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <X size={24} color={theme.colors.text} />
              </Pressable>
              
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraName}>{getEffectiveCamera()?.name || 'No Camera'}</Text>
                <Text style={styles.timeRemaining}>
                  {getEffectiveCamera() ? 'Active' : 'Join a camera first'}
                </Text>
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
              
              {/* Zoom Controls */}
              <View style={styles.zoomControls}>
                <Pressable
                  style={styles.zoomButton}
                  onPress={zoomIn}
                  disabled={zoom >= getZoomLevels().max}
                >
                  <ZoomIn size={18} color={zoom >= getZoomLevels().max ? theme.colors.textSecondary : theme.colors.text} />
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.zoomDisplay,
                    { backgroundColor: showZoomIndicator ? 'rgba(123, 92, 255, 0.8)' : 'rgba(0,0,0,0.8)' }
                  ]}
                  onPress={cycleZoomPresets}
                >
                  <Text style={[
                    styles.zoomText,
                    { color: showZoomIndicator ? theme.colors.text : theme.colors.text }
                  ]}>
                    {formatZoomDisplay(zoom)}
                  </Text>
                </Pressable>
                
                <Pressable
                  style={styles.zoomButton}
                  onPress={zoomOut}
                  disabled={zoom <= getZoomLevels().min}
                >
                  <ZoomOut size={18} color={zoom <= getZoomLevels().min ? theme.colors.textSecondary : theme.colors.text} />
                </Pressable>
              </View>
            </View>

            {/* Center Zoom Indicator - iPhone-like */}
            {showZoomIndicator && (
              <Animated.View 
                style={[
                  styles.centerZoomIndicator,
                  zoomIndicatorAnimatedStyle
                ]}
              >
                <Text style={styles.centerZoomText}>{formatZoomDisplay(zoom)}</Text>
              </Animated.View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomContainer}>
              <View style={styles.photoCounter}>
                <Text style={styles.photoCountText}>
                  {isUploading ? 'Uploading photo...' : 
                   isLoadingPhotos ? 'Loading...' : 
                   `${photoCount} taken • ${photosLeft} ${photosLeft === 1 ? 'photo' : 'photos'} left`}
                </Text>
                
                {getEffectiveCamera() && (
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={() => router.push(`/gallery/${getEffectiveCamera()!.id}`)}
                    activeOpacity={0.7}
                  >
                    <ImageIcon size={16} color={theme.colors.text} />
                    <Text style={styles.galleryButtonText}>Gallery</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cameraControls}>
                <Pressable
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
                >
                  <RotateCcw size={24} color={theme.colors.text} />
                </Pressable>

                <TouchableOpacity
                  style={[
                    styles.shutterButton,
                    (isUploading || !permission?.granted || !isCameraReady) && styles.shutterButtonDisabled,
                  ]}
                  onPress={takePicture}
                  disabled={isUploading || !permission?.granted || !isCameraReady}
                  activeOpacity={0.8}
                >
                  <View style={styles.shutterButtonOuter}>
                    {isUploading ? (
                      <ActivityIndicator size="small" color={theme.colors.text} />
                    ) : (
                      <View style={styles.shutterButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>

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
  gestureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },

  overlay: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
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
  zoomControls: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomDisplay: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  zoomText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  centerZoomIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerZoomText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80, // Increased bottom margin for better visibility
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  photoCounter: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: theme.spacing.xs,
  },
  galleryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  photoCountText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
  shutterButtonDisabled: {
    opacity: 0.5,
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
  logoContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
    fontWeight: 'bold' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  grantPermissionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },

  webZoomNotice: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    zIndex: 1,
  },
  
  webZoomNoticeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },

});