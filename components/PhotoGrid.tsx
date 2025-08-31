import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { X, Cloud, User, Calendar, Wifi, WifiOff } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface Photo {
  id: string;
  uri?: string;
  publicUrl?: string;
  takenBy?: string;
  userName?: string;
  takenAt?: Date;
  uploadedAt?: string;
  isRevealed?: boolean;
  mimeType?: string;
  fileSize?: number;
  isOffline?: boolean;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress?: (photo: Photo) => void;
  columns?: number;
}

export function PhotoGrid({ photos, onPhotoPress, columns = 2 }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePhotoPress = (photo: Photo) => {
    if (onPhotoPress) {
      onPhotoPress(photo);
    } else {
      setSelectedPhoto(photo);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPhoto(null);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getImageUri = (photo: Photo) => {
    return photo.publicUrl || photo.uri || 'https://via.placeholder.com/400x400/333/fff?text=Loading';
  };

  const isCloudPhoto = (photo: Photo) => {
    return !!photo.publicUrl && !photo.isOffline;
  };

  const isOfflinePhoto = (photo: Photo) => {
    return !!photo.isOffline;
  };

  const getAuthorName = (photo: Photo) => {
    return photo.userName || photo.takenBy || 'Anonymous';
  };

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - theme.spacing.lg * 2 - theme.spacing.sm * (columns - 1)) / columns;

  return (
    <>
      <View style={styles.grid}>
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            style={[styles.photoItem, { width: itemWidth }]}
            onPress={() => handlePhotoPress(photo)}
          >
            <Image 
              source={{ uri: getImageUri(photo) }} 
              style={styles.photoImage}
              defaultSource={{ uri: 'https://via.placeholder.com/400x400/333/fff?text=Loading' }}
            />
            <View style={styles.photoOverlay}>
              <View style={styles.photoInfo}>
                <Text style={styles.photoAuthor} numberOfLines={1}>
                  {getAuthorName(photo)}
                </Text>
                <View style={styles.photoIcons}>
                  {isOfflinePhoto(photo) && (
                    <WifiOff size={12} color={theme.colors.warning} />
                  )}
                  {isCloudPhoto(photo) && (
                    <Cloud size={12} color={theme.colors.primary} />
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Full Screen Photo Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeButton} onPress={closeModal}>
              <X size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {selectedPhoto && (
            <ScrollView 
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Image 
                source={{ uri: getImageUri(selectedPhoto) }} 
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              
              <View style={styles.photoDetails}>
                <View style={styles.detailRow}>
                  <User size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {getAuthorName(selectedPhoto)}
                  </Text>
                  <View style={styles.badgeContainer}>
                    {isOfflinePhoto(selectedPhoto) && (
                      <View style={[styles.cloudBadge, styles.offlineBadge]}>
                        <WifiOff size={12} color={theme.colors.warning} />
                        <Text style={[styles.cloudBadgeText, styles.offlineBadgeText]}>Offline</Text>
                      </View>
                    )}
                    {isCloudPhoto(selectedPhoto) && (
                      <View style={styles.cloudBadge}>
                        <Cloud size={12} color={theme.colors.primary} />
                        <Text style={styles.cloudBadgeText}>Cloud</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Calendar size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDate(selectedPhoto.uploadedAt || selectedPhoto.takenAt || new Date())}
                  </Text>
                </View>

                {selectedPhoto.fileSize && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Size:</Text>
                    <Text style={styles.detailText}>
                      {formatFileSize(selectedPhoto.fileSize)}
                    </Text>
                  </View>
                )}

                {selectedPhoto.mimeType && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailText}>
                      {selectedPhoto.mimeType}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  photoItem: {
    aspectRatio: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  photoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoAuthor: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  photoIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  fullScreenImage: {
    width: '100%',
    height: 400,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  photoDetails: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
    minWidth: 40,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  cloudBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  offlineBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: theme.colors.warning,
    borderWidth: 1,
  },
  offlineBadgeText: {
    color: theme.colors.warning,
  },
});