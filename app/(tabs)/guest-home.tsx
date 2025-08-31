import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Camera, ChevronRight, Users, Clock } from 'lucide-react-native';
import { useGuestStore } from '@/store/guest-store';
import { useCameraStore } from '@/store/camera-store';
import { theme } from '@/constants/theme';

export default function GuestHomeScreen() {
  const { currentSession, loadSessions } = useGuestStore();
  const { currentCamera, findCameraById } = useCameraStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const camera = currentSession ? findCameraById(currentSession.cameraId) : currentCamera;

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
    if (camera) {
      router.push('/(tabs)/camera');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome!</Text>
          {currentSession && (
            <Text style={styles.subtitle}>
              Hi {currentSession.guestName}, you're part of the event
            </Text>
          )}
        </View>

        {/* Current Event Card */}
        {camera && (
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
                  <Text style={styles.eventName}>{camera.name}</Text>
                  <View style={styles.eventDetails}>
                    <Users size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.eventDetailText}>
                      {camera.photos.length} Photos
                    </Text>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.eventDetailText}>
                      {formatTimeRemaining(camera.endDate)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={theme.colors.textTertiary} />
              </View>
            </Pressable>
          </View>
        )}

        {/* No Event State */}
        {!camera && (
          <View style={styles.noEventContainer}>
            <View style={styles.noEventIcon}>
              <Camera size={48} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.noEventTitle}>No Active Event</Text>
            <Text style={styles.noEventText}>
              You haven't joined any camera events yet. Use an invite link to join an event and start taking photos!
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>1</Text>
            </View>
            <Text style={styles.infoItemText}>Join an event using an invite link</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>2</Text>
            </View>
            <Text style={styles.infoItemText}>Take photos during the event</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>3</Text>
            </View>
            <Text style={styles.infoItemText}>Photos are revealed when the event ends</Text>
          </View>
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
  header: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  eventSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  cameraIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  noEventContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  noEventIcon: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noEventTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noEventText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
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
});