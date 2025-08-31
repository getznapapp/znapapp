import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, PanResponder, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { X, RotateCcw, Zap, ZapOff, Upload } from 'lucide-react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useCameraStore } from '@/store/camera-store';
import { useGuestStore } from '@/store/guest-store';
import { Button } from '@/components/Button';
import { theme } from '@/constants/theme';
import { uploadImageToCloud } from '@/lib/image-upload';
import { useAuthStore } from '@/store/auth-store';
import { useFonts, Chewy_400Regular } from '@expo-google-fonts/chewy';

export default function CameraScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isUploading, setIsUploading] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [webCameraGranted, setWebCameraGranted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [webStream, setWebStream] = useState<MediaStream | null>(null);
  const [webVideoRef, setWebVideoRef] = useState<HTMLVideoElement | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { currentCamera, addPhoto, cameras, saveCameras, findCameraById, setCurrentCamera } = useCameraStore();
  const { currentSession, createSession } = useGuestStore();
  const { user } = useAuthStore();
  
  const [fontsLoaded] = useFonts({
    Chewy_400Regular,
  });

  // Handle camera ID from query parameter
  useEffect(() => {
    if (id && !currentSession && !currentCamera) {
      // Create a guest session for this camera ID
      const guestName = `Guest-${Date.now()}`;
      createSession(id, guestName, '');
      
      // Find or create camera
      let camera = findCameraById(id);
      if (!camera) {
        // Create a mock camera for offline use
        camera = {
          id,
          name: `Event Camera ${id.slice(-6)}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          maxPhotosPerPerson: 50,
          allowCameraRoll: true,
          revealDelayType: 'immediate' as const,
          filter: 'none' as const,
          maxGuests: 25,
          photos: [],
          isActive: true,
          createdAt: new Date(),
          paidUpgrade: false,
        };
        
        // Add to cameras store
        const updatedCameras = [...cameras, camera];
        saveCameras();
      }
      
      // Set as current camera
      setCurrentCamera(camera);
    }
  }, [id, currentSession, currentCamera, findCameraById, createSession, cameras, saveCameras, setCurrentCamera]);

  // Get camera from guest session, current camera, or ID parameter
  let activeCamera = currentSession ? findCameraById(currentSession.cameraId) : currentCamera;
  
  // If we have an ID but no active camera, try to find it or create a mock one
  if (id && !activeCamera) {
    activeCamera = findCameraById(id);
    if (!activeCamera) {
      activeCamera = {
        id,
        name: `Event Camera ${id.slice(-6)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        maxPhotosPerPerson: 50,
        allowCameraRoll: true,
        revealDelayType: 'immediate' as const,
        filter: 'none' as const,
        maxGuests: 25,
        photos: [],
        isActive: true,
        createdAt: new Date(),
        paidUpgrade: false,
      };
    }
  }
  
  // Get updated camera data from store - ensure we always have the latest data
  const updatedCamera = activeCamera ? cameras.find(c => c.id === activeCamera.id) || activeCamera : null;
  
  console.log('=== CAMERA SCREEN DEBUG ===');
  console.log('Query ID:', id);
  console.log('Current camera:', currentCamera?.name || 'null');
  console.log('Updated camera:', updatedCamera?.name || 'null');
  console.log('Total cameras in store:', cameras.length);
  console.log('Current session:', currentSession?.cameraId || 'null');

  // Pinch to zoom state with debouncing
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two touches
  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const [touch1, touch2] = touches;
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Optimized zoom handler with debouncing
  const debouncedZoomUpdate = useCallback((newZoom: number) => {
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    
    zoomTimeoutRef.current = setTimeout(() => {
      setZoom(newZoom);
      setIsZooming(false);
    }, 16); // ~60fps
  }, []);

  // Pan responder for smooth pinch to zoom
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
    onPanResponderGrant: (evt) => {
      if (evt.nativeEvent.touches.length === 2) {
        const distance = getDistance(evt.nativeEvent.touches);
        setInitialDistance(distance);
        setInitialZoom(zoom);
        setIsZooming(true);
      }
    },
    onPanResponderMove: (evt) => {
      if (evt.nativeEvent.touches.length === 2 && initialDistance > 0) {
        const currentDistance = getDistance(evt.nativeEvent.touches);
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(0, Math.min(1, initialZoom + (scale - 1) * 0.3));
        debouncedZoomUpdate(newZoom);
      }
    },
    onPanResponderRelease: () => {
      setInitialDistance(0);
      setInitialZoom(0);
      setIsZooming(false);
    },
  });

  if (!permission || !fontsLoaded) {
    return <View style={styles.container} />;
  }

  // For web, use our own camera permission state; for mobile, use Expo's
  const cameraPermissionGranted = Platform.OS === 'web' ? webCameraGranted : permission?.granted;
  
  if (!cameraPermissionGranted) {
    const handlePermissionRequest = async () => {
      console.log('=== PERMISSION REQUEST START ===');
      console.log('Platform:', Platform.OS);
      console.log('User Agent:', Platform.OS === 'web' ? navigator.userAgent : 'N/A');
      console.log('Current permission status:', permission?.granted);
      
      setIsRequestingPermission(true);
      
      try {
        if (Platform.OS === 'web') {
          console.log('Web permission request initiated');
          console.log('Location:', window.location.href);
          console.log('Protocol:', window.location.protocol);
          
          // Check basic support
          if (!navigator.mediaDevices) {
            console.log('navigator.mediaDevices not available');
            Alert.alert('Not Supported', 'Camera access is not supported in this browser.');
            return;
          }
          
          if (!navigator.mediaDevices.getUserMedia) {
            console.log('getUserMedia not available');
            Alert.alert('Not Supported', 'Camera access is not supported in this browser.');
            return;
          }
          
          console.log('Requesting camera access directly...');
          
          // Direct request with high-quality video constraints
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, min: 15 },
              facingMode: facing === 'back' ? 'environment' : 'user'
            },
            audio: false
          });
          
          console.log('SUCCESS: Camera stream obtained');
          console.log('Stream active:', stream.active);
          console.log('Video tracks:', stream.getVideoTracks().length);
          
          // Store stream for web camera capture
          setWebStream(stream);
          
          console.log('Setting web camera as granted');
          // Set our web camera state to granted
          setWebCameraGranted(true);
          
          // Create video element for web capture
          if (Platform.OS === 'web') {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            setWebVideoRef(video);
            
            // Create canvas for photo capture
            const canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }
          
          // Also try to sync with Expo's permission system
          try {
            const result = await requestPermission();
            console.log('Expo permission sync result:', result);
          } catch (syncError) {
            console.log('Expo permission sync failed (this is OK for web):', syncError);
          }
          
        } else {
          console.log('Native permission request');
          const result = await requestPermission();
          console.log('Native permission result:', result);
        }
        
      } catch (error: any) {
        console.error('=== PERMISSION ERROR ===');
        console.error('Error type:', typeof error);
        console.error('Error name:', error?.name);
        console.error('Error message:', error?.message);
        console.error('Full error:', error);
        
        let userMessage = 'Camera access failed. Please try again.';
        
        if (error?.name === 'NotAllowedError') {
          userMessage = 'Camera access was denied. Please allow camera access and try again.';
        } else if (error?.name === 'NotFoundError') {
          userMessage = 'No camera found on this device.';
        } else if (error?.name === 'NotSupportedError') {
          userMessage = 'Camera is not supported in this browser.';
        } else if (error?.name === 'NotReadableError') {
          userMessage = 'Camera is already in use by another application.';
        }
        
        Alert.alert('Camera Error', userMessage);
        
      } finally {
        console.log('=== PERMISSION REQUEST END ===');
        setIsRequestingPermission(false);
      }
    };

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Camera Access', headerShown: false }} />
        <View style={styles.permissionContainer}>
          {/* Znap Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ZNAP</Text>
          </View>
          
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera for taking photos
          </Text>
          
          {/* Debug Info */}
          {Platform.OS === 'web' && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
              <Text style={styles.debugText}>Protocol: {window.location.protocol}</Text>
              <Text style={styles.debugText}>Host: {window.location.hostname}</Text>
              <Text style={styles.debugText}>
                MediaDevices: {navigator.mediaDevices ? '✓' : '✗'}
              </Text>
              <Text style={styles.debugText}>
                getUserMedia: {typeof navigator.mediaDevices?.getUserMedia === 'function' ? '✓' : '✗'}
              </Text>
              <Text style={styles.debugText}>
                User Agent: {navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}
              </Text>
            </View>
          )}
          
          {/* Debug: Plain HTML button for testing */}
          {Platform.OS === 'web' && (
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  console.log('HTML BUTTON CLICKED - This confirms touch/click works');
                  alert('HTML button works! Touch/click is functional.');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                DEBUG: Test Touch
              </button>
              
              <button
                onClick={async () => {
                  console.log('DIRECT CAMERA TEST CLICKED');
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    console.log('DIRECT TEST SUCCESS:', stream.getVideoTracks().length, 'tracks');
                    stream.getTracks().forEach(track => track.stop());
                    alert('Direct camera test SUCCESS! Camera is accessible.');
                    setWebCameraGranted(true);
                  } catch (error: any) {
                    console.error('DIRECT TEST FAILED:', error);
                    alert(`Direct camera test FAILED: ${error.name || error.message || 'Unknown error'}`);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                DEBUG: Direct Camera Test
              </button>
            </div>
          )}
          
          {/* Use TouchableOpacity for better mobile Safari compatibility */}
          <TouchableOpacity
            style={[
              styles.grantPermissionButton,
              isRequestingPermission && styles.grantPermissionButtonDisabled
            ]}
            onPress={() => {
              console.log('=== TOUCHABLE OPACITY PRESSED ===');
              console.log('Timestamp:', new Date().toISOString());
              console.log('Platform:', Platform.OS);
              console.log('Is requesting:', isRequestingPermission);
              
              // Immediate user feedback for debugging
              if (Platform.OS === 'web') {
                console.log('WEB: TouchableOpacity press confirmed');
              }
              
              // Call permission handler immediately
              handlePermissionRequest();
            }}
            disabled={isRequestingPermission}
            activeOpacity={0.7}
          >
            <Text style={styles.grantPermissionButtonText}>
              {isRequestingPermission ? "Requesting..." : "Grant Permission"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!updatedCamera) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'No Camera', headerShown: false }} />
        <View style={styles.noCameraContainer}>
          <Text style={styles.noCameraTitle}>No Active Camera</Text>
          <Text style={styles.noCameraText}>
            {id ? `Camera ${id} not found or inactive` : 'Create or join a camera to start taking photos'}
          </Text>
          <Button title="Go Home" onPress={() => router.push('/')} />
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current: FlashMode) => (current === 'off' ? 'on' : 'off'));
  };

  // Web-specific photo capture using canvas
  const captureWebPhoto = useCallback(async (): Promise<string | null> => {
    if (!webVideoRef || !canvasRef.current) {
      console.log('Web video or canvas not available');
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const video = webVideoRef;
      
      // Set canvas size to video dimensions for high quality
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob with high quality
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            console.log('Web photo captured:', url);
            resolve(url);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.9); // High quality JPEG
      });
    } catch (error) {
      console.error('Web photo capture failed:', error);
      return null;
    }
  }, [webVideoRef]);

  const takePicture = async () => {
    console.log('=== TAKE PICTURE CALLED ===');
    console.log('Platform:', Platform.OS);
    console.log('Camera ref exists:', !!cameraRef.current);
    console.log('Web video ref exists:', !!webVideoRef);
    console.log('Updated camera exists:', !!updatedCamera);
    console.log('Is uploading:', isUploading);
    
    if (!updatedCamera || isUploading) {
      console.log('Early return - missing requirements');
      return;
    }

    // Platform-specific camera check
    if (Platform.OS === 'web' && !webVideoRef) {
      console.log('Web video not ready');
      alert('Camera not ready. Please refresh and try again.');
      return;
    }
    
    if (Platform.OS !== 'web' && !cameraRef.current) {
      console.log('Native camera ref not ready');
      return;
    }

    // Get current user identifier (guest name or user email)
    const currentUserIdentifier = currentSession?.guestName || user?.email || 'Current User';
    console.log('Current user identifier:', currentUserIdentifier);
    
    // Check if user has remaining photos
    const currentUserPhotos = updatedCamera.photos.filter(photo => photo.takenBy === currentUserIdentifier);
    console.log('Current user photos:', currentUserPhotos.length);
    console.log('Max photos per person:', updatedCamera.maxPhotosPerPerson);
    
    if (currentUserPhotos.length >= updatedCamera.maxPhotosPerPerson) {
      console.log('Photo limit reached');
      const message = 'You have reached the maximum number of photos for this camera.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Photo Limit Reached', message);
      }
      return;
    }

    console.log('Starting photo capture...');
    setIsUploading(true);
    
    // Show flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    try {
      let photoUri: string | null = null;
      
      if (Platform.OS === 'web') {
        console.log('Using web photo capture...');
        photoUri = await captureWebPhoto();
      } else {
        console.log('Using native photo capture...');
        const photo = await cameraRef.current!.takePictureAsync({
          quality: 0.9, // Higher quality
          base64: false,
        });
        photoUri = photo?.uri || null;
      }
      
      console.log('Photo capture result:', photoUri ? 'SUCCESS' : 'FAILED');
      console.log('Photo URI:', photoUri);

      if (photoUri) {
        console.log('Adding photo to store...');
        
        // Add to local store
        addPhoto(updatedCamera.id, {
          uri: photoUri,
          takenBy: currentUserIdentifier,
          takenAt: new Date(),
          isRevealed: updatedCamera.revealDelayType === 'immediate',
        });

        const remainingAfter = Math.max(0, updatedCamera.maxPhotosPerPerson - currentUserPhotos.length - 1);
        console.log('Photo added successfully. Remaining:', remainingAfter);
        
        // Provide immediate feedback
        const message = `Photo saved! ${remainingAfter} photos remaining.`;
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Photo Saved!', message);
        }
      } else {
        console.log('No photo URI returned');
        throw new Error('Failed to capture photo');
      }
    } catch (error: any) {
      console.error('=== PHOTO CAPTURE ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      const errorMessage = error?.message || 'Failed to take picture. Please try again.';
      
      if (Platform.OS === 'web') {
        alert(`Camera Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      console.log('Photo capture finished');
      setIsUploading(false);
    }
  };

  // Calculate remaining photos for current user - get fresh data each render
  const currentUserIdentifier = currentSession?.guestName || user?.email || 'Current User';
  const userPhotos = updatedCamera?.photos.filter(photo => photo.takenBy === currentUserIdentifier) || [];
  const remainingPhotos = updatedCamera ? Math.max(0, updatedCamera.maxPhotosPerPerson - userPhotos.length) : 0;
  
  const timeRemaining = updatedCamera ? Math.max(0, updatedCamera.endDate.getTime() - Date.now()) : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  // Calculate accurate display zoom
  // CameraView zoom goes from 0 to 1, where:
  // 0 = minimum zoom (typically 0.5x on most phones)
  // 1 = maximum zoom (typically 10x on most phones)
  // So we need to map this to actual zoom levels
  const minZoomLevel = 0.5;
  const maxZoomLevel = 10;
  const actualZoom = minZoomLevel + (zoom * (maxZoomLevel - minZoomLevel));

  // Smooth zoom controls for manual adjustment
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(1, zoom + 0.05); // Smaller increments for smoother zoom
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0, zoom - 0.05); // Smaller increments for smoother zoom
    setZoom(newZoom);
  }, [zoom]);

  // Cleanup web stream on unmount
  useEffect(() => {
    return () => {
      if (webStream) {
        webStream.getTracks().forEach(track => track.stop());
      }
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [webStream]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: updatedCamera.name, headerShown: false }} />
      <View style={styles.cameraContainer} {...panResponder.panHandlers}>
        {Platform.OS === 'web' && webVideoRef ? (
          // Web: Use HTML video element for better quality and control
          <div 
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}
            ref={(div) => {
              if (div && webVideoRef && !div.contains(webVideoRef)) {
                webVideoRef.style.width = '100%';
                webVideoRef.style.height = '100%';
                webVideoRef.style.objectFit = 'cover';
                webVideoRef.style.transform = `scale(${1 + zoom * 2})`; // Apply zoom
                webVideoRef.style.transition = isZooming ? 'none' : 'transform 0.2s ease';
                div.appendChild(webVideoRef);
              }
            }}
          />
        ) : (
          // Native: Use CameraView
          <CameraView 
            style={styles.camera} 
            facing={facing} 
            ref={cameraRef}
            zoom={zoom}
            flash={flash}
          />
        )}
        
        {/* Flash Effect Overlay */}
        {showFlash && (
          <View style={styles.flashOverlay} />
        )}
        
        {/* Common overlay for both web and native */}
        <View style={styles.overlayContainer}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <X size={24} color={theme.colors.text} />
              </Pressable>
              
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraName}>{updatedCamera.name}</Text>
                <Text style={styles.timeRemaining}>
                  {hoursRemaining}h {minutesRemaining}m remaining
                </Text>
              </View>
              
              <View style={styles.topRightSpace} />
            </View>

            {/* Right Side Controls */}
            <View style={styles.rightControls}>
              {/* Flash Toggle */}
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

              {/* Zoom Indicator */}
              <View style={styles.zoomIndicator}>
                <Text style={styles.zoomText}>{actualZoom.toFixed(1)}x</Text>
              </View>
            </View>

            {/* Improved Manual Zoom Controls */}
            <View style={styles.manualZoomControls}>
              <TouchableOpacity
                style={[styles.zoomButton, zoom <= 0 && styles.zoomButtonDisabled]}
                onPress={handleZoomOut}
                disabled={zoom <= 0}
                activeOpacity={0.7}
              >
                <Text style={styles.zoomButtonText}>-</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.zoomButton, zoom >= 1 && styles.zoomButtonDisabled]}
                onPress={handleZoomIn}
                disabled={zoom >= 1}
                activeOpacity={0.7}
              >
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Debug: HTML Shutter Button for Web Testing */}
            {Platform.OS === 'web' && (
              <div style={{ 
                position: 'absolute', 
                top: '300px', 
                alignSelf: 'center',
                textAlign: 'center',
                zIndex: 1000
              }}>
                <button
                  onClick={() => {
                    console.log('HTML SHUTTER BUTTON CLICKED');
                    takePicture();
                  }}
                  disabled={remainingPhotos === 0 || isUploading}
                  style={{
                    padding: '15px 30px',
                    backgroundColor: remainingPhotos === 0 || isUploading ? '#666' : '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: remainingPhotos === 0 || isUploading ? 'not-allowed' : 'pointer',
                    opacity: remainingPhotos === 0 || isUploading ? 0.5 : 1
                  }}
                >
                  {isUploading ? 'Taking Photo...' : 'DEBUG: Take Photo'}
                </button>
              </div>
            )}

            {/* Bottom Controls - Fixed positioning */}
            <View style={styles.bottomContainer}>
              {/* Photo Counter */}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCountText}>
                  {isUploading ? 'Taking photo...' : `${remainingPhotos} photos left`}
                </Text>
                <Text style={styles.photoCountText}>
                  {userPhotos.length} taken
                </Text>
                {isUploading && (
                  <View style={styles.uploadingIndicator}>
                    <Upload size={16} color={theme.colors.primary} />
                  </View>
                )}
              </View>

              {/* Camera Controls */}
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
                    (remainingPhotos === 0 || isUploading) && styles.shutterButtonDisabled,
                  ]}
                  onPress={() => {
                    console.log('=== SHUTTER BUTTON PRESSED ===');
                    console.log('Timestamp:', new Date().toISOString());
                    console.log('Platform:', Platform.OS);
                    console.log('Remaining photos:', remainingPhotos);
                    console.log('Is uploading:', isUploading);
                    console.log('Button disabled:', remainingPhotos === 0 || isUploading);
                    
                    // Immediate feedback for debugging
                    if (Platform.OS === 'web') {
                      console.log('WEB: Shutter button press confirmed');
                    }
                    
                    // Call the photo capture function
                    takePicture();
                  }}
                  disabled={remainingPhotos === 0 || isUploading}
                  activeOpacity={0.7}
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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    opacity: 0.8,
    zIndex: 1000,
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
  zoomIndicator: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  manualZoomControls: {
    position: 'absolute',
    top: 220,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    zIndex: 100,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomButtonDisabled: {
    opacity: 0.5,
  },
  zoomButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
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
  uploadingIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
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
    fontFamily: 'Chewy_400Regular',
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
  noCameraContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  noCameraTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  noCameraText: {
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
  grantPermissionButtonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.textSecondary,
  },
  grantPermissionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  debugInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.lg,
    alignSelf: 'stretch',
  },
  debugText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
});