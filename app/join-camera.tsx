'use client';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { Button } from '@/components/Button';
import { useGuestStore } from '@/store/guest-store';
import { trpc } from '@/lib/trpc';
import { useFonts, Chewy_400Regular } from '@expo-google-fonts/chewy';

export default function JoinCamera() {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const cameraId = typeof params.cameraId === 'string' ? params.cameraId : params.cameraId?.[0] || '';
  
  const { createSession, getSession } = useGuestStore();
  
  const [fontsLoaded] = useFonts({
    Chewy_400Regular,
  });
  
  // Get camera info
  const cameraQuery = trpc.camera.get.useQuery(
    { cameraId },
    { enabled: mounted && !!cameraId }
  );
  
  // Join camera mutation
  const joinMutation = trpc.camera.join.useMutation();
  
  // Save notification mutation
  const saveNotificationMutation = trpc.camera.saveNotification.useMutation();

  useEffect(() => {
    setMounted(true);
    
    // Check if user already has a session for this camera
    if (cameraId) {
      const existingSession = getSession(cameraId);
      if (existingSession) {
        setName(existingSession.guestName);
        setEmail(existingSession.email || '');
      }
    }
  }, [cameraId, getSession]);

  const generateRandomName = () => {
    const adjectives = ['Cool', 'Happy', 'Lucky', 'Bright', 'Swift', 'Bold', 'Calm', 'Epic'];
    const nouns = ['Guest', 'Visitor', 'Friend', 'Buddy', 'Pal', 'User', 'Person', 'Member'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `${randomAdj}${randomNoun}${randomNum}`;
  };

  const handleRandomName = () => {
    setName(generateRandomName());
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name or tap "Random Guest"');
      return;
    }

    if (!cameraId) {
      Alert.alert('Error', 'Camera ID is missing');
      return;
    }

    setIsJoining(true);

    try {
      // Create guest session locally
      await createSession(cameraId, name.trim(), email.trim() || undefined);

      // Try to join camera via backend (optional - graceful fallback)
      try {
        const guestUserId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const joinResult = await joinMutation.mutateAsync({
          cameraId,
          guestUserId,
        });

        if (!joinResult.success) {
          console.warn('Backend join failed:', joinResult.error);
        }
      } catch (backendError) {
        console.warn('Backend join failed, continuing with local session:', backendError);
      }

      // Save email notification if provided
      if (email.trim()) {
        try {
          await saveNotificationMutation.mutateAsync({
            cameraId,
            guestName: name.trim(),
            email: email.trim(),
          });
        } catch (notificationError) {
          console.warn('Failed to save notification preference:', notificationError);
        }
      }

      // Navigate to camera tab to start taking photos
      router.push('/(tabs)/camera');
      
    } catch (error) {
      console.error('Join error:', error);
      Alert.alert('Error', 'Failed to join camera. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!mounted || !fontsLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const camera = cameraQuery.data?.success ? cameraQuery.data.camera : null;
  const isLoading = cameraQuery.isLoading;
  const error = cameraQuery.data?.success === false ? cameraQuery.data.error : null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>ZNAP</Text>
          </View>
          <Text style={styles.title}>Join Camera Event</Text>
          {camera && (
            <Text style={styles.subtitle}>{camera.name}</Text>
          )}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading camera info...</Text>
          </View>
        )}

        {/* Form */}
        {!isLoading && !error && (
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
              <Pressable style={styles.randomButton} onPress={handleRandomName}>
                <Text style={styles.randomButtonText}>Random Guest</Text>
              </Pressable>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <Text style={styles.helperText}>Get notified when photos unlock</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleJoin}
              />
            </View>

            {/* Camera Info */}
            {camera && (
              <View style={styles.cameraInfo}>
                <Text style={styles.cameraInfoText}>
                  {camera.currentParticipants} / {camera.participantLimit} participants
                </Text>
                <Text style={styles.cameraInfoText}>
                  Event ends: {new Date(camera.endDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            {/* Join Button */}
            <Button
              title={isJoining ? "Joining..." : "Join Camera"}
              onPress={handleJoin}
              disabled={isJoining || !name.trim()}
              size="lg"
              style={styles.joinButton}
            />
          </View>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Camera Not Found</Text>
            <Text style={styles.errorDescription}>
              This camera event may have ended or the link is invalid.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: theme.spacing.lg,
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
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  helperText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 48,
  },
  randomButton: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  randomButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  cameraInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  cameraInfoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  joinButton: {
    marginTop: 'auto' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});