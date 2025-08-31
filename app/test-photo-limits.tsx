import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useCameraStore } from '@/store/camera-store';
import { theme } from '@/constants/theme';

export default function TestPhotoLimitsScreen() {
  const { addCamera, addPhoto, cameras } = useCameraStore();
  const [testCamera, setTestCamera] = useState<any>(null);

  const createTestCamera = () => {
    const camera = addCamera({
      name: 'Test Camera - 20 Photo Limit',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      maxPhotosPerPerson: 20, // Set to 20 photos max
      allowCameraRoll: true,
      revealDelayType: 'immediate' as const,
      filter: 'none' as const,
      maxGuests: 25,
      isActive: true,
      paidUpgrade: false,
    });
    setTestCamera(camera);
    Alert.alert('Test Camera Created', `Camera ID: ${camera.id}\nMax photos per person: ${camera.maxPhotosPerPerson}`);
  };

  const addTestPhoto = () => {
    if (!testCamera) {
      Alert.alert('Error', 'Create a test camera first');
      return;
    }

    const currentUserPhotos = testCamera.photos.filter((photo: any) => photo.takenBy === 'Test User');
    
    if (currentUserPhotos.length >= testCamera.maxPhotosPerPerson) {
      Alert.alert('Photo Limit Reached', `You have reached the maximum of ${testCamera.maxPhotosPerPerson} photos`);
      return;
    }

    addPhoto(testCamera.id, {
      uri: `test://photo-${Date.now()}`,
      takenBy: 'Test User',
      takenAt: new Date(),
      isRevealed: true,
    });

    // Update local state
    const updatedCamera = cameras.find(c => c.id === testCamera.id);
    if (updatedCamera) {
      setTestCamera(updatedCamera);
    }

    const remaining = testCamera.maxPhotosPerPerson - currentUserPhotos.length - 1;
    Alert.alert('Photo Added', `Photos remaining: ${remaining}`);
  };

  const resetTest = () => {
    setTestCamera(null);
    Alert.alert('Test Reset', 'You can create a new test camera now');
  };

  const currentUserPhotos = testCamera ? testCamera.photos.filter((photo: any) => photo.takenBy === 'Test User') : [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Test Photo Limits',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.text,
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Photo Limit Test</Text>
        <Text style={styles.description}>
          This screen tests the 20-photo limit per person functionality.
        </Text>

        {!testCamera ? (
          <Pressable style={styles.button} onPress={createTestCamera}>
            <Text style={styles.buttonText}>Create Test Camera (20 photo limit)</Text>
          </Pressable>
        ) : (
          <View style={styles.testInfo}>
            <Text style={styles.infoText}>Camera: {testCamera.name}</Text>
            <Text style={styles.infoText}>Max Photos: {testCamera.maxPhotosPerPerson}</Text>
            <Text style={styles.infoText}>Current Photos: {currentUserPhotos.length}</Text>
            <Text style={styles.infoText}>
              Remaining: {Math.max(0, testCamera.maxPhotosPerPerson - currentUserPhotos.length)}
            </Text>

            <View style={styles.buttonContainer}>
              <Pressable 
                style={[
                  styles.button, 
                  currentUserPhotos.length >= testCamera.maxPhotosPerPerson && styles.buttonDisabled
                ]} 
                onPress={addTestPhoto}
                disabled={currentUserPhotos.length >= testCamera.maxPhotosPerPerson}
              >
                <Text style={styles.buttonText}>Add Test Photo</Text>
              </Pressable>

              <Pressable style={[styles.button, styles.secondaryButton]} onPress={resetTest}>
                <Text style={styles.buttonText}>Reset Test</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable style={[styles.button, styles.backButton]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  testInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '500' as const,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.textSecondary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  backButton: {
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.xl,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});