import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { theme } from '@/constants/theme';
import { supabaseDirect } from '@/lib/supabase-direct';
import { generateUUID } from '@/lib/uuid';

export default function TestCameraSimpleScreen() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [webStream, setWebStream] = useState<MediaStream | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  
  const cameraRef = useRef<any>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handlePermissionRequest = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setWebStream(stream);
        if (!webVideoRef.current) {
          webVideoRef.current = document.createElement('video');
          webVideoRef.current.autoplay = true;
          webVideoRef.current.playsInline = true;
        }
        webVideoRef.current.srcObject = stream;
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        setCameraPermissionGranted(true);
      } else {
        const result = await requestPermission();
        setCameraPermissionGranted(result?.granted || false);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setCameraPermissionGranted(false);
    }
  };

  // Web-specific photo capture using canvas
  const captureWebPhoto = useCallback(async (): Promise<string | null> => {
    if (!webVideoRef.current || !canvasRef.current) {
      console.log('Web video or canvas not available');
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const video = webVideoRef.current;
      
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
        canvas.toBlob((blob: Blob | null) => {
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
  }, []);

  const takePicture = async () => {
    console.log('=== TAKE PICTURE TEST ===');
    console.log('Platform:', Platform.OS);
    
    try {
      let photoUri: string | null = null;
      
      if (Platform.OS === 'web') {
        console.log('Using web photo capture...');
        photoUri = await captureWebPhoto();
      } else {
        console.log('Using native photo capture...');
        if (!cameraRef.current) {
          console.log('Camera ref not available');
          return;
        }
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
        });
        photoUri = photo?.uri || null;
      }
      
      console.log('Photo result:', photoUri ? 'SUCCESS' : 'FAILED');
      
      if (photoUri) {
        setPhotoCount((prev: number) => prev + 1);
        const message = `Photo ${photoCount + 1} captured successfully!`;
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Success', message);
        }
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (error: any) {
      console.error('Photo capture error:', error);
      const errorMessage = error?.message || 'Failed to take picture';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Initialize permissions on mount
  useEffect(() => {
    if (permission?.granted) {
      setCameraPermissionGranted(true);
    }
  }, [permission]);

  // Cleanup web stream on unmount
  useEffect(() => {
    return () => {
      if (webStream) {
        webStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [webStream]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermissionGranted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Camera Test', headerShown: true }} />
        <View style={styles.permissionContainer}>
          <Text style={styles.title}>Camera Test</Text>
          <Text style={styles.subtitle}>Simple camera functionality test</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handlePermissionRequest}
          >
            <Text style={styles.buttonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
          
          {Platform.OS === 'web' && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
              <Text style={styles.debugText}>Protocol: {window.location.protocol}</Text>
              <Text style={styles.debugText}>
                MediaDevices: {navigator.mediaDevices ? '✓' : '✗'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Camera Test', headerShown: true }} />
      
      {Platform.OS === 'web' && webVideoRef.current ? (
        // Web: Use HTML video element
        <div 
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#000'
          }}
          ref={(div) => {
            if (div && webVideoRef.current && !div.contains(webVideoRef.current)) {
              webVideoRef.current.style.width = '100%';
              webVideoRef.current.style.height = '100%';
              webVideoRef.current.style.objectFit = 'cover';
              div.appendChild(webVideoRef.current);
            }
          }}
        />
      ) : (
        // Native: Use CameraView
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
        />
      )}
      
      {/* Controls Overlay */}
      <View style={styles.overlay}>
        <View style={styles.controls}>
          <Text style={styles.counter}>Photos taken: {photoCount}</Text>
          
          <TouchableOpacity
            style={styles.shutterButton}
            onPress={takePicture}
          >
            <Text style={styles.shutterText}>📸</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing((current: CameraType) => current === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.flipText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterText: {
    fontSize: 30,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    fontSize: 24,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  debugText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
});