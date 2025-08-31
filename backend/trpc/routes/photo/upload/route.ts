import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabase } from "../../../../../lib/supabase";

const uploadPhotoInput = z.object({
  cameraId: z.string(),
  imageBase64: z.string(),
  mimeType: z.string(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

export const uploadPhotoProcedure = publicProcedure
  .input(uploadPhotoInput)
  .mutation(async ({ input }) => {
    try {
      const { cameraId, imageBase64, mimeType, userId, userName } = input;
      
      console.log('Photo upload request for camera:', cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, cannot upload to Supabase:', cameraId);
        throw new Error(`Cannot upload photos for old format camera ID. Please create a new camera.`);
      }
      
      // First, verify camera exists in Supabase and get settings
      const { data: camera, error: cameraError } = await supabase
        .from('cameras')
        .select('*')
        .eq('id', cameraId)
        .single();
      
      if (cameraError) {
        console.error('Error fetching camera:', cameraError);
        throw new Error(`Camera not found: ${cameraError.message}`);
      }
      
      // Get existing photos count for this user and camera
      const { data: existingPhotos, error: photosError } = await supabase
        .from('photos')
        .select('id')
        .eq('camera_id', cameraId)
        .eq('user_id', userId || 'anonymous');
      
      if (photosError) {
        console.error('Error fetching existing photos:', photosError);
        // Continue anyway, don't block upload
      }
      
      // Get camera settings to check photo limit
      const maxPhotos = camera.maxPhotosPerPerson || 20;
      const currentPhotoCount = existingPhotos?.length || 0;
      
      console.log('Photo limit check:', {
        userId: userId || 'anonymous',
        currentPhotoCount,
        maxPhotos,
        cameraId
      });
      
      if (currentPhotoCount >= maxPhotos) {
        throw new Error(`Photo limit reached. Maximum ${maxPhotos} photos per person allowed.`);
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = mimeType.split('/')[1] || 'jpg';
      const fileName = `${cameraId}/${timestamp}_${randomId}.${fileExtension}`;
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      console.log('Uploading to Supabase storage:', fileName);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('camera-photos')
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket does not exist')) {
          throw new Error('Storage bucket not found. Please create the "camera-photos" bucket in your Supabase dashboard. See SUPABASE_SETUP.md for instructions.');
        }
        
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
      
      console.log('Upload successful:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('camera-photos')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      // Import the photo ID generator
      const { generatePhotoId } = require('../../../../../lib/uuid');

      // Save photo metadata to Supabase database
      const photoData = {
        id: generatePhotoId(),
        camera_id: cameraId,
        file_name: fileName,
        public_url: publicUrl,
        user_id: userId || 'anonymous',
        user_name: userName || 'Anonymous User',
        uploaded_at: new Date().toISOString(),
        mime_type: mimeType,
        file_size: imageBuffer.length,
      };
      
      console.log('Saving photo metadata to database:', photoData);
      
      // Insert photo metadata into photos table with improved error handling
      let insertedPhoto = null;
      let insertError = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !insertedPhoto) {
        retryCount++;
        console.log(`Attempting photo metadata insert (attempt ${retryCount}/${maxRetries})...`);
        
        // Use regular insert to avoid RETURNING issues
        const insertResult = await supabase
          .from('photos')
          .insert([photoData])
          .select('*');
        
        insertedPhoto = insertResult.data && insertResult.data.length > 0 ? insertResult.data[0] : null;
        insertError = insertResult.error;
        
        if (insertError) {
          console.error(`Insert attempt ${retryCount} failed:`, insertError);
          
          // If it's a duplicate key error, the photo already exists, try to retrieve it
          if (insertError.code === '23505' && insertError.message?.includes('duplicate key')) {
            console.log('Duplicate key error, photo might already exist, trying to retrieve...');
            const { data: existingPhotos, error: retrieveError } = await supabase
              .from('photos')
              .select('*')
              .eq('id', photoData.id)
              .single();
            
            if (!retrieveError && existingPhotos) {
              console.log('Found existing photo:', existingPhotos);
              insertedPhoto = existingPhotos;
              insertError = null;
              break;
            }
          } else if (retryCount < maxRetries) {
            console.log('Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            break; // Exit retry loop
          }
        } else if (insertedPhoto) {
          console.log(`Photo metadata insert successful on attempt ${retryCount}:`, insertedPhoto);
          break;
        }
      }
      
      // Handle case where photo was inserted but not returned
      if (!insertedPhoto && !insertError) {
        console.error('Photo was inserted but not returned from database');
        console.log('Attempting to retrieve the inserted photo...');
        
        // Try to retrieve the photo we just inserted
        let retrieveAttempts = 0;
        const maxRetrieveAttempts = 3;
        
        while (retrieveAttempts < maxRetrieveAttempts && !insertedPhoto) {
          retrieveAttempts++;
          console.log(`Retrieve attempt ${retrieveAttempts}/${maxRetrieveAttempts}...`);
          
          if (retrieveAttempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * retrieveAttempts));
          }
          
          const { data: retrievedPhotos, error: retrieveError } = await supabase
            .from('photos')
            .select('*')
            .eq('id', photoData.id);
          
          if (!retrieveError && retrievedPhotos && retrievedPhotos.length > 0) {
            console.log('Successfully retrieved inserted photo:', retrievedPhotos[0]);
            insertedPhoto = retrievedPhotos[0];
            break;
          } else {
            console.log(`Retrieve attempt ${retrieveAttempts} failed:`, retrieveError);
          }
        }
        
        if (!insertedPhoto) {
          console.warn('Could not retrieve inserted photo, proceeding with original data');
          // The photo was likely inserted successfully, just not returned
          insertedPhoto = photoData;
        }
      }
      
      if (insertError) {
        console.error('Error saving photo metadata:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        console.error('Photo data that failed to insert:', JSON.stringify(photoData, null, 2));
        
        // If metadata save fails, we should clean up the uploaded file
        try {
          await supabase.storage
            .from('camera-photos')
            .remove([fileName]);
          console.log('Cleaned up uploaded file after metadata save failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
        
        // Provide more detailed error message
        const errorMessage = insertError.message || insertError.code || 'Unknown database error';
        throw new Error(`Failed to save photo metadata: ${errorMessage}`);
      } else {
        console.log('Photo metadata saved successfully:', insertedPhoto);
      }
      
      return {
        success: true,
        photo: photoData,
        url: publicUrl,
      };
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw new Error(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });