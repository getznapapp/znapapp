import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { theme } from '@/constants/theme';

export default function RedirectPage() {
  const { cameraId } = useLocalSearchParams<{ cameraId: string }>();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualCameraId, setActualCameraId] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      console.log('=== REDIRECT PAGE DEBUG ===');
      console.log('Platform:', Platform.OS);
      console.log('Camera ID from params:', cameraId);
      
      let finalCameraId: string | null = null;
      
      // Get camera ID from URL parameters on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.log('Full URL:', window.location.href);
        console.log('Search params:', window.location.search);
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlCameraId = urlParams.get('cameraId');
        finalCameraId = urlCameraId || cameraId;
        
        console.log('Camera ID from URL params:', urlCameraId);
        console.log('Final camera ID:', finalCameraId);
        
        // Auto-redirect to join page if we have a camera ID
        if (finalCameraId) {
          console.log('Auto-redirecting to join page with camera ID:', finalCameraId);
          // Use router.replace for better navigation
          setTimeout(() => {
            router.replace(`/join-camera?cameraId=${finalCameraId}`);
          }, 1500); // Reduced time for faster redirect
        }
      } else {
        finalCameraId = cameraId;
      }
      
      setActualCameraId(finalCameraId);
    } catch (err) {
      console.error('Error in redirect page:', err);
      setError('Failed to load redirect page');
    }
  }, [cameraId]);

  const handleOpenApp = () => {
    if (!actualCameraId) return;
    
    try {
      setIsOpening(true);
      
      if (Platform.OS === 'web') {
        const deepLinkUrl = `myapp://join?cameraId=${actualCameraId}`;
        
        // Try to open the app
        const tryOpenApp = () => {
          // Create a hidden iframe to attempt the deep link
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = deepLinkUrl;
          document.body.appendChild(iframe);
          
          // Clean up the iframe after a short delay
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 100);
        };
        
        // Set up fallback timer
        const fallbackTimer = setTimeout(() => {
          router.replace(`/join/${actualCameraId}`);
        }, 2500); // 2.5 second timeout
        
        // Listen for page visibility change (indicates app opened)
        const handleVisibilityChange = () => {
          if (document.hidden) {
            // Page became hidden, likely app opened
            clearTimeout(fallbackTimer);
          }
        };
        
        // Listen for blur event (another indicator app might have opened)
        const handleBlur = () => {
          clearTimeout(fallbackTimer);
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        
        // Try to open the app
        tryOpenApp();
        
        // Alternative method using window.location
        setTimeout(() => {
          try {
            window.location.href = deepLinkUrl;
          } catch (error) {
            // If deep link fails, the fallback timer will handle it
          }
        }, 500);
        
        // Cleanup after timeout
        setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('blur', handleBlur);
        }, 3000);
      } else {
        // On mobile, navigate directly
        router.replace(`/join/${actualCameraId}`);
      }
    } catch (err) {
      console.error('Error in handleOpenApp:', err);
      setError('Failed to open app');
      setIsOpening(false);
      // Fallback to web version
      router.replace(`/join/${actualCameraId}`);
    }
  };

  if (!actualCameraId) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Invalid Link</Text>
          <Text style={styles.subtitle}>
            This invite link is missing required information.
          </Text>
          <Text style={[styles.subtitle, { fontSize: 12, marginTop: 20 }]}>
            ✅ React app is working! Platform: {Platform.OS}
          </Text>
          <Text style={[styles.subtitle, { fontSize: 12 }]}>
            Route param: {cameraId || 'None'}
          </Text>
          {Platform.OS === 'web' && (
            <Text style={[styles.subtitle, { fontSize: 12 }]}>
              URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Join Camera Event</Text>
        <Text style={styles.subtitle}>
          {isOpening 
            ? "Opening app... If it doesn't open, you'll be redirected to the web version."
            : "You've been invited to join a camera! Tap the button below to open the Znap app, or continue in your browser."
          }
        </Text>
        
        {isOpening ? (
          <View style={styles.loader}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleOpenApp}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Open in App</Text>
          </TouchableOpacity>
        )}
        
        {!isOpening && (
          <TouchableOpacity 
            style={styles.webButton} 
            onPress={() => {
              router.replace(`/join/${actualCameraId}`);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.webButtonText}>Continue in Browser</Text>
          </TouchableOpacity>
        )}
        
        <Text style={[styles.subtitle, { fontSize: 12, marginTop: 20, opacity: 0.5 }]}>
          ✅ React app working! Platform: {Platform.OS}
        </Text>
        <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
          Route param: {cameraId || 'None'}
        </Text>
        <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
          Final ID: {actualCameraId || 'None'}
        </Text>
        {Platform.OS === 'web' && (
          <>
            <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
              URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
              Pathname: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
              Search: {typeof window !== 'undefined' ? window.location.search : 'N/A'}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 12, opacity: 0.5 }]}>
              Hash: {typeof window !== 'undefined' ? window.location.hash : 'N/A'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  webButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  webButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loader: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    opacity: 0.6,
  },
});