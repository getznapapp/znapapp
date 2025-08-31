import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Camera, Clock, Users, Filter, Settings } from 'lucide-react-native';
import { useCameraStore } from '@/store/camera-store';
import { trpc } from '@/lib/trpc';
import { theme } from '@/constants/theme';

interface CameraDetails {
  id: string;
  name: string;
  endDate: Date;
  revealDelayType: 'immediate' | '12h' | '24h' | 'custom';
  customRevealAt?: Date;
  filter: 'none' | 'disposable';
  allowCameraRoll: boolean;
  maxPhotosPerPerson: 20 | 25 | 30 | 50;
  photos: any[];
  isActive: boolean;
}

export default function CameraDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { findCameraById, setCurrentCamera, addCamera } = useCameraStore();
  const [camera, setCamera] = useState<CameraDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to get camera from backend first, then local store
  const cameraQuery = trpc.camera.get.useQuery(
    { cameraId: id || '' },
    { 
      enabled: !!id,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!id) return;

    // First check local store
    const localCamera = findCameraById(id);
    if (localCamera) {
      setCamera({
        id: localCamera.id,
        name: localCamera.name,
        endDate: localCamera.endDate,
        revealDelayType: localCamera.revealDelayType,
        customRevealAt: localCamera.customRevealAt,
        filter: localCamera.filter,
        allowCameraRoll: localCamera.allowCameraRoll,
        maxPhotosPerPerson: localCamera.maxPhotosPerPerson,
        photos: localCamera.photos,
        isActive: localCamera.isActive,
      });
      setIsLoading(false);
      return;
    }

    // If not found locally and backend query succeeded, use backend data
    if (cameraQuery.data?.success && cameraQuery.data.camera) {
      const backendCamera = cameraQuery.data.camera;
      const cameraDetails: CameraDetails = {
        id: backendCamera.id,
        name: backendCamera.name,
        endDate: new Date(backendCamera.endDate),
        revealDelayType: backendCamera.revealDelayType,
        customRevealAt: backendCamera.customRevealAt ? new Date(backendCamera.customRevealAt) : undefined,
        filter: backendCamera.filter,
        allowCameraRoll: backendCamera.allowCameraRoll,
        maxPhotosPerPerson: backendCamera.maxPhotosPerPerson,
        photos: backendCamera.photos || [],
        isActive: backendCamera.isActive,
      };
      setCamera(cameraDetails);
      setIsLoading(false);
    } else if (cameraQuery.error || cameraQuery.data?.success === false) {
      setIsLoading(false);
    }
  }, [id, findCameraById, cameraQuery.data, cameraQuery.error]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRevealDescription = () => {
    if (!camera) return '';
    
    switch (camera.revealDelayType) {
      case 'immediate':
        return 'Photos revealed immediately';
      case '12h':
        return '12 hours after event ends';
      case '24h':
        return '24 hours after event ends';
      case 'custom':
        return camera.customRevealAt ? `Custom time: ${formatDate(camera.customRevealAt)}` : 'Custom time';
      default:
        return 'Photos revealed immediately';
    }
  };

  const handleStartTakingPhotos = () => {
    if (!camera) return;

    // Create or update camera in local store
    const localCamera = findCameraById(camera.id);
    if (!localCamera) {
      // Add to local store if not exists
      const newCamera = addCamera({
        name: camera.name,
        startDate: new Date(),
        endDate: camera.endDate,
        maxPhotosPerPerson: camera.maxPhotosPerPerson,
        allowCameraRoll: camera.allowCameraRoll,
        revealDelayType: camera.revealDelayType,
        customRevealAt: camera.customRevealAt,
        filter: camera.filter,
        maxGuests: 25,
        isActive: camera.isActive,
        paidUpgrade: false,
      }, camera.id);
      setCurrentCamera(newCamera);
    } else {
      setCurrentCamera(localCamera);
    }

    // Navigate to camera tab
    router.replace('/(tabs)/camera');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera details...</Text>
        </View>
      </View>
    );
  }

  if (!camera) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Camera Not Found' }} />
        <View style={styles.errorContainer}>
          <Camera size={48} color={theme.colors.textTertiary} />
          <Text style={styles.errorTitle}>Camera Not Found</Text>
          <Text style={styles.errorText}>This camera may have been deleted or doesn't exist.</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const timeRemaining = Math.max(0, camera.endDate.getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Details',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTitleStyle: {
            color: theme.colors.text,
          },
          headerTintColor: theme.colors.text,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(camera.endDate)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reveal Photos</Text>
            <Text style={styles.detailValue}>{getRevealDescription()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Filter</Text>
            <Text style={styles.detailValue}>
              {camera.filter === 'none' ? 'None' : 'Disposable Film'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Camera Roll</Text>
            <Text style={styles.detailValue}>
              {camera.allowCameraRoll ? 'Allowed' : 'Blocked'}
            </Text>
          </View>
        </View>

        {/* Photos Section */}
        <View style={styles.photosCard}>
          <View style={styles.photosHeader}>
            <Camera size={48} color={theme.colors.textTertiary} />
            <Text style={styles.photosTitle}>No photos yet</Text>
            <Text style={styles.photosSubtitle}>Start taking photos to fill this camera!</Text>
          </View>
        </View>

        {/* Time Remaining */}
        {camera.isActive && timeRemaining > 0 && (
          <View style={styles.timeCard}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>
              {hoursRemaining}h {minutesRemaining}m remaining
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Pressable
          style={styles.startButton}
          onPress={handleStartTakingPhotos}
        >
          <Text style={styles.startButtonText}>Start Taking Photos</Text>
        </Pressable>
      </View>
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
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
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
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '600' as const,
    textAlign: 'right',
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  photosCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    margin: theme.spacing.lg,
    marginTop: 0,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  photosHeader: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  photosTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  photosSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.lg,
    marginTop: 0,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  actionContainer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
});