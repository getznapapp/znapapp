import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { theme } from '@/constants/theme';

export default function ClearStoragePage() {
  const [isClearing, setIsClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<string[]>([]);

  const checkStorage = async () => {
    try {
      const cameras = await AsyncStorage.getItem('znap-cameras');
      const parsedCameras = cameras ? JSON.parse(cameras) : [];
      
      const info = [
        `Stored cameras: ${parsedCameras.length}`,
        ...parsedCameras.map((camera: any, index: number) => 
          `  ${index + 1}. ${camera.name} (ID: ${camera.id})`
        )
      ];
      
      setStorageInfo(info);
    } catch (error) {
      setStorageInfo([`Error reading storage: ${error}`]);
    }
  };

  const clearStorage = async () => {
    Alert.alert(
      'Clear Storage',
      'This will delete all locally stored cameras. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await AsyncStorage.removeItem('znap-cameras');
              Alert.alert('Success', 'Storage cleared successfully');
              setStorageInfo(['Storage cleared']);
            } catch (error) {
              Alert.alert('Error', `Failed to clear storage: ${error}`);
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  const migrateToUUID = async () => {
    Alert.alert(
      'Migrate Camera IDs',
      'This will convert old camera IDs to UUID format. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            setIsClearing(true);
            try {
              const cameras = await AsyncStorage.getItem('znap-cameras');
              const parsedCameras = cameras ? JSON.parse(cameras) : [];
              
              const migratedCameras = parsedCameras.map((camera: any) => {
                // If camera ID is not UUID format, generate a new UUID
                if (!camera.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
                  const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                  });
                  
                  return {
                    ...camera,
                    id: newId,
                    photos: camera.photos.map((photo: any) => ({
                      ...photo,
                      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                      })
                    }))
                  };
                }
                return camera;
              });
              
              await AsyncStorage.setItem('znap-cameras', JSON.stringify(migratedCameras));
              Alert.alert('Success', `Migrated ${migratedCameras.length} cameras to UUID format`);
              await checkStorage();
            } catch (error) {
              Alert.alert('Error', `Migration failed: ${error}`);
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  };

  React.useEffect(() => {
    checkStorage();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Clear Storage' }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Storage Management</Text>
          <Text style={styles.description}>
            Manage locally stored camera data and fix ID format issues.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Check Storage"
              onPress={checkStorage}
              style={styles.button}
            />
            <Button
              title="Migrate to UUID"
              onPress={migrateToUUID}
              disabled={isClearing}
              style={styles.button}
            />
            <Button
              title="Clear All Storage"
              onPress={clearStorage}
              disabled={isClearing}
              variant="secondary"
              style={styles.button}
            />
          </View>
          
          {storageInfo.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Storage Info:</Text>
              {storageInfo.map((info, index) => (
                <Text key={index} style={styles.infoText}>
                  {info}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
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
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    width: '100%',
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
});