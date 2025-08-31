import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Users, UserPlus, Camera } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useCameraStore } from '@/store/camera-store';
import { theme } from '@/constants/theme';

export default function JoinCameraScreen() {
  const params = useLocalSearchParams();
  const cameraId = typeof params.cameraId === 'string' ? params.cameraId : params.cameraId?.[0] || '';
  const [manualCameraId, setManualCameraId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [localCamera, setLocalCamera] = useState<any>(null);
  const { findCameraById, setCurrentCamera } = useCameraStore();
  
  // Use manual camera ID if no camera ID from params
  const activeCameraId = cameraId || manualCameraId;
  
  console.log('=== JOIN CAMERA SCREEN DEBUG ===');
  console.log('Raw params:', JSON.stringify(params));
  console.log('Extracted camera ID:', JSON.stringify(cameraId));
  console.log('Camera ID type:', typeof cameraId);
  console.log('Camera ID length:', cameraId.length);

  useEffect(() => {
    if (activeCameraId) {
      console.log('Looking for local camera with ID:', activeCameraId);
      // First check if this camera exists locally
      const camera = findCameraById(activeCameraId);
      if (camera) {
        console.log('Found local camera:', camera.name);
        setLocalCamera(camera);
      } else {
        console.log('No local camera found with ID:', activeCameraId);
        setLocalCamera(null);
      }
    }
  }, [activeCameraId, findCameraById]);

  const joinCameraMutation = trpc.camera.join.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // If we have a local camera, set it as current and navigate
        if (localCamera) {
          setCurrentCamera(localCamera);
        }
        
        Alert.alert(
          'Successfully Joined!',
          localCamera 
            ? `You have joined "${localCamera.name}". Start taking photos!`
            : `You have joined the camera. ${data.guestCount}/${data.participantLimit} participants.`,
          [
            {
              text: 'Start Taking Photos',
              onPress: () => {
                router.push('/(tabs)/camera');
              },
            },
          ]
        );
      } else {
        Alert.alert('Join Failed', data.error || 'Unable to join camera');
      }
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to join camera: ${error.message}`);
    },
  });

  const generateRandomGuestId = () => {
    setIsGeneratingId(true);
    
    // Generate a random guest name
    const adjectives = ['Happy', 'Cool', 'Awesome', 'Fun', 'Creative', 'Bright', 'Swift', 'Bold'];
    const nouns = ['Photographer', 'Snapper', 'Shooter', 'Artist', 'Creator', 'Explorer', 'Adventurer', 'Friend'];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 100);
    
    const generatedName = `${randomAdjective}${randomNoun}${randomNumber}`;
    
    setTimeout(() => {
      setGuestName(generatedName);
      setIsGeneratingId(false);
    }, 500);
  };

  const handleJoinCamera = () => {
    if (!activeCameraId) {
      Alert.alert('Error', 'Please enter a Camera ID');
      return;
    }

    // If this is a local camera, join directly
    if (localCamera) {
      if (!guestName.trim()) {
        Alert.alert('Error', 'Please enter your name or generate a guest ID');
        return;
      }
      
      setCurrentCamera(localCamera);
      Alert.alert(
        'Joined Camera!',
        `Welcome to "${localCamera.name}"! You can now start taking photos.`,
        [
          {
            text: 'Start Taking Photos',
            onPress: () => router.push('/(tabs)/camera'),
          },
        ]
      );
      return;
    }

    // For remote cameras, use the API
    if (!guestName.trim()) {
      Alert.alert('Error', 'Please enter your name or generate a guest ID');
      return;
    }

    const guestUserId = guestName.trim().toLowerCase().replace(/\s+/g, '_');

    joinCameraMutation.mutate({
      cameraId: activeCameraId,
      guestUserId,
    });
  };

  const isProcessing = joinCameraMutation.isPending || isGeneratingId;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Join Camera',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTitleStyle: {
            color: theme.colors.text,
          },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Camera size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Join Camera</Text>
          <Text style={styles.subtitle}>
            {localCamera 
              ? `Join "${localCamera.name}" and start taking photos with others`
              : 'Enter a Camera ID and your name to join a camera and start taking photos with others'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {!cameraId && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Camera ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Camera ID"
                placeholderTextColor={theme.colors.textTertiary}
                value={manualCameraId}
                onChangeText={setManualCameraId}
                autoFocus={!cameraId}
                editable={!isProcessing}
                autoCapitalize="characters"
              />
            </View>
          )}
          
          {activeCameraId && (
            <View style={styles.cameraIdContainer}>
              <Text style={styles.cameraIdLabel}>Camera ID:</Text>
              <Text style={styles.cameraIdValue}>{activeCameraId}</Text>
              {localCamera && (
                <View style={styles.localCameraBadge}>
                  <Text style={styles.localCameraText}>Local Camera</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textTertiary}
              value={guestName}
              onChangeText={setGuestName}
              autoFocus={!!cameraId}
              editable={!isProcessing}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[
              styles.generateButton,
              isProcessing && styles.generateButtonDisabled,
            ]}
            onPress={generateRandomGuestId}
            disabled={isProcessing}
          >
            <UserPlus size={20} color={theme.colors.text} />
            <Text style={styles.generateButtonText}>
              {isGeneratingId ? 'Generating...' : 'Generate Random Guest ID'}
            </Text>
          </Pressable>

          <View style={styles.infoBox}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              Your name will be visible to other participants when you take photos
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.joinButton,
              isProcessing && styles.joinButtonDisabled,
            ]}
            onPress={handleJoinCamera}
            disabled={isProcessing || !guestName.trim() || !activeCameraId}
          >
            <Text style={styles.joinButtonText}>
              {joinCameraMutation.isPending ? 'Joining Camera...' : 'Join Camera'}
            </Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            By joining, you agree to share photos with other participants
          </Text>
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
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
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
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  cameraIdContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cameraIdLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  cameraIdValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '600' as const,
    fontFamily: 'monospace',
  },
  form: {
    flex: 1,
    gap: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    fontWeight: '500' as const,
  },
  generateButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  infoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  disclaimer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  localCameraBadge: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  localCameraText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});