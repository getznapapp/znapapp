import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Calendar, Zap, ChevronRight, Camera, Share2, Image, Edit3, Clock } from 'lucide-react-native';
import { useCameraStore } from '@/store/camera-store';
import { useGuestStore } from '@/store/guest-store';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { QRCodeModal } from '@/components/QRCodeModal';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { LoadingScreen } from '@/components/LoadingScreen';
import { trpcClient, shouldUseBackend } from '@/lib/trpc';
import { supabaseDirect } from '@/lib/supabase-direct';

// Guest Home Component
function GuestHomeView() {
  const { currentSession } = useGuestStore();
  const { findCameraById } = useCameraStore();
  const [photoCount, setPhotoCount] = useState(0);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  
  if (!currentSession) return null;
  
  const camera = findCameraById(currentSession.cameraId);
  
  // Fetch photo count from Supabase
  const fetchPhotoCount = async () => {
    if (!currentSession.cameraId) {
      setPhotoCount(0);
      return;
    }
    
    setIsLoadingPhotos(true);
    try {
      let photoList: any[] = [];
      
      // Try backend first if available
      if (shouldUseBackend()) {
        try {
          const result = await trpcClient.photo.list.query({ 
            cameraId: currentSession.cameraId, 
            includeHidden: true 
          });
          photoList = result.photos;
        } catch (backendError) {
          console.log('Backend fetch failed, trying direct Supabase:', backendError);
          
          // Fallback to direct Supabase
          const photoResult = await supabaseDirect.listPhotos({ 
            cameraId: currentSession.cameraId, 
            includeHidden: true 
          });
          photoList = photoResult.photos;
        }
      } else {
        // Use direct Supabase
        const photoResult = await supabaseDirect.listPhotos({ 
          cameraId: currentSession.cameraId, 
          includeHidden: true 
        });
        photoList = photoResult.photos;
      }
      
      setPhotoCount(photoList.length);
    } catch (error) {
      console.error('Failed to fetch photo count:', error);
      setPhotoCount(0);
    } finally {
      setIsLoadingPhotos(false);
    }
  };
  
  // Fetch photo count when component mounts
  useEffect(() => {
    fetchPhotoCount();
  }, [currentSession.cameraId]);
  
  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      const hoursAgo = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      return `Ended ${hoursAgo}h ago`;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Ends in ${hours}h ${minutes}m`;
    }
    return `Ends in ${minutes}m`;
  };

  const handleCameraTap = () => {
    // Set the current camera in the store for guest users
    const { setCurrentCamera } = useCameraStore.getState();
    if (displayCamera) {
      setCurrentCamera(displayCamera as any);
    }
    router.push('/(tabs)/camera');
  };

  // Create mock camera if not found
  const displayCamera = camera || {
    id: currentSession.cameraId,
    name: `Event Camera ${currentSession.cameraId.slice(-6)}`,
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    photos: [],
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.guestHeader}>
          <Text style={styles.guestTitle}>Welcome!</Text>
          <Text style={styles.guestSubtitle}>
            Hi {currentSession.guestName}, you're part of the event
          </Text>
        </View>

        {/* Current Event Card */}
        <View style={styles.eventSection}>
          <Text style={styles.sectionTitle}>Current Event</Text>
          <Pressable
            style={({ pressed }) => [
              styles.eventCard,
              pressed && styles.eventCardPressed,
            ]}
            onPress={handleCameraTap}
          >
            <View style={styles.eventCardContent}>
              <View style={styles.cameraIcon}>
                <Camera size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{displayCamera.name}</Text>
                <View style={styles.eventDetails}>
                  <Image size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.eventDetailText}>
                    {isLoadingPhotos ? 'Loading...' : `${photoCount} Photos`}
                  </Text>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.eventDetailText}>
                    {formatTimeRemaining(displayCamera.endDate)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.colors.textTertiary} />
            </View>
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>1</Text>
            </View>
            <Text style={styles.infoItemText}>Take photos during the event</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>2</Text>
            </View>
            <Text style={styles.infoItemText}>Photos are revealed when the event ends</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>3</Text>
            </View>
            <Text style={styles.infoItemText}>Everyone gets access to all photos</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const user = useAuthStore(state => state.user);
  const loading = useAuthStore(state => state.loading);
  const initialized = useAuthStore(state => state.initialized);
  const cameras = useCameraStore(state => state.cameras);
  const loadCameras = useCameraStore(state => state.loadCameras);
  const addCamera = useCameraStore(state => state.addCamera);
  const { currentSession, loadSessions } = useGuestStore();
  const [editingName, setEditingName] = useState(false);
  const [cameraName, setCameraName] = useState('Weekend Getaway');
  const [showQRModal, setShowQRModal] = useState(false);
  const [cameraPhotoCounts, setCameraPhotoCounts] = useState<Record<string, number>>({});
  const [isLoadingPhotoCounts, setIsLoadingPhotoCounts] = useState(false);

  // Get active cameras
  const activeCameras = cameras.filter(camera => camera.isActive);

  // Fetch photo counts for all active cameras
  const fetchCameraPhotoCounts = useCallback(async () => {
    const activeList = cameras.filter(camera => camera.isActive);
    if (activeList.length === 0) {
      console.log('No active cameras to fetch photo counts for');
      return;
    }
    
    console.log('Fetching photo counts for cameras:', activeList.map(c => ({ id: c.id, name: c.name })));
    setIsLoadingPhotoCounts(true);
    const counts: Record<string, number> = {};
    
    try {
      for (const camera of activeList) {
        try {
          console.log('Fetching photos for camera:', camera.name, '(', camera.id, ')');
          let photoList: any[] = [];
          
          // Always start with local data as baseline
          const localPhotos = camera.photos || [];
          photoList = localPhotos;
          console.log('Local photos for', camera.name, ':', localPhotos.length);
          
          // Try to enhance with backend/Supabase data if available
          try {
            if (shouldUseBackend()) {
              try {
                const result = await Promise.race([
                  trpcClient.photo.list.query({ 
                    cameraId: camera.id, 
                    includeHidden: true 
                  }),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Backend timeout')), 3000)
                  )
                ]);
                
                if (result && (result as any).photos) {
                  photoList = (result as any).photos;
                  console.log('Backend returned', photoList.length, 'photos for camera', camera.name);
                }
              } catch (backendError) {
                console.log('Backend fetch failed for camera', camera.name, ', trying direct Supabase:', backendError);
                
                // Fallback to direct Supabase with timeout
                const photoResult = await Promise.race([
                  supabaseDirect.listPhotos({ 
                    cameraId: camera.id, 
                    includeHidden: true 
                  }),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Supabase timeout')), 3000)
                  )
                ]);
                
                if (photoResult && (photoResult as any).photos) {
                  photoList = (photoResult as any).photos;
                  console.log('Direct Supabase returned', photoList.length, 'photos for camera', camera.name);
                }
              }
            } else {
              // Use direct Supabase with timeout
              const photoResult = await Promise.race([
                supabaseDirect.listPhotos({ 
                  cameraId: camera.id, 
                  includeHidden: true 
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Supabase timeout')), 3000)
                )
              ]);
              
              if (photoResult && (photoResult as any).photos) {
                photoList = (photoResult as any).photos;
                console.log('Direct Supabase returned', photoList.length, 'photos for camera', camera.name);
              }
            }
          } catch (networkError) {
            console.log('Network fetch failed for camera', camera.name, ', using local data:', networkError);
            // Continue with local data
          }
          
          counts[camera.id] = photoList.length;
          console.log('Set photo count for', camera.name, ':', photoList.length);
        } catch (error) {
          console.error('Failed to fetch photo count for camera', camera.name, '(', camera.id, '):', error);
          // Use local photo count as fallback
          const localCount = camera.photos?.length || 0;
          counts[camera.id] = localCount;
          console.log('Using local photo count for', camera.name, ':', localCount);
        }
      }
      
      console.log('Final photo counts:', counts);
      setCameraPhotoCounts(counts);
    } catch (error) {
      console.error('Failed to fetch camera photo counts:', error);
      // Set local counts as fallback
      const fallbackCounts: Record<string, number> = {};
      activeList.forEach(camera => {
        fallbackCounts[camera.id] = camera.photos?.length || 0;
      });
      setCameraPhotoCounts(fallbackCounts);
    } finally {
      setIsLoadingPhotoCounts(false);
    }
  }, [cameras]);

  useEffect(() => {
    if (user && initialized) {
      loadCameras();
    }
    // Always load guest sessions
    loadSessions();
  }, [user, initialized]);
  
  // Fetch photo counts when cameras change
  useEffect(() => {
    if (cameras.length > 0) {
      const activeList = cameras.filter(camera => camera.isActive);
      if (activeList.length > 0) {
        console.log('Fetching photo counts for', activeList.length, 'active cameras');
        fetchCameraPhotoCounts();
      }
    }
  }, [cameras.length, fetchCameraPhotoCounts]); // Depend on fetchCameraPhotoCounts to ensure it's called when cameras update
  
  // Also refetch photo counts periodically to keep them updated
  useEffect(() => {
    const interval = setInterval(() => {
      if (cameras.length > 0) {
        const activeList = cameras.filter(camera => camera.isActive);
        if (activeList.length > 0) {
          console.log('Periodic photo count refresh');
          fetchCameraPhotoCounts();
        }
      }
    }, 15000); // Refresh every 15 seconds to reduce load
    
    return () => clearInterval(interval);
  }, [fetchCameraPhotoCounts]);
  
  // Force refresh photo counts when screen comes into focus
  useEffect(() => {
    const handleFocus = () => {
      // Refresh when returning to this screen
      if (cameras.length > 0) {
        const activeList = cameras.filter(camera => camera.isActive);
        if (activeList.length > 0) {
          console.log('Screen focus photo count refresh');
          fetchCameraPhotoCounts();
        }
      }
    };
    
    // Call once on mount
    handleFocus();
    
    return () => {
      // Cleanup if needed
    };
  }, [cameras.length, fetchCameraPhotoCounts]);

  // Show loading screen while checking auth state
  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  // If there's a guest session, show guest home
  if (currentSession && !user) {
    return <GuestHomeView />;
  }

  // Redirect to auth if not signed in and no guest session
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const currentCamera = activeCameras[0]; // Show first active camera

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      const hoursAgo = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      return `Ended ${hoursAgo}h ago`;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Ends in ${hours}h ${minutes}m`;
    }
    return `Ends in ${minutes}m`;
  };

  const handleShare = () => {
    if (currentCamera) {
      setShowQRModal(true);
    } else {
      Alert.alert('No Active Camera', 'Create a camera first to share');
    }
  };
  








  const handleGallery = () => {
    if (currentCamera) {
      router.push(`/camera/${currentCamera.id}`);
    } else {
      Alert.alert('No Active Camera', 'Create a camera first to view gallery');
    }
  };

  const handleNameEdit = () => {
    setEditingName(false);
    // TODO: Save name to current camera
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.cameraIllustration}>
            <View style={styles.phoneDevice}>
              <View style={styles.cameraModule}>
                <View style={[styles.lens, styles.mainLens]} />
                <View style={[styles.lens, styles.secondaryLens]} />
                <View style={[styles.lens, styles.tertiaryLens]} />
                <View style={styles.flash} />
              </View>
              <View style={styles.screenArea} />
            </View>
          </View>
          <Text style={styles.subtitle}>Your event camera is ready to roll.</Text>
        </Card>

        {/* Camera Name */}
        <View style={styles.nameSection}>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={cameraName}
              onChangeText={setCameraName}
              onBlur={handleNameEdit}
              onSubmitEditing={handleNameEdit}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable
              style={styles.nameContainer}
              onPress={() => setEditingName(true)}
            >
              <Text style={styles.cameraName}>{cameraName}</Text>
              <Edit3 size={16} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Event Status */}
        {currentCamera && (
          <View style={styles.statusSection}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statusText}>
              {formatTimeRemaining(currentCamera.endDate)}
            </Text>
          </View>
        )}

        {/* Action Pills */}
        <View style={styles.pillsContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={handleGallery}
          >
            <Image size={18} color={theme.colors.text} />
            <Text style={styles.pillText}>Gallery</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={handleShare}
          >
            <Share2 size={18} color={theme.colors.text} />
            <Text style={styles.pillText}>Share</Text>
          </Pressable>
        </View>



        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryCTA,
              pressed && styles.ctaPressed,
            ]}
            onPress={() => router.push('/screens/CreateCamera')}
          >
            <Text style={styles.primaryCTAText}>Schedule a Znap Camera</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryCTA,
              pressed && styles.ctaPressed,
            ]}
            onPress={() => router.push('/instant-camera')}
          >
            <Text style={styles.secondaryCTAText}>Start Instant Camera</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.tertiaryCTA,
              pressed && styles.ctaPressed,
            ]}
            onPress={() => router.push('/screens/JoinCamera')}
          >
            <Text style={styles.tertiaryCTAText}>Join Camera</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.debugCTA,
              pressed && styles.ctaPressed,
            ]}
            onPress={() => router.push('/test-camera-offline')}
          >
            <Text style={styles.debugCTAText}>Test Camera (Offline)</Text>
          </Pressable>
        </View>

        {/* Active Cameras List */}
        {activeCameras.length > 0 && (
          <View style={styles.camerasSection}>
            <Text style={styles.sectionTitle}>Active Cameras</Text>
            {activeCameras.map((camera) => (
              <Pressable
                key={camera.id}
                style={({ pressed }) => [
                  styles.cameraCard,
                  pressed && styles.cameraCardPressed,
                ]}
                onPress={() => router.push(`/camera/${camera.id}`)}
              >
                <View style={styles.cameraCardContent}>
                  <View style={styles.cameraIcon}>
                    <Camera size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.cameraInfo}>
                    <Text style={styles.cameraCardName}>{camera.name}</Text>
                    <Text style={styles.cameraDetails}>
                      {isLoadingPhotoCounts ? 'Loading...' : `${cameraPhotoCounts[camera.id] || 0} Photos`} • {camera.maxPhotosPerPerson} Max Per Person
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.textTertiary} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      {currentCamera && (
        <QRCodeModal
          visible={showQRModal}
          onClose={() => setShowQRModal(false)}
          cameraId={currentCamera.id}
          cameraName={currentCamera.name}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Further increased bottom padding to prevent cut-off
    flexGrow: 1, // Ensure content can grow to fill space
    minHeight: '100%', // Ensure minimum height for proper scrolling
  },
  headerCard: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cameraIllustration: {
    marginBottom: theme.spacing.lg,
  },
  phoneDevice: {
    width: 120,
    height: 240,
    backgroundColor: '#2A2A3A',
    borderRadius: 24,
    padding: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  cameraModule: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 48,
    height: 48,
    backgroundColor: '#1A1A2A',
    borderRadius: 12,
    padding: 4,
  },
  lens: {
    position: 'absolute',
    backgroundColor: '#0A0A1A',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  mainLens: {
    width: 20,
    height: 20,
    top: 4,
    right: 4,
  },
  secondaryLens: {
    width: 14,
    height: 14,
    bottom: 4,
    left: 4,
  },
  tertiaryLens: {
    width: 12,
    height: 12,
    bottom: 4,
    right: 8,
  },
  flash: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    top: 6,
    left: 6,
  },
  screenArea: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    borderRadius: 20,
    marginTop: 60,
    margin: 8,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  nameSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  cameraName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  nameInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pillPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.2,
  },
  pillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  ctaContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  primaryCTA: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryCTA: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryCTAText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  secondaryCTAText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  tertiaryCTA: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tertiaryCTAText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },

  camerasSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100, // Further increased padding bottom to prevent cut-off
    marginBottom: theme.spacing.xl, // Increased margin for better spacing
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  cameraCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cameraCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cameraCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cameraIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraInfo: {
    flex: 1,
  },
  cameraCardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  cameraDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Guest Home Styles
  guestHeader: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  guestTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  guestSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  eventSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  eventCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  eventCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  eventDetailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  infoSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  infoNumber: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNumberText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  infoItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  debugCTA: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  debugCTAText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: '#ff6b6b',
  },

});