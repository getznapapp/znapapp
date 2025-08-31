import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, Platform } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Camera, Users, Clock, Share2, Play, Copy, QrCode, Link } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useCameraStore, Camera as CameraType } from '@/store/camera-store';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { theme } from '@/constants/theme';
import { generateInviteUrl } from '@/lib/deep-links';

export default function CameraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cameras, setCurrentCamera } = useCameraStore();
  const [camera, setCamera] = useState<CameraType | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    const foundCamera = cameras.find(c => c.id === id);
    if (foundCamera) {
      setCamera(foundCamera);
    }
  }, [id, cameras]);

  if (!camera) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Camera Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Camera Not Found</Text>
          <Text style={styles.errorText}>This camera may have been deleted or doesn't exist.</Text>
          <Button title="Go Home" onPress={() => router.push('/')} />
        </View>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeRemaining = Math.max(0, camera.endDate.getTime() - Date.now());
  const isActive = camera.isActive && timeRemaining > 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const handleStartCamera = () => {
    setCurrentCamera(camera);
    router.push('/(tabs)/camera');
  };

  const shareableLink = generateInviteUrl(camera.id);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareableLink);
      Alert.alert('Link Copied!', 'The camera invite link has been copied to your clipboard.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard.');
    }
  };

  const handleShare = () => {
    Alert.alert('Share Camera', 'Sharing functionality coming soon!');
  };

  const getRevealDescription = () => {
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
        return '24 hours after event ends';
    }
  };

  const revealedPhotos = camera.photos.filter(photo => photo.isRevealed);
  const canViewPhotos = !isActive || camera.revealDelayType === 'immediate';

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: camera.name,
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
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.cameraHeader}>
            <View style={styles.cameraIcon}>
              <Camera size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.cameraInfo}>
              <Text style={styles.cameraName}>{camera.name}</Text>
              <Text style={styles.cameraStatus}>
                {isActive ? 'Active' : 'Ended'}
              </Text>
            </View>
          </View>

          {isActive && (
            <View style={styles.timeRemaining}>
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text style={styles.timeText}>
                {hoursRemaining}h {minutesRemaining}m remaining
              </Text>
            </View>
          )}
        </Card>

        {/* Invite Section */}
        {isActive && (
          <Card style={styles.inviteCard}>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
            <Text style={styles.inviteDescription}>
              Share this camera with friends so they can join and take photos together
            </Text>

            {/* Share Link */}
            <View style={styles.linkSection}>
              <View style={styles.linkContainer}>
                <Link size={16} color={theme.colors.textSecondary} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {shareableLink}
                </Text>
              </View>
              
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleCopyLink}
              >
                <Copy size={16} color={theme.colors.text} />
                <Text style={styles.copyButtonText}>Copy</Text>
              </Pressable>
            </View>

            {/* QR Code Toggle */}
            <Pressable
              style={({ pressed }) => [
                styles.qrToggle,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowQRCode(!showQRCode)}
            >
              <QrCode size={20} color={theme.colors.text} />
              <Text style={styles.qrToggleText}>
                {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
              </Text>
            </Pressable>

            {/* QR Code */}
            {showQRCode && (
              <View style={styles.qrCodeContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={shareableLink}
                    size={160}
                    color={theme.colors.text}
                    backgroundColor={theme.colors.surface}
                  />
                </View>
                <Text style={styles.qrCodeText}>
                  Scan this QR code to join the camera
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{camera.photos.length}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{camera.maxGuests}</Text>
            <Text style={styles.statLabel}>Max Guests</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{camera.maxPhotosPerPerson}</Text>
            <Text style={styles.statLabel}>Per Person</Text>
          </Card>
        </View>

        {/* Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(camera.endDate)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reveal Photos</Text>
            <Text style={styles.detailValue}>
              {getRevealDescription()}
            </Text>
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
        </Card>

        {/* Photos Section */}
        {canViewPhotos && camera.photos.length > 0 && (
          <Card style={styles.photosCard}>
            <Text style={styles.sectionTitle}>
              Photos ({revealedPhotos.length}/{camera.photos.length})
            </Text>
            
            <View style={styles.photosGrid}>
              {revealedPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <Text style={styles.photoInfo}>
                    by {photo.takenBy}
                  </Text>
                </View>
              ))}
              
              {/* Placeholder for unrevealed photos */}
              {Array.from({ length: camera.photos.length - revealedPhotos.length }).map((_, index) => (
                <View key={`placeholder-${index}`} style={styles.photoPlaceholder}>
                  <Camera size={24} color={theme.colors.textTertiary} />
                  <Text style={styles.placeholderText}>Hidden</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Empty State */}
        {camera.photos.length === 0 && (
          <Card style={styles.emptyPhotos}>
            <Camera size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptyText}>
              {isActive ? 'Start taking photos to fill this camera!' : 'No photos were taken during this event.'}
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isActive && (
            <Button
              title="Start Taking Photos"
              onPress={handleStartCamera}
              style={styles.primaryAction}
            />
          )}
          
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.pressed,
            ]}
            onPress={handleShare}
          >
            <Share2 size={20} color={theme.colors.text} />
            <Text style={styles.shareText}>Share Camera</Text>
          </Pressable>
        </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerCard: {
    margin: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cameraIcon: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  cameraStatus: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
  timeRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  timeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  inviteCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  inviteDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  linkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  linkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  linkText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  copyButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  qrToggleText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  qrCodeContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  qrCodeWrapper: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qrCodeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  statNumber: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  detailsCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500' as const,
  },
  photosCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
  },
  photoImage: {
    width: '100%',
    height: '85%',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photoInfo: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  photoPlaceholder: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  placeholderText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
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
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  primaryAction: {
    backgroundColor: theme.colors.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
  },
  shareText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  pressed: {
    opacity: 0.8,
  },
});