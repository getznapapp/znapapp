import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { trpcClient, shouldUseBackend } from '@/lib/trpc';
import { supabaseDirect } from '@/lib/supabase-direct';
import { BackendStatus } from '@/components/BackendStatus';

export default function GalleryPage() {
  const { cameraId } = useLocalSearchParams<{ cameraId: string }>();
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPhotos = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      console.log('Fetching photos for camera:', cameraId);
      
      // Try backend first if it should be available
      if (shouldUseBackend()) {
        try {
          console.log('Attempting to fetch photos via backend...');
          
          // Add timeout handling for the backend query
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Backend request timeout')), 8000);
          });
          
          const queryPromise = trpcClient.photo.list.query({ 
            cameraId: cameraId!, 
            includeHidden: true 
          });

          const result = await Promise.race([queryPromise, timeoutPromise]);
          console.log('Backend photos result:', result);
          setPhotos((result as any).photos || []);
          return; // Success, exit early
        } catch (backendError) {
          console.log('Backend fetch failed, trying direct Supabase:', backendError);
          // Continue to direct Supabase fallback below
        }
      }
      
      // Fallback to direct Supabase
      console.log('Using direct Supabase for photo listing...');
      const directResult = await supabaseDirect.listPhotos({
        cameraId: cameraId!,
        includeHidden: true,
      });
      
      console.log('Direct Supabase photos result:', directResult);
      setPhotos(directResult.photos || []);
      
    } catch (err) {
      console.error('Failed to fetch photos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load photos';
      
      // Provide more helpful error messages
      if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (cameraId) {
      fetchPhotos();
    }
  }, [cameraId]);

  const onRefresh = () => {
    fetchPhotos(true);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Gallery' }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Gallery' }} />
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Camera Gallery</Text>
            <BackendStatus showDetails={true} />
          </View>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Text style={styles.errorSubtext}>Pull down to retry</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Gallery (${photos.length} photos)` }} />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Camera Gallery</Text>
          <Text style={styles.subtitle}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
          </Text>
          <BackendStatus showDetails={true} />
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>Photos will appear here once uploaded</Text>
          </View>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo: any, index: number) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image 
                  source={{ uri: photo.publicUrl }} 
                  style={styles.photoImage}
                  onError={() => console.log('Failed to load image:', photo.publicUrl)}
                />
                <View style={styles.photoInfo}>
                  <Text style={styles.photoFileName}>{photo.fileName}</Text>
                  <Text style={styles.photoDetails}>
                    By: {photo.userName}
                  </Text>
                  <Text style={styles.photoDetails}>
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.photoDetails}>
                    Size: {Math.round(photo.fileSize / 1024)}KB
                  </Text>
                  {photo.isRevealed !== undefined && (
                    <Text style={[
                      styles.photoStatus,
                      photo.isRevealed ? styles.revealed : styles.hidden
                    ]}>
                      {photo.isRevealed ? '👁️ Revealed' : '🔒 Hidden'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  photosGrid: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  photoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  photoInfo: {
    gap: theme.spacing.xs,
  },
  photoFileName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  photoDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  photoStatus: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    marginTop: theme.spacing.xs,
  },
  revealed: {
    color: theme.colors.success,
  },
  hidden: {
    color: theme.colors.textSecondary,
  },
});