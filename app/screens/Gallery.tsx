import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Camera, Lock, Clock, ArrowLeft, RefreshCw, Cloud, WifiOff } from 'lucide-react-native';
import { trpc, shouldUseBackend } from '@/lib/trpc';
import { useCameraStore } from '@/store/camera-store';
import { Card } from '@/components/Card';
import { PhotoGrid } from '@/components/PhotoGrid';
import { CloudSyncStatus } from '@/components/CloudSyncStatus';
import { getOfflinePhotosByCamera } from '@/lib/image-upload';
import { supabaseDirect } from '@/lib/supabase-direct';
import { theme } from '@/constants/theme';

export default function GalleryScreen() {
  const { cameraId } = useLocalSearchParams<{ cameraId: string }>();
  const { cameras } = useCameraStore();
  const [countdown, setCountdown] = useState<string>('');
  const [offlinePhotos, setOfflinePhotos] = useState<any[]>([]);

  // Get camera data from store
  const camera = cameras.find(c => c.id === cameraId);

  // Load offline photos
  useEffect(() => {
    if (cameraId) {
      getOfflinePhotosByCamera(cameraId).then(photos => {
        const formattedPhotos = photos.map(photo => ({
          id: photo.id,
          uri: photo.imageUri,
          publicUrl: photo.imageUri,
          userName: photo.userName,
          uploadedAt: photo.uploadedAt,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          isOffline: true,
          isRevealed: true, // Offline photos are always considered revealed
        }));
        setOfflinePhotos(formattedPhotos);
      });
    }
  }, [cameraId]);

  // Fetch cloud photos (try both backend and direct Supabase)
  const cloudPhotosQuery = trpc.photo.list.useQuery(
    { 
      cameraId: cameraId || '',
      includeHidden: true // Include hidden photos to get total count
    },
    { 
      enabled: !!cameraId && shouldUseBackend(),
      refetchInterval: shouldUseBackend() ? 15000 : false, // Refetch every 15 seconds if backend available
    }
  );
  
  // Also fetch from direct Supabase as fallback/enhancement
  const [directPhotos, setDirectPhotos] = useState<any[]>([]);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  
  const fetchDirectPhotos = useCallback(async () => {
    if (!cameraId) return;
    
    setIsLoadingDirect(true);
    try {
      const result = await supabaseDirect.listPhotos({
        cameraId,
        includeHidden: true
      });
      
      if (result.success && result.photos) {
        console.log('Direct Supabase photos fetched:', result.photos.length);
        setDirectPhotos(result.photos.map((photo: any) => ({
          ...photo,
          isRevealed: true, // For now, show all photos from direct fetch
          uri: photo.publicUrl,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch direct photos:', error);
      setDirectPhotos([]);
    } finally {
      setIsLoadingDirect(false);
    }
  }, [cameraId]);
  
  // Fetch direct photos on mount and periodically
  useEffect(() => {
    fetchDirectPhotos();
    
    const interval = setInterval(fetchDirectPhotos, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchDirectPhotos]);

  type RevealData = {
    revealed: boolean;
    revealTime: string;
    revealDelayType: 'immediate' | '12h' | '24h' | 'custom';
  };

  // Check if gallery is revealed (only if backend is available)
  const query = trpc.camera.isRevealed.useQuery(
    { cameraId: cameraId || '' },
    { 
      enabled: !!cameraId && shouldUseBackend(),
      refetchInterval: 30000, // Refetch every 30 seconds if backend available
    }
  );

  // If backend is not available, consider gallery always revealed for offline photos
  const revealed = shouldUseBackend() ? (query.data?.revealed ?? false) : true;
  const revealTime = query.data?.revealTime;
  const revealDelayType = query.data?.revealDelayType;
  const { isLoading, error, refetch } = query;

  // Countdown timer effect
  useEffect(() => {
    if (!revealTime || revealed) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const revealTimeMs = new Date(revealTime).getTime();
      const difference = revealTimeMs - now;

      if (difference <= 0) {
        setCountdown('');
        refetch(); // Check reveal status again
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [revealTime, revealed, refetch]);

  if (!cameraId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Gallery' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Camera Selected</Text>
          <Text style={styles.errorText}>Please select a camera to view its gallery.</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={theme.colors.text} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!camera) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Gallery' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Camera Not Found</Text>
          <Text style={styles.errorText}>This camera may have been deleted or doesn't exist.</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={theme.colors.text} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formatRevealTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRevealTypeDescription = (type: string) => {
    switch (type) {
      case 'immediate':
        return 'Photos are revealed immediately';
      case '12h':
        return 'Photos revealed 12 hours after event ends';
      case '24h':
        return 'Photos revealed 24 hours after event ends';
      case 'custom':
        return 'Photos revealed at custom time';
      default:
        return 'Photos will be revealed soon';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: camera.name }} />
        <View style={styles.loadingContainer}>
          <RefreshCw size={32} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking gallery status...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: camera.name }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Gallery</Text>
          <Text style={styles.errorText}>
            {error.message || 'Failed to check gallery status'}
          </Text>
          <Pressable 
            style={styles.retryButton} 
            onPress={() => refetch()}
          >
            <RefreshCw size={20} color={theme.colors.text} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Gallery locked state
  if (!revealed) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: camera.name }} />
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refetch()}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Card style={styles.lockedCard}>
            <View style={styles.lockedIcon}>
              <Lock size={48} color={theme.colors.textTertiary} />
            </View>
            
            <Text style={styles.lockedTitle}>Gallery Locked</Text>
            <Text style={styles.lockedSubtitle}>Photos will unlock soon</Text>
            
            <View style={styles.revealInfo}>
              <Text style={styles.revealDescription}>
                {getRevealTypeDescription(revealDelayType || '')}
              </Text>
              
              {revealTime && (
                <Text style={styles.revealTime}>
                  Unlock time: {formatRevealTime(revealTime)}
                </Text>
              )}
              
              {countdown && (
                <View style={styles.countdownContainer}>
                  <Clock size={16} color={theme.colors.primary} />
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.photoPreview}>
              <View style={styles.photoPlaceholder}>
                <Camera size={24} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.photoPlaceholder}>
                <Camera size={24} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.photoPlaceholder}>
                <Camera size={24} color={theme.colors.textTertiary} />
              </View>
            </View>
            
            <Text style={styles.photoCount}>
              {(() => {
                const cloudTotal = cloudPhotosQuery.data?.total || 0;
                const localTotal = camera?.photos.length || 0;
                const offlineTotal = offlinePhotos.length || 0;
                const totalPhotos = Math.max(cloudTotal, localTotal) + offlineTotal;
                return `${totalPhotos} photo${totalPhotos !== 1 ? 's' : ''} waiting to be revealed`;
              })()} 
            </Text>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Gallery unlocked - show photos
  const localRevealedPhotos = camera?.photos.filter(photo => photo.isRevealed) || [];
  const cloudPhotos = cloudPhotosQuery.data?.photos?.filter(photo => photo.isRevealed) || [];
  
  // Combine local, cloud, direct, and offline photos
  const allPhotos = [...cloudPhotos, ...directPhotos, ...localRevealedPhotos, ...offlinePhotos];
  
  // Remove duplicates based on similar timestamps, URLs, or IDs
  const uniquePhotos = allPhotos.filter((photo, index, arr) => {
    return arr.findIndex(p => {
      // Check for exact ID match
      if (p.id && photo.id && p.id === photo.id) return true;
      
      // Check for URL match
      if (p.publicUrl === photo.uri || p.uri === photo.publicUrl) return true;
      
      // Check for similar upload times (within 5 seconds)
      if (p.uploadedAt && photo.uploadedAt) {
        const timeDiff = Math.abs(new Date(p.uploadedAt).getTime() - new Date(photo.uploadedAt).getTime());
        if (timeDiff < 5000) return true;
      }
      
      // Check for similar file names
      if (p.fileName && photo.fileName && p.fileName === photo.fileName) return true;
      
      return false;
    }) === index;
  });
  
  // Sort photos by upload time (newest first)
  const revealedPhotos = uniquePhotos.sort((a, b) => {
    const timeA = new Date(a.uploadedAt || a.takenAt || 0).getTime();
    const timeB = new Date(b.uploadedAt || b.takenAt || 0).getTime();
    return timeB - timeA;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: camera.name }} />
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || cloudPhotosQuery.isLoading || isLoadingDirect}
            onRefresh={() => {
              refetch();
              cloudPhotosQuery.refetch();
              fetchDirectPhotos();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Gallery Header */}
        <Card style={styles.headerCard}>
          <View style={styles.galleryHeader}>
            <View style={styles.galleryIcon}>
              <Camera size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.galleryInfo}>
              <Text style={styles.galleryTitle}>Gallery Unlocked!</Text>
              <Text style={styles.gallerySubtitle}>
                {revealedPhotos.length} photo{revealedPhotos.length !== 1 ? 's' : ''} available
              </Text>
              <View style={styles.photoStatsContainer}>
                {(cloudPhotos.length > 0 || directPhotos.length > 0) && (
                  <View style={styles.cloudIndicator}>
                    <Cloud size={12} color={theme.colors.primary} />
                    <Text style={styles.cloudText}>
                      {Math.max(cloudPhotos.length, directPhotos.length)} cloud
                    </Text>
                  </View>
                )}
                {offlinePhotos.length > 0 && (
                  <View style={styles.offlineIndicatorContainer}>
                    <WifiOff size={12} color={theme.colors.warning} />
                    <Text style={styles.offlineTextContainer}>{offlinePhotos.length} offline</Text>
                  </View>
                )}
                {localRevealedPhotos.length > 0 && (
                  <View style={styles.cloudIndicator}>
                    <Text style={styles.cloudText}>{localRevealedPhotos.length} local</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Cloud Sync Status */}
        {(cloudPhotosQuery.isLoading || isLoadingDirect) && (
          <Card style={styles.statusCard}>
            <CloudSyncStatus 
              status="uploading" 
              message={cloudPhotosQuery.isLoading ? "Loading cloud photos..." : "Loading photos..."} 
              size="medium" 
            />
          </Card>
        )}

        {/* Photos Grid */}
        {revealedPhotos.length > 0 ? (
          <Card style={styles.photosCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              {(cloudPhotos.length > 0 || directPhotos.length > 0) && (
                <CloudSyncStatus 
                  status="success" 
                  message={`${Math.max(cloudPhotos.length, directPhotos.length)} synced`} 
                  size="small" 
                />
              )}
            </View>
            <PhotoGrid 
              photos={revealedPhotos.map(photo => ({
                id: photo.id || `photo_${Date.now()}_${Math.random()}`,
                uri: photo.uri || photo.publicUrl,
                publicUrl: photo.publicUrl || photo.uri,
                takenBy: photo.takenBy || photo.userId,
                userName: photo.userName || 'Anonymous',
                takenAt: photo.takenAt || photo.uploadedAt,
                uploadedAt: photo.uploadedAt || photo.takenAt,
                isRevealed: photo.isRevealed !== false, // Default to true unless explicitly false
                mimeType: photo.mimeType || 'image/jpeg',
                fileSize: photo.fileSize || 0,
              }))}
              columns={2}
            />
          </Card>
        ) : (
          <Card style={styles.emptyPhotos}>
            <Camera size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptyText}>
              Photos will appear here as they are taken and revealed.
            </Text>
          </Card>
        )}

        {/* Hidden Photos Info */}
        {camera && camera.photos.length > localRevealedPhotos.length && (
          <Card style={styles.hiddenPhotosCard}>
            <Text style={styles.hiddenPhotosTitle}>
              {camera.photos.length - localRevealedPhotos.length} local photos still hidden
            </Text>
            <Text style={styles.hiddenPhotosText}>
              These photos will be revealed based on the camera settings.
            </Text>
          </Card>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  errorTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  retryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  lockedCard: {
    margin: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  lockedTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  lockedSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  revealInfo: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  revealDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  revealTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  countdownText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  photoPreview: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  headerCard: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  galleryIcon: {
    width: 50,
    height: 50,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryInfo: {
    flex: 1,
  },
  galleryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  gallerySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  photosCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  statusCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  cloudIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cloudText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
  photoStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  offlineIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineTextContainer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: '500' as const,
  },
  emptyPhotos: {
    margin: theme.spacing.lg,
    marginTop: 0,
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  hiddenPhotosCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  hiddenPhotosTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  hiddenPhotosText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});