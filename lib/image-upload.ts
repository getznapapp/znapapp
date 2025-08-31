import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { trpcClient, shouldUseBackend, handleBackendError } from './trpc';
import { supabaseDirect } from './supabase-direct';
import { cameraUtils } from './camera-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  photoData?: any;
}

// Store photos locally when backend is not available
const OFFLINE_PHOTOS_KEY = 'offline_photos';

interface OfflinePhoto {
  id: string;
  cameraId: string;
  imageUri: string;
  base64Data: string;
  mimeType: string;
  userId: string;
  userName: string;
  uploadedAt: string;
  fileSize: number;
}

export async function storePhotoOffline(photoData: OfflinePhoto): Promise<void> {
  try {
    const existingPhotos = await getOfflinePhotos();
    const updatedPhotos = [...existingPhotos, photoData];
    await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(updatedPhotos));
    console.log('Photo stored offline:', photoData.id);
  } catch (error) {
    console.error('Failed to store photo offline:', error);
  }
}

export async function getOfflinePhotos(): Promise<OfflinePhoto[]> {
  try {
    const photosJson = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
    return photosJson ? JSON.parse(photosJson) : [];
  } catch (error) {
    console.error('Failed to get offline photos:', error);
    return [];
  }
}

export async function getOfflinePhotosByCamera(cameraId: string): Promise<OfflinePhoto[]> {
  const allPhotos = await getOfflinePhotos();
  return allPhotos.filter(photo => photo.cameraId === cameraId);
}

export async function uploadImageToCloud(
  imageUri: string,
  cameraId: string,
  userId?: string,
  userName?: string
): Promise<ImageUploadResult> {
  try {
    // Ensure camera exists in database before uploading photo
    console.log('Ensuring camera exists before photo upload...');
    const cameraExists = await cameraUtils.ensureCameraExistsForPhoto(cameraId);
    
    if (!cameraExists) {
      console.error('Camera does not exist and could not be created:', cameraId);
      throw new Error(`Camera ${cameraId} not found and could not be created. Please create the camera first.`);
    }
    
    console.log('Camera verified, proceeding with photo upload...');
    
    // Convert image to base64
    let base64Data: string;
    let mimeType = 'image/jpeg';

    if (Platform.OS === 'web') {
      // For web, handle blob/file conversion
      try {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        mimeType = blob.type || 'image/jpeg';
        
        console.log('Web image blob info:', {
          size: blob.size,
          type: blob.type,
        });
        
        // Convert blob to base64
        const reader = new FileReader();
        base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data:image/jpeg;base64, prefix
            const base64 = result.split(',')[1];
            if (!base64) {
              reject(new Error('Failed to extract base64 data from blob'));
              return;
            }
            console.log('Web base64 conversion successful, length:', base64.length);
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to read blob as base64'));
          reader.readAsDataURL(blob);
        });
      } catch (webError) {
        console.error('Web image processing failed:', webError);
        throw new Error(`Failed to process web image: ${webError}`);
      }
    } else {
      // For mobile, use FileSystem
      try {
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
          throw new Error('Image file does not exist');
        }
        
        console.log('Mobile image file info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
          uri: imageUri,
        });

        base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (!base64Data) {
          throw new Error('Failed to read image as base64');
        }
        
        console.log('Mobile base64 conversion successful, length:', base64Data.length);

        // Determine mime type from URI extension
        if (imageUri.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        } else if (imageUri.toLowerCase().includes('.webp')) {
          mimeType = 'image/webp';
        }
      } catch (mobileError) {
        console.error('Mobile image processing failed:', mobileError);
        throw new Error(`Failed to process mobile image: ${mobileError}`);
      }
    }
    
    // Validate base64 data
    if (!base64Data || base64Data.length === 0) {
      throw new Error('Image conversion resulted in empty base64 data');
    }
    
    console.log('Image processing completed:', {
      mimeType,
      base64Length: base64Data.length,
      platform: Platform.OS,
    });

    // Try backend upload first if available
    if (shouldUseBackend()) {
      try {
        console.log('Attempting backend upload via tRPC...');
        const result = await trpcClient.photo.upload.mutate({
          cameraId,
          imageBase64: base64Data,
          mimeType,
          userId,
          userName,
        });

        console.log('Backend upload successful:', result);
        return {
          success: true,
          url: result.url,
          photoData: result.photo,
        };
      } catch (error) {
        console.log('Backend upload failed, trying direct Supabase:', error);
        
        // Try direct Supabase upload as fallback
        try {
          console.log('Attempting direct Supabase upload...');
          const directResult = await supabaseDirect.uploadPhoto({
            cameraId,
            imageBase64: base64Data,
            mimeType,
            userId,
            userName,
          });

          console.log('Direct Supabase upload successful:', directResult);
          return {
            success: true,
            url: directResult.url,
            photoData: directResult.photo,
          };
        } catch (directError) {
          console.log('Direct Supabase upload also failed, falling back to offline storage:', directError);
          // Continue to offline storage below
        }
      }
    } else {
      // Backend not available, try direct Supabase first
      try {
        console.log('Backend not available, attempting direct Supabase upload...');
        const directResult = await supabaseDirect.uploadPhoto({
          cameraId,
          imageBase64: base64Data,
          mimeType,
          userId,
          userName,
        });

        console.log('Direct Supabase upload successful:', directResult);
        return {
          success: true,
          url: directResult.url,
          photoData: directResult.photo,
        };
      } catch (directError) {
        console.log('Direct Supabase upload failed, falling back to offline storage:', directError);
        // Continue to offline storage below
      }
    }

    // Fallback to offline storage
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const photoId = `photo_${timestamp}_${randomId}`;
    
    const offlinePhoto: OfflinePhoto = {
      id: photoId,
      cameraId,
      imageUri,
      base64Data,
      mimeType,
      userId: userId || 'anonymous',
      userName: userName || 'Anonymous User',
      uploadedAt: new Date().toISOString(),
      fileSize: base64Data.length,
    };

    await storePhotoOffline(offlinePhoto);

    return {
      success: true,
      url: imageUri, // Use original URI for offline mode
      photoData: {
        id: photoId,
        cameraId,
        fileName: `${photoId}.${mimeType.split('/')[1] || 'jpg'}`,
        publicUrl: imageUri,
        userId: offlinePhoto.userId,
        userName: offlinePhoto.userName,
        uploadedAt: offlinePhoto.uploadedAt,
        mimeType,
        fileSize: offlinePhoto.fileSize,
        isOffline: true,
      },
    };
  } catch (error) {
    console.error('Image upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

export async function getSignedImageUrl(fileName: string, expiresIn = 3600): Promise<string | null> {
  try {
    if (!shouldUseBackend()) {
      console.log('Backend not available, signed URLs not supported in offline mode');
      return null;
    }

    const result = await trpcClient.photo.getSignedUrl.query({
      fileName,
      expiresIn,
    });
    
    return result.signedUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return null;
  }
}

// Utility function to sync offline photos when backend becomes available
export async function syncOfflinePhotos(): Promise<{ synced: number; failed: number }> {
  if (!shouldUseBackend()) {
    console.log('Backend not available, cannot sync offline photos');
    return { synced: 0, failed: 0 };
  }

  const offlinePhotos = await getOfflinePhotos();
  let synced = 0;
  let failed = 0;

  for (const photo of offlinePhotos) {
    try {
      await trpcClient.photo.upload.mutate({
        cameraId: photo.cameraId,
        imageBase64: photo.base64Data,
        mimeType: photo.mimeType,
        userId: photo.userId,
        userName: photo.userName,
      });
      synced++;
    } catch (error) {
      console.error('Failed to sync photo:', photo.id, error);
      failed++;
    }
  }

  // Clear synced photos from offline storage
  if (synced > 0) {
    const remainingPhotos = offlinePhotos.slice(synced);
    await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(remainingPhotos));
  }

  console.log(`Synced ${synced} photos, ${failed} failed`);
  return { synced, failed };
}