import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabase } from "../../../../../lib/supabase";
import { getCameraSettings } from "../../../storage";

const getCameraInput = z.object({
  cameraId: z.string().min(1, "Camera ID is required"),
});

export const getCameraProcedure = publicProcedure
  .input(getCameraInput)
  .query(async ({ input }) => {
    const { cameraId } = input;
    
    console.log('Getting camera with ID:', cameraId);
    
    try {
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected:', cameraId);
        // For old format camera IDs, return a mock camera response
        // This allows the app to continue working with locally stored cameras
        return {
          success: false,
          error: "Camera not found in database - using local storage",
        };
      }
      
      console.log('Attempting to fetch camera from Supabase with ID:', cameraId);
      
      // Fetch camera data from Supabase for UUID format IDs
      const { data: camera, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('id', cameraId)
        .single();
      
      if (error) {
        console.error('Supabase error fetching camera:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: error
        });
        
        // Check if it's a "no rows" error
        if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
          return {
            success: false,
            error: `Camera not found: ${cameraId}`,
          };
        }
        
        return {
          success: false,
          error: `Failed to get camera: ${error.message}`,
        };
      }
      
      if (!camera) {
        return {
          success: false,
          error: "Camera not found",
        };
      }
      
      // Get additional settings from in-memory storage (for backward compatibility)
      const settings = getCameraSettings(cameraId);
      
      // Combine Supabase data with stored settings
      const cameraData = {
        id: camera.id,
        name: camera.name,
        endDate: new Date(camera.endDate),
        revealDelayType: camera.revealDelayType,
        customRevealAt: camera.customRevealAt ? new Date(camera.customRevealAt) : undefined,
        // Use stored settings if available, otherwise defaults
        filter: settings?.filter || 'none',
        allowCameraRoll: settings?.allowCameraRoll ?? true,
        maxPhotosPerPerson: settings?.maxPhotosPerPerson || 20,
        participantLimit: settings?.participantLimit || 25,
        photos: [], // Photos are fetched separately
        isActive: new Date() < new Date(camera.endDate), // Active if not ended
        currentParticipants: 0, // TODO: Count from photos or separate table
      };
      
      return {
        success: true,
        camera: cameraData,
      };
      
    } catch (error) {
      console.error('Error getting camera:', error);
      return {
        success: false,
        error: "Failed to get camera details",
      };
    }
  });