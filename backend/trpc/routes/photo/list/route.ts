import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabase } from "../../../../../lib/supabase";

const listPhotosInput = z.object({
  cameraId: z.string(),
  includeHidden: z.boolean().default(false),
});

function calculateRevealTime(cameraEndTime: Date, revealDelayType: string, customRevealAt?: Date): Date {
  const endTime = new Date(cameraEndTime);
  
  switch (revealDelayType) {
    case 'immediate':
      return new Date(); // Reveal immediately
    case '12h':
      return new Date(endTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours after end
    case '24h':
      return new Date(endTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours after end
    case 'custom':
      return customRevealAt || new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    default:
      return new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
  }
}

function isPhotoRevealed(photo: any, cameraSettings: any): boolean {
  if (!cameraSettings) return false;
  
  const revealTime = calculateRevealTime(
    new Date(cameraSettings.endTime),
    cameraSettings.revealDelayType,
    cameraSettings.customRevealAt ? new Date(cameraSettings.customRevealAt) : undefined
  );
  
  return new Date() >= revealTime;
}

export const listPhotosProcedure = publicProcedure
  .input(listPhotosInput)
  .query(async ({ input }) => {
    const { cameraId, includeHidden } = input;
    
    console.log('=== PHOTO LIST PROCEDURE START ===');
    console.log('Input:', { cameraId, includeHidden });
    
    try {
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
      
      // Test Supabase connection first with timeout
      console.log('Testing Supabase connection...');
      
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase connection timeout')), 3000)
        );
        
        const testPromise = supabase
          .from('photos')
          .select('count')
          .limit(1);
        
        const { data: testData, error: testError } = await Promise.race([
          testPromise,
          timeoutPromise
        ]) as any;
        
        if (testError) {
          console.error('Supabase connection test failed:', testError);
          
          // Check if it's a network error
          if (testError.message?.includes('Network request failed') || 
              testError.message?.includes('fetch') ||
              testError.message?.includes('timeout')) {
            console.log('Network error detected, returning empty result');
            return {
              success: true,
              photos: [],
              total: 0,
              hiddenCount: 0,
              networkError: true,
            };
          }
          
          throw new Error(`Supabase connection failed: ${testError.message}`);
        }
        
        console.log('Supabase connection test passed');
      } catch (connectionError) {
        console.error('Supabase connection test error:', connectionError);
        
        // Handle network errors gracefully
        if (connectionError instanceof Error) {
          if (connectionError.message?.includes('Network request failed') || 
              connectionError.message?.includes('fetch') ||
              connectionError.message?.includes('timeout')) {
            console.log('Network error in connection test, returning empty result');
            return {
              success: true,
              photos: [],
              total: 0,
              hiddenCount: 0,
              networkError: true,
            };
          }
        }
        
        throw connectionError;
      }
      
      // Get photos from Supabase database
      console.log('Fetching photos for camera:', cameraId);
      const { data: cameraPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('camera_id', cameraId)
        .order('uploaded_at', { ascending: false });
      
      console.log('Photos query result:', { 
        photosCount: cameraPhotos?.length || 0, 
        error: photosError,
        photos: cameraPhotos?.slice(0, 2) // Log first 2 photos for debugging
      });
      
      if (photosError) {
        console.error('Error fetching photos from database:', photosError);
        throw new Error(`Failed to fetch photos: ${photosError.message}`);
      }
      
      // Fetch camera settings from Supabase
      const { data: camera, error } = await supabase
        .from('cameras')
        .select('endDate, revealDelayType, customRevealAt')
        .eq('id', cameraId)
        .single();
      
      console.log('Camera settings query result:', { camera, error });
      
      let cameraSettings;
      if (error || !camera) {
        console.warn('Could not fetch camera from Supabase:', error?.message);
        // Use default settings if camera not found
        cameraSettings = {
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          revealDelayType: '24h',
          customRevealAt: null,
        };
      } else {
        cameraSettings = {
          endTime: new Date(camera.endDate),
          revealDelayType: camera.revealDelayType,
          customRevealAt: camera.customRevealAt ? new Date(camera.customRevealAt) : null,
        };
      }
      
      // Add reveal status to each photo
      const photosWithRevealStatus = (cameraPhotos || []).map((photo: any) => ({
        ...photo,
        isRevealed: isPhotoRevealed(photo, cameraSettings),
      }));
      
      // Filter based on reveal status if needed
      const filteredPhotos = includeHidden 
        ? photosWithRevealStatus 
        : photosWithRevealStatus.filter((photo: any) => photo.isRevealed);
      
      const result = {
        success: true,
        photos: filteredPhotos,
        total: filteredPhotos.length,
        totalAll: photosWithRevealStatus.length, // Total count including hidden photos
        hiddenCount: photosWithRevealStatus.length - filteredPhotos.length,
      };
      
      console.log('=== PHOTO LIST PROCEDURE SUCCESS ===');
      console.log('Result:', {
        success: result.success,
        photosCount: result.photos.length,
        total: result.total,
        hiddenCount: result.hiddenCount
      });
      
      return result;
    } catch (error) {
      console.error('=== PHOTO LIST PROCEDURE ERROR ===');
      console.error('Error listing photos:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to list photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

