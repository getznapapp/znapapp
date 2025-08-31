import { supabaseDirect } from './supabase-direct';
import { useCameraStore } from '@/store/camera-store';

export interface CameraCreationParams {
  name: string;
  endTime: Date;
  participantLimit: number;
  maxPhotosPerPerson: number;
  allowCameraRoll: boolean;
  filter: string;
  paidUpgrade: boolean;
  revealDelayType: string;
  customRevealAt?: Date;
}

export const cameraUtils = {
  // Ensure camera exists in database before photo operations
  ensureCameraExistsForPhoto: async (cameraId: string): Promise<boolean> => {
    try {
      console.log('Ensuring camera exists for photo upload:', cameraId);
      
      // Check if this is a UUID format (new format) or old format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cameraId);
      
      if (!isUUID) {
        console.log('Old format camera ID detected, cannot ensure exists in database:', cameraId);
        return false;
      }
      
      // Try to get the camera from database
      try {
        const result = await supabaseDirect.getCamera(cameraId);
        if (result.success) {
          console.log('Camera exists in database:', result.camera.name);
          return true;
        }
      } catch (error) {
        console.log('Camera not found in database, checking local store...', error);
      }
      
      // If not in database, check local store and try to create it
      const { findCameraById } = useCameraStore.getState();
      const localCamera = findCameraById(cameraId);
      
      if (localCamera) {
        console.log('Camera found in local store, attempting to create in database...');
        
        try {
          // Use ensureCameraExists instead of createCamera for better reliability
          const ensureResult = await supabaseDirect.ensureCameraExists(cameraId, {
            name: localCamera.name,
            endTime: localCamera.endDate,
            maxPhotosPerPerson: localCamera.maxPhotosPerPerson,
            revealDelayType: localCamera.revealDelayType,
          });
          
          if (ensureResult.success) {
            console.log('Camera successfully ensured in database from local data');
            return true;
          }
        } catch (createError) {
          console.error('Failed to ensure camera in database from local data:', createError);
          
          // Try the full createCamera approach as fallback
          try {
            console.log('Trying full camera creation as fallback...');
            const createResult = await supabaseDirect.createCamera({
              name: localCamera.name,
              endTime: localCamera.endDate,
              participantLimit: localCamera.maxGuests,
              maxPhotosPerPerson: localCamera.maxPhotosPerPerson,
              allowCameraRoll: localCamera.allowCameraRoll,
              filter: localCamera.filter,
              paidUpgrade: localCamera.paidUpgrade,
              revealDelayType: localCamera.revealDelayType,
              customRevealAt: localCamera.customRevealAt,
              cameraId: localCamera.id, // Use the existing camera ID
            });
            
            if (createResult.success) {
              console.log('Camera successfully created in database from local data (fallback)');
              return true;
            }
          } catch (fallbackError) {
            console.error('Fallback camera creation also failed:', fallbackError);
          }
        }
      }
      
      console.error('Camera not found in database or local store:', cameraId);
      return false;
    } catch (error) {
      console.error('Error ensuring camera exists:', error);
      return false;
    }
  },

  // Create camera with proper error handling and verification
  createCameraWithVerification: async (params: CameraCreationParams): Promise<{
    success: boolean;
    cameraId?: string;
    error?: string;
  }> => {
    try {
      console.log('Creating camera with verification:', params.name);
      
      // Create camera in database
      const result = await supabaseDirect.createCamera(params);
      
      if (result.success) {
        console.log('Camera created successfully:', result.cameraId);
        
        // Add to local store
        const { addCamera, setCurrentCamera } = useCameraStore.getState();
        const localCamera = addCamera({
          name: params.name,
          startDate: new Date(),
          endDate: params.endTime,
          maxPhotosPerPerson: [20, 25, 30, 50].includes(params.maxPhotosPerPerson) 
            ? (params.maxPhotosPerPerson as 20 | 25 | 30 | 50)
            : 20,
          allowCameraRoll: params.allowCameraRoll,
          revealDelayType: ['immediate', '12h', '24h', 'custom'].includes(params.revealDelayType)
            ? (params.revealDelayType as 'immediate' | '12h' | '24h' | 'custom')
            : 'immediate',
          customRevealAt: params.customRevealAt,
          filter: ['none', 'disposable'].includes(params.filter)
            ? (params.filter as 'none' | 'disposable')
            : 'none',
          maxGuests: params.participantLimit,
          isActive: true,
          paidUpgrade: params.paidUpgrade,
        }, result.cameraId);
        
        setCurrentCamera(localCamera);
        
        return {
          success: true,
          cameraId: result.cameraId,
        };
      }
      
      return {
        success: false,
        error: 'Camera creation failed',
      };
    } catch (error) {
      console.error('Camera creation with verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Sync local cameras to database
  syncLocalCamerasToDatabase: async (): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> => {
    try {
      console.log('Syncing local cameras to database...');
      
      const { cameras } = useCameraStore.getState();
      let synced = 0;
      const errors: string[] = [];
      
      for (const camera of cameras) {
        // Check if this is a UUID format camera
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(camera.id);
        
        if (!isUUID) {
          console.log('Skipping old format camera:', camera.id);
          continue;
        }
        
        try {
          // Check if camera exists in database
          const existsResult = await supabaseDirect.getCamera(camera.id);
          
          if (existsResult.success) {
            console.log('Camera already exists in database:', camera.name);
            continue;
          }
          
          // Create camera in database
          console.log('Creating camera in database:', camera.name);
          await supabaseDirect.ensureCameraExists(camera.id, {
            name: camera.name,
            endTime: camera.endDate,
            maxPhotosPerPerson: camera.maxPhotosPerPerson,
            revealDelayType: camera.revealDelayType,
          });
          
          synced++;
          console.log('Camera synced successfully:', camera.name);
        } catch (error) {
          const errorMsg = `Failed to sync camera ${camera.name}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      console.log(`Sync complete: ${synced} cameras synced, ${errors.length} errors`);
      
      return {
        success: errors.length === 0,
        synced,
        errors,
      };
    } catch (error) {
      console.error('Camera sync failed:', error);
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  },
};