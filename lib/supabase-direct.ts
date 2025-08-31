import { supabase } from './supabase';
import { Platform } from 'react-native';
import { generateUUID, generatePhotoId } from './uuid';

// Polyfill for atob in React Native
const base64ToUint8Array = (base64: string): Uint8Array => {
  if (Platform.OS === 'web' && typeof atob !== 'undefined') {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }
  
  // React Native polyfill
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < base64.length) {
    const encoded1 = chars.indexOf(base64.charAt(i++));
    const encoded2 = chars.indexOf(base64.charAt(i++));
    const encoded3 = chars.indexOf(base64.charAt(i++));
    const encoded4 = chars.indexOf(base64.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return Uint8Array.from(result, c => c.charCodeAt(0));
};

// Direct Supabase operations that bypass the backend
export const supabaseDirect = {
  // Upload photo directly to Supabase
  uploadPhoto: async (params: {
    cameraId: string;
    imageBase64: string;
    mimeType: string;
    userId?: string;
    userName?: string;
  }) => {
    try {
      const { cameraId, imageBase64, mimeType, userId, userName } = params;
      
      console.log('Direct photo upload request for camera:', cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, cannot upload to Supabase:', cameraId);
        throw new Error(`Cannot upload photos for old format camera ID. Please create a new camera.`);
      }
      
      // Verify camera exists before uploading photo with retry logic
      console.log('Verifying camera exists before photo upload...');
      let existingCamera = null;
      
      // Try to ensure camera exists (will create if needed)
      try {
        // First check if camera exists in local store to get proper data
        const { findCameraById } = require('@/store/camera-store').useCameraStore.getState();
        const localCamera = findCameraById(cameraId);
        
        let fallbackData = {
          name: 'Auto-created Camera',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxPhotosPerPerson: 20,
          revealDelayType: 'immediate',
        };
        
        if (localCamera) {
          console.log('Found camera in local store, using its data for creation:', localCamera.name);
          fallbackData = {
            name: localCamera.name,
            endTime: localCamera.endDate,
            maxPhotosPerPerson: localCamera.maxPhotosPerPerson,
            revealDelayType: localCamera.revealDelayType,
          };
        } else {
          console.log('Camera not found in local store, will use fallback data');
        }
        
        const ensureResult = await supabaseDirect.ensureCameraExists(cameraId, fallbackData);
        
        if (ensureResult.success) {
          existingCamera = ensureResult.camera;
          console.log('Camera verified/created:', existingCamera.name);
        } else {
          throw new Error('Failed to ensure camera exists');
        }
      } catch (ensureError) {
        console.error('Failed to ensure camera exists:', ensureError);
        throw new Error(`Camera not found: ${cameraId}. Please create the camera first.`);
      }
      
      console.log('Camera verified:', existingCamera);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = mimeType.split('/')[1] || 'jpg';
      const fileName = `${cameraId}/${timestamp}_${randomId}.${fileExtension}`;
      
      // Convert base64 to buffer (React Native compatible)
      let imageBuffer: Uint8Array;
      
      try {
        imageBuffer = base64ToUint8Array(imageBase64);
        console.log('Image buffer created, size:', imageBuffer.length);
      } catch (bufferError) {
        console.error('Failed to convert base64 to buffer:', bufferError);
        throw new Error(`Failed to process image data: ${bufferError}`);
      }
      
      console.log('Direct Supabase upload:', fileName);
      
      // Upload to Supabase Storage
      console.log('Uploading to Supabase Storage with:', {
        fileName,
        bufferSize: imageBuffer.length,
        mimeType,
      });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('camera-photos')
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Direct upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
      
      console.log('Direct upload successful:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('camera-photos')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      // Generate a deterministic photo ID based on camera ID, timestamp, and filename
      // This helps prevent duplicate uploads of the same photo
      const photoId = generatePhotoId(cameraId);
      
      // Save photo metadata to Supabase database
      let photoData = {
        id: photoId,
        camera_id: cameraId,
        file_name: fileName,
        public_url: publicUrl,
        user_id: userId || 'anonymous',
        user_name: userName || 'Anonymous User',
        uploaded_at: new Date().toISOString(),
        mime_type: mimeType,
        file_size: imageBuffer.length,
      };
      
      console.log('Saving photo metadata directly to database:', photoData);
      console.log('Photo data types:', {
        id: typeof photoData.id,
        camera_id: typeof photoData.camera_id,
        file_name: typeof photoData.file_name,
        public_url: typeof photoData.public_url,
        user_id: typeof photoData.user_id,
        user_name: typeof photoData.user_name,
        uploaded_at: typeof photoData.uploaded_at,
        mime_type: typeof photoData.mime_type,
        file_size: typeof photoData.file_size,
      });
      
      // Check if photo already exists before inserting to prevent duplicate key errors
      console.log('Checking if photo already exists with ID:', photoData.id);
      const { data: existingPhotoCheck, error: checkError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoData.id)
        .single();
      
      if (!checkError && existingPhotoCheck) {
        console.log('Photo already exists with this ID, using existing photo:', existingPhotoCheck);
        return {
          success: true,
          photo: existingPhotoCheck,
          url: existingPhotoCheck.public_url || existingPhotoCheck.publicUrl,
        };
      }
      
      // Also check by filename to catch potential duplicates
      const { data: existingByFilename, error: filenameCheckError } = await supabase
        .from('photos')
        .select('*')
        .eq('file_name', photoData.file_name)
        .eq('camera_id', photoData.camera_id)
        .single();
      
      if (!filenameCheckError && existingByFilename) {
        console.log('Photo already exists with this filename, using existing photo:', existingByFilename);
        return {
          success: true,
          photo: existingByFilename,
          url: existingByFilename.public_url || existingByFilename.publicUrl,
        };
      }
      
      // Insert photo metadata into photos table with improved error handling
      let insertedPhoto = null;
      let insertError = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !insertedPhoto) {
        retryCount++;
        console.log(`Attempting photo metadata insert (attempt ${retryCount}/${maxRetries})...`);
        
        // Use regular insert instead of upsert to avoid RETURNING issues
        const insertResult = await supabase
          .from('photos')
          .insert([photoData])
          .select('*');
        
        insertedPhoto = insertResult.data && insertResult.data.length > 0 ? insertResult.data[0] : null;
        insertError = insertResult.error;
        
        if (insertError) {
          console.error(`Insert attempt ${retryCount} failed:`, insertError);
          
          // If it's an RLS error, try with different approach
          if (insertError.message?.includes('row-level security policy') && retryCount < maxRetries) {
            console.log('RLS error detected, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            
            // Try with minimal data on retry
            if (retryCount === 2) {
              console.log('Trying with minimal photo data...');
              photoData = {
                id: photoData.id,
                camera_id: photoData.camera_id,
                file_name: photoData.file_name,
                public_url: photoData.public_url,
                user_id: 'anonymous', // Use anonymous to avoid user-related RLS issues
                user_name: 'Anonymous User',
                uploaded_at: photoData.uploaded_at,
                mime_type: photoData.mime_type,
                file_size: photoData.file_size,
              };
            }
          } else if (insertError.code === '23505' && insertError.message?.includes('duplicate key')) {
            // If it's a duplicate key error, the photo already exists, try to retrieve it
            console.log('Duplicate key error, photo might already exist, trying to retrieve...');
            
            // Try multiple approaches to find the existing photo
            let existingPhoto = null;
            
            // Approach 1: Search by ID
            try {
              const { data: photoById, error: idError } = await supabase
                .from('photos')
                .select('*')
                .eq('id', photoData.id)
                .single();
              
              if (!idError && photoById) {
                existingPhoto = photoById;
                console.log('Found existing photo by ID:', existingPhoto);
              }
            } catch (idErr) {
              console.log('Could not find photo by ID:', idErr);
            }
            
            // Approach 2: Search by filename (in case of ID collision)
            if (!existingPhoto) {
              try {
                const { data: photoByFilename, error: filenameError } = await supabase
                  .from('photos')
                  .select('*')
                  .eq('file_name', photoData.file_name)
                  .eq('camera_id', photoData.camera_id)
                  .single();
                
                if (!filenameError && photoByFilename) {
                  existingPhoto = photoByFilename;
                  console.log('Found existing photo by filename:', existingPhoto);
                }
              } catch (filenameErr) {
                console.log('Could not find photo by filename:', filenameErr);
              }
            }
            
            // Approach 3: Search by recent uploads for this camera
            if (!existingPhoto) {
              try {
                const { data: recentPhotos, error: recentError } = await supabase
                  .from('photos')
                  .select('*')
                  .eq('camera_id', photoData.camera_id)
                  .order('uploaded_at', { ascending: false })
                  .limit(5);
                
                if (!recentError && recentPhotos && recentPhotos.length > 0) {
                  // Look for a photo with the same file size and similar timestamp
                  const similarPhoto = recentPhotos.find(p => 
                    p.file_size === photoData.file_size &&
                    Math.abs(new Date(p.uploaded_at).getTime() - new Date(photoData.uploaded_at).getTime()) < 60000 // Within 1 minute
                  );
                  
                  if (similarPhoto) {
                    existingPhoto = similarPhoto;
                    console.log('Found similar existing photo by size and timestamp:', existingPhoto);
                  }
                }
              } catch (recentErr) {
                console.log('Could not search recent photos:', recentErr);
              }
            }
            
            if (existingPhoto) {
              console.log('Successfully found existing photo, using it instead of inserting duplicate');
              insertedPhoto = existingPhoto;
              insertError = null;
              break;
            } else {
              console.log('Could not find existing photo despite duplicate key error');
              // Generate a new ID and try again
              if (retryCount < maxRetries) {
                console.log('Generating new photo ID and retrying...');
                photoData.id = generatePhotoId(cameraId);
                continue;
              }
            }
          } else {
            break; // Exit retry loop for non-RLS errors
          }
        } else if (insertedPhoto) {
          console.log(`Photo metadata insert successful on attempt ${retryCount}:`, insertedPhoto);
          break;
        }
      }
      
      if (insertError) {
        console.error('Error saving photo metadata directly:', insertError);
        console.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          full: insertError
        });
        console.error('Photo data that failed to insert:', photoData);
        
        // Clean up uploaded file
        try {
          await supabase.storage
            .from('camera-photos')
            .remove([fileName]);
          console.log('Cleaned up uploaded file after metadata save failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
        
        // Provide more detailed error message based on error type
        let errorMessage = 'Unknown database error';
        
        if (insertError.message?.includes('row-level security policy')) {
          errorMessage = 'Database permission error. Please run the RLS fix script in your Supabase dashboard.';
        } else if (insertError.message?.includes('violates foreign key constraint')) {
          errorMessage = 'Camera not found in database. Please create the camera first.';
        } else if (insertError.message?.includes('duplicate key')) {
          errorMessage = 'Photo already exists with this ID.';
        } else if (insertError.code === '23503') {
          errorMessage = 'Camera reference error. Please ensure the camera exists.';
        } else if (insertError.code === '42501') {
          errorMessage = 'Database permission denied. Please check RLS policies.';
        } else {
          errorMessage = insertError.message || insertError.code || insertError.details || 'Unknown database error';
        }
        
        throw new Error(`Failed to save photo metadata: ${errorMessage}`);
      }
      
      if (!insertedPhoto && !insertError) {
        console.error('Photo was inserted but not returned from database');
        console.log('Attempting to retrieve the inserted photo...');
        
        // Try to retrieve the photo we just inserted with multiple approaches
        let retrievedPhoto = null;
        let retrieveAttempts = 0;
        const maxRetrieveAttempts = 5;
        
        while (retrieveAttempts < maxRetrieveAttempts && !retrievedPhoto) {
          retrieveAttempts++;
          console.log(`Retrieve attempt ${retrieveAttempts}/${maxRetrieveAttempts}...`);
          
          // Wait a bit for database consistency
          if (retrieveAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * retrieveAttempts));
          }
          
          // Approach 1: Direct query by ID
          try {
            const { data: retrievedPhotos, error: retrieveError } = await supabase
              .from('photos')
              .select('*')
              .eq('id', photoData.id);
            
            if (!retrieveError && retrievedPhotos && retrievedPhotos.length > 0) {
              console.log('Successfully retrieved inserted photo via direct query:', retrievedPhotos[0]);
              retrievedPhoto = retrievedPhotos[0];
              break;
            } else {
              console.log(`Direct query attempt ${retrieveAttempts} failed:`, retrieveError);
            }
          } catch (retrieveErr) {
            console.warn(`Error in direct query attempt ${retrieveAttempts}:`, retrieveErr);
          }
          
          // Approach 2: Query by camera ID and filename if direct query failed
          if (!retrievedPhoto && retrieveAttempts >= 2) {
            try {
              const { data: recentPhotos, error: recentError } = await supabase
                .from('photos')
                .select('*')
                .eq('camera_id', photoData.camera_id)
                .eq('file_name', photoData.file_name)
                .order('uploaded_at', { ascending: false })
                .limit(1);
              
              if (!recentError && recentPhotos && recentPhotos.length > 0) {
                console.log('Successfully retrieved inserted photo via filename query:', recentPhotos[0]);
                retrievedPhoto = recentPhotos[0];
                break;
              } else {
                console.log(`Filename query attempt ${retrieveAttempts} failed:`, recentError);
              }
            } catch (recentErr) {
              console.warn(`Error in filename query attempt ${retrieveAttempts}:`, recentErr);
            }
          }
        }
        
        if (retrievedPhoto) {
          // Use the retrieved photo data
          insertedPhoto = retrievedPhoto;
          photoData = { ...photoData, ...retrievedPhoto };
          console.log('Photo successfully retrieved after insertion');
        } else {
          console.warn('Could not retrieve inserted photo with any method after all attempts');
          // The photo was likely inserted successfully, just not returned
          // We'll proceed with the original photoData but log this as a warning
          console.warn('Proceeding with original photo data, but this may indicate a database consistency issue');
        }
      } else if (insertedPhoto) {
        console.log('Photo metadata saved successfully via direct Supabase:', insertedPhoto);
        // Update photoData with any fields returned from the database
        photoData = { ...photoData, ...insertedPhoto };
      }
      
      return {
        success: true,
        photo: photoData,
        url: publicUrl,
      };
    } catch (error) {
      console.error('Direct photo upload failed:', error);
      throw error;
    }
  },

  // List photos directly from Supabase
  listPhotos: async (params: {
    cameraId: string;
    includeHidden?: boolean;
  }) => {
    try {
      const { cameraId, includeHidden = false } = params;
      
      console.log('Direct Supabase photo list for camera:', cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, returning empty photo list:', cameraId);
        return {
          success: true,
          photos: [],
          total: 0,
          hiddenCount: 0,
        };
      }
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase request timeout')), 5000)
      );
      
      // Use camera_id (snake_case) as defined in the database schema
      const queryPromise = supabase
        .from('photos')
        .select('*')
        .eq('camera_id', cameraId)
        .order('uploaded_at', { ascending: false });
      
      // Race between query and timeout
      const { data: cameraPhotos, error: photosError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      if (photosError) {
        console.error('Error fetching photos directly from database:', photosError);
        
        // Check if it's a network error
        if (photosError.message?.includes('Network request failed') || 
            photosError.message?.includes('fetch') ||
            photosError.message?.includes('timeout')) {
          console.log('Network error detected, returning empty result');
          return {
            success: true,
            photos: [],
            total: 0,
            hiddenCount: 0,
            networkError: true,
          };
        }
        
        throw new Error(`Failed to fetch photos: ${photosError.message}`);
      }
      
      console.log('Direct photos query result:', { 
        photosCount: cameraPhotos?.length || 0 
      });
      
      // For now, show all photos (no reveal logic in direct mode)
      return {
        success: true,
        photos: cameraPhotos || [],
        total: cameraPhotos?.length || 0,
        hiddenCount: 0,
      };
    } catch (error) {
      console.error('Error listing photos directly:', error);
      
      // Handle network errors gracefully
      if (error instanceof Error) {
        if (error.message?.includes('Network request failed') || 
            error.message?.includes('fetch') ||
            error.message?.includes('timeout')) {
          console.log('Network error in listPhotos, returning empty result');
          return {
            success: true,
            photos: [],
            total: 0,
            hiddenCount: 0,
            networkError: true,
          };
        }
      }
      
      throw error;
    }
  },

  // Create camera directly in Supabase
  createCamera: async (params: {
    name: string;
    endTime: Date;
    participantLimit: number;
    maxPhotosPerPerson: number;
    allowCameraRoll: boolean;
    filter: string;
    paidUpgrade: boolean;
    revealDelayType: string;
    customRevealAt?: Date;
    cameraId?: string; // Allow specifying camera ID
  }): Promise<{
    success: boolean;
    cameraId: string;
    camera: any;
  }> => {
    try {
      const cameraId = params.cameraId || generateUUID();
      
      const cameraData = {
        id: cameraId,
        name: params.name,
        endDate: params.endTime.toISOString(),
        revealDelayType: params.revealDelayType,
        customRevealAt: params.customRevealAt?.toISOString() || null,
        createdAt: new Date().toISOString(),
        createdBy: null, // Will be updated when auth is implemented
        maxPhotosPerPerson: params.maxPhotosPerPerson,
      };
      
      console.log('Creating camera directly in Supabase:', cameraData);
      console.log('Camera data types:', {
        id: typeof cameraData.id,
        name: typeof cameraData.name,
        endDate: typeof cameraData.endDate,
        revealDelayType: typeof cameraData.revealDelayType,
        customRevealAt: typeof cameraData.customRevealAt,
        createdAt: typeof cameraData.createdAt,
        createdBy: typeof cameraData.createdBy,
        maxPhotosPerPerson: typeof cameraData.maxPhotosPerPerson,
      });
      
      // First, check if a camera with this ID already exists (shouldn't happen but let's be safe)
      const { data: existingCameras } = await supabase
        .from('cameras')
        .select('id')
        .eq('id', cameraId);
      
      if (existingCameras && existingCameras.length > 0) {
        console.warn('Camera ID collision detected, generating new ID');
        return supabaseDirect.createCamera(params); // Retry with new ID
      }
      
      const { data: insertedCameras, error: insertError } = await supabase
        .from('cameras')
        .insert([cameraData])
        .select();
      
      if (insertError) {
        console.error('Error creating camera directly:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          full: insertError
        });
        
        // If it's a unique constraint violation, retry with new ID
        if (insertError.code === '23505') {
          console.log('Unique constraint violation, retrying with new ID');
          return supabaseDirect.createCamera(params);
        }
        
        throw new Error(`Failed to create camera: ${insertError.message || insertError.code || 'Unknown error'}`);
      }
      
      const insertedCamera = insertedCameras && insertedCameras.length > 0 ? insertedCameras[0] : null;
      
      if (!insertedCamera) {
        console.warn('Camera was inserted but not returned from database, attempting to retrieve it...');
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to retrieve the camera we just created
        const { data: retrievedCameras, error: retrieveError } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId)
          .single();
        
        if (retrieveError || !retrievedCameras) {
          console.error('Failed to retrieve camera after creation:', retrieveError);
          throw new Error(`Camera creation failed: Unable to verify camera was created`);
        }
        
        console.log('Successfully retrieved camera after creation:', retrievedCameras);
        return {
          success: true,
          cameraId,
          camera: retrievedCameras,
        };
      }
      
      console.log('Camera created successfully via direct Supabase:', insertedCamera);
      
      // Add a longer delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the camera was created by immediately trying to retrieve it
      console.log('Verifying camera creation with ID:', cameraId);
      let verifyAttempts = 0;
      let verifyResult;
      
      // Try up to 5 times with increasing delays
      while (verifyAttempts < 5) {
        verifyResult = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId);
        
        if (!verifyResult.error && verifyResult.data && verifyResult.data.length > 0) {
          console.log('Camera creation verified on attempt', verifyAttempts + 1, ':', verifyResult.data[0]);
          verifyResult.data = verifyResult.data[0]; // Convert array to single object for compatibility
          break;
        }
        
        verifyAttempts++;
        if (verifyAttempts < 5) {
          console.log(`Camera verification attempt ${verifyAttempts} failed, retrying in ${500 * verifyAttempts}ms...`);
          await new Promise(resolve => setTimeout(resolve, 500 * verifyAttempts));
        }
      }
      
      if (verifyResult?.error) {
        console.error('Camera verification failed after all attempts:', {
          error: verifyResult.error,
          searchedId: cameraId,
          insertedId: insertedCamera?.id
        });
        
        // Try to list all cameras to debug
        const { data: allCameras } = await supabase
          .from('cameras')
          .select('id, name, createdAt')
          .order('createdAt', { ascending: false })
          .limit(10);
        
        console.log('Recent cameras in database:', allCameras);
        
        // Check if the camera exists with a different query
        const { data: alternativeCheck } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId);
        
        console.log('Alternative camera check result:', alternativeCheck);
        
        if (alternativeCheck && alternativeCheck.length > 0) {
          console.log('Camera found with alternative query, proceeding...');
          return {
            success: true,
            cameraId,
            camera: alternativeCheck[0],
          };
        }
        
        throw new Error('Camera was created but could not be verified after multiple attempts');
      }
      
      return {
        success: true,
        cameraId,
        camera: insertedCamera,
      };
    } catch (error) {
      console.error('Direct camera creation failed:', error);
      throw error;
    }
  },

  // Get camera directly from Supabase with retry logic
  getCamera: async (cameraId: string, retryCount: number = 0): Promise<{ success: boolean; camera?: any }> => {
    try {
      console.log(`Getting camera directly from Supabase (attempt ${retryCount + 1}):`, cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, cannot retrieve from Supabase:', cameraId);
        throw new Error(`Cannot retrieve old format camera from database. Camera ID: ${cameraId}`);
      }
      
      console.log('Searching for camera with UUID:', cameraId);
      
      const { data: cameraData, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('id', cameraId);
      
      const camera = cameraData && cameraData.length > 0 ? cameraData[0] : null;
      
      if (error || !camera) {
        if (error) {
          console.error('Error getting camera directly:', {
            searchedId: cameraId,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            full: error
          });
        }
        
        // If camera not found and we haven't retried much, try again
        if ((!camera || error?.code === 'PGRST116' || error?.message?.includes('no rows')) && retryCount < 2) {
          console.log(`Camera not found on attempt ${retryCount + 1}, retrying in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return supabaseDirect.getCamera(cameraId, retryCount + 1);
        }
        
        // If camera not found after retries, let's debug by listing recent cameras
        if (!camera) {
          console.log('Camera not found after retries, listing recent cameras for debugging...');
          
          try {
            const { data: recentCameras } = await supabase
              .from('cameras')
              .select('id, name, createdAt')
              .order('createdAt', { ascending: false })
              .limit(10);
            
            console.log('Recent cameras in database:', recentCameras);
            
            // Check if there's a camera with similar ID pattern
            const similarCameras = recentCameras?.filter(c => 
              c.id.includes(cameraId.substring(0, 8)) || 
              cameraId.includes(c.id.substring(0, 8))
            );
            
            if (similarCameras && similarCameras.length > 0) {
              console.log('Found cameras with similar IDs:', similarCameras);
            }
          } catch (debugError) {
            console.error('Failed to debug camera list:', debugError);
          }
          
          throw new Error(`Camera not found: ${cameraId}`);
        }
        
        if (error) {
          throw new Error(`Failed to get camera: ${error.message || error.code || 'Unknown error'}`);
        }
      }
      
      console.log('Camera retrieved successfully via direct Supabase:', camera);
      
      return {
        success: true,
        camera,
      };
    } catch (error) {
      console.error('Direct camera retrieval failed:', error);
      throw error;
    }
  },

  // Test Supabase connection
  testConnection: async () => {
    try {
      console.log('Testing direct Supabase connection...');
      
      // Test cameras table structure
      const { data: cameras, error: camerasError } = await supabase
        .from('cameras')
        .select('*')
        .limit(1);
      
      if (camerasError) {
        console.error('Cameras table error:', camerasError);
        throw new Error(`Cameras table error: ${camerasError.message}`);
      }
      
      console.log('Cameras table test successful, sample data:', cameras);
      
      // Test photos table structure
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .limit(1);
      
      if (photosError) {
        console.error('Photos table error:', photosError);
        throw new Error(`Photos table error: ${photosError.message}`);
      }
      
      console.log('Photos table test successful, sample data:', photos);
      
      // Test storage bucket
      const { data: files, error: storageError } = await supabase.storage
        .from('camera-photos')
        .list('', { limit: 1 });
      
      if (storageError) {
        console.error('Storage bucket error:', storageError);
        throw new Error(`Storage bucket error: ${storageError.message}`);
      }
      
      console.log('Storage bucket test successful, files:', files);
      
      // Test table schema by describing the photos table
      try {
        const { data: schemaData, error: schemaError } = await supabase.rpc('get_table_schema', { table_name: 'photos' });
        if (!schemaError) {
          console.log('Photos table schema:', schemaData);
        }
      } catch (schemaErr) {
        console.log('Schema check not available (this is normal)');
      }
      
      console.log('Direct Supabase connection test successful');
      
      return {
        success: true,
        message: 'All Supabase components accessible',
        camerasTable: true,
        photosTable: true,
        storageBucket: true,
        camerasCount: cameras?.length || 0,
        photosCount: photos?.length || 0,
        storageFiles: files?.length || 0,
      };
    } catch (error) {
      console.error('Direct Supabase connection test failed:', error);
      throw error;
    }
  },

  // Debug method to list all cameras
  listAllCameras: async () => {
    try {
      console.log('Listing all cameras in database...');
      
      const { data: cameras, error } = await supabase
        .from('cameras')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error listing cameras:', error);
        throw new Error(`Failed to list cameras: ${error.message}`);
      }
      
      console.log('All cameras in database:', cameras);
      
      return {
        success: true,
        cameras: cameras || [],
        count: cameras?.length || 0,
      };
    } catch (error) {
      console.error('Failed to list cameras:', error);
      throw error;
    }
  },

  // Debug method to list all photos
  listAllPhotos: async () => {
    try {
      console.log('Listing all photos in database...');
      
      const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        console.error('Error listing photos:', error);
        throw new Error(`Failed to list photos: ${error.message}`);
      }
      
      console.log('All photos in database:', photos);
      
      return {
        success: true,
        photos: photos || [],
        count: photos?.length || 0,
      };
    } catch (error) {
      console.error('Failed to list photos:', error);
      throw error;
    }
  },

  // Helper function to ensure camera exists or create it
  ensureCameraExists: async (cameraId: string, fallbackData?: {
    name: string;
    endTime: Date;
    maxPhotosPerPerson: number;
    revealDelayType: string;
  }): Promise<{ success: boolean; camera: any; created: boolean }> => {
    try {
      console.log('Ensuring camera exists:', cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, cannot ensure exists in database:', cameraId);
        throw new Error(`Cannot ensure old format camera exists in database. Camera ID: ${cameraId}`);
      }
      
      // Try multiple times to get the camera (in case of timing issues)
      let existingCamera = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !existingCamera) {
        attempts++;
        console.log(`Attempt ${attempts} to find camera...`);
        
        const { data: existingCameras, error: queryError } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId);
        
        if (!queryError && existingCameras && existingCameras.length > 0) {
          existingCamera = existingCameras[0];
          console.log('Camera found on attempt', attempts, ':', existingCamera.name);
          return { success: true, camera: existingCamera, created: false };
        }
        
        if (queryError) {
          console.error('Query error on attempt', attempts, ':', queryError);
        }
        
        if (attempts < maxAttempts) {
          console.log('Camera not found, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        }
      }
      
      // If camera doesn't exist and we have fallback data, create it
      if (fallbackData) {
        console.log('Camera not found after retries, creating with fallback data...');
        
        // Create camera with the specific ID
        const cameraData = {
          id: cameraId,
          name: fallbackData.name,
          endDate: fallbackData.endTime.toISOString(),
          revealDelayType: fallbackData.revealDelayType,
          customRevealAt: null,
          createdAt: new Date().toISOString(),
          createdBy: null,
          maxPhotosPerPerson: fallbackData.maxPhotosPerPerson,
        };
        
        console.log('Creating camera with data:', cameraData);
        
        const { data: insertedCameras, error: insertError } = await supabase
          .from('cameras')
          .insert([cameraData])
          .select();
        
        if (insertError) {
          console.error('Failed to create fallback camera:', insertError);
          
          // If it's a unique constraint violation, the camera might have been created by another process
          if (insertError.code === '23505') {
            console.log('Unique constraint violation, camera might exist now, checking again...');
            const { data: recheckCameras } = await supabase
              .from('cameras')
              .select('*')
              .eq('id', cameraId);
            
            if (recheckCameras && recheckCameras.length > 0) {
              console.log('Camera found after unique constraint error:', recheckCameras[0].name);
              return { success: true, camera: recheckCameras[0], created: false };
            }
          }
          
          throw new Error(`Failed to create camera: ${insertError.message}`);
        }
        
        const insertedCamera = insertedCameras && insertedCameras.length > 0 ? insertedCameras[0] : null;
        if (!insertedCamera) {
          console.warn('Camera was inserted but not returned, attempting to retrieve it...');
          
          // Wait a moment for database consistency
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to retrieve the camera we just created
          const { data: retrievedCameras, error: retrieveError } = await supabase
            .from('cameras')
            .select('*')
            .eq('id', cameraId)
            .single();
          
          if (retrieveError || !retrievedCameras) {
            console.error('Failed to retrieve camera after fallback creation:', retrieveError);
            throw new Error(`Camera creation failed: Unable to verify camera was created`);
          }
          
          console.log('Successfully retrieved camera after fallback creation:', retrievedCameras);
          return { success: true, camera: retrievedCameras, created: true };
        }
        
        console.log('Fallback camera created successfully:', insertedCamera);
        
        // Wait a bit for database consistency and verify creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify the camera was actually created
        const { data: verifyData } = await supabase
          .from('cameras')
          .select('*')
          .eq('id', cameraId);
        
        if (verifyData && verifyData.length > 0) {
          console.log('Camera creation verified:', verifyData[0].name);
          return { success: true, camera: verifyData[0], created: true };
        } else {
          console.warn('Camera creation could not be verified, but proceeding...');
          return { success: true, camera: insertedCamera, created: true };
        }
      }
      
      throw new Error(`Camera ${cameraId} not found and no fallback data provided`);
    } catch (error) {
      console.error('Failed to ensure camera exists:', error);
      throw error;
    }
  },
};