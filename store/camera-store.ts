import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Camera {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  durationHours?: number; // Duration in hours
  maxPhotosPerPerson: 20 | 25 | 30 | 50;
  allowCameraRoll: boolean;
  revealDelayType: 'immediate' | '12h' | '24h' | 'custom';
  customRevealAt?: Date;
  filter: 'none' | 'disposable';
  maxGuests: number;
  photos: Photo[];
  isActive: boolean;
  createdAt: Date;
  paidUpgrade: boolean;
}

export interface Photo {
  id: string;
  uri: string;
  takenBy: string;
  takenAt: Date;
  isRevealed: boolean;
}

interface CameraStore {
  cameras: Camera[];
  currentCamera: Camera | null;
  addCamera: (camera: Omit<Camera, 'id' | 'photos' | 'createdAt'>, customId?: string) => Camera;
  setCurrentCamera: (camera: Camera | null) => void;
  addPhoto: (cameraId: string, photo: Omit<Photo, 'id'>) => void;
  findCameraById: (cameraId: string) => Camera | null;
  loadCameras: () => Promise<void>;
  saveCameras: () => Promise<void>;
}

export const useCameraStore = create<CameraStore>((set, get) => {
  const saveCamerasAsync = async () => {
    try {
      const { cameras } = get();
      await AsyncStorage.setItem('znap-cameras', JSON.stringify(cameras));
    } catch (error) {
      console.error('Failed to save cameras:', error);
    }
  };

  const loadCamerasAsync = async () => {
    try {
      const stored = await AsyncStorage.getItem('znap-cameras');
      if (stored) {
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        const isValidUUID = (id: string) => {
          return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        };

        let needsMigration = false;
        const cameras = JSON.parse(stored).map((camera: any) => {
          // Migrate old camera IDs to UUID format
          let cameraId = camera.id;
          if (!isValidUUID(cameraId)) {
            cameraId = generateUUID();
            needsMigration = true;
            console.log(`Migrating camera ID from ${camera.id} to ${cameraId}`);
          }

          return {
            ...camera,
            id: cameraId,
            startDate: camera.startDate ? new Date(camera.startDate) : new Date(camera.createdAt),
            endDate: new Date(camera.endDate),
            createdAt: new Date(camera.createdAt),
            customRevealAt: camera.customRevealAt ? new Date(camera.customRevealAt) : undefined,
            paidUpgrade: camera.paidUpgrade || false, // Handle legacy cameras
            // Handle legacy revealDelay field
            revealDelayType: camera.revealDelayType || (camera.revealDelay === 'during' ? 'immediate' : '24h'),
            photos: camera.photos.map((photo: any) => {
              // Also migrate photo IDs if needed
              let photoId = photo.id;
              if (!isValidUUID(photoId)) {
                photoId = generateUUID();
                needsMigration = true;
              }
              
              return {
                ...photo,
                id: photoId,
                takenAt: new Date(photo.takenAt),
              };
            }),
          };
        });
        
        set({ cameras });
        
        // Save migrated data back to storage if migration occurred
        if (needsMigration) {
          console.log('Saving migrated camera data...');
          await AsyncStorage.setItem('znap-cameras', JSON.stringify(cameras));
        }
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  return {
    cameras: [],
    currentCamera: null,
    
    addCamera: (cameraData, customId) => {
      // Use custom ID if provided, otherwise generate UUID-like ID
      const cameraId = customId || (() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      })();
      
      const newCamera: Camera = {
        ...cameraData,
        id: cameraId,
        photos: [],
        createdAt: new Date(),
      };
      
      console.log('=== ADDING CAMERA TO STORE ===');
      console.log('Camera ID:', cameraId);
      console.log('Camera name:', cameraData.name);
      console.log('Is custom ID:', !!customId);
      console.log('Camera data:', newCamera);
      
      set((state) => {
        const updatedCameras = [...state.cameras, newCamera];
        console.log('Updated cameras count:', updatedCameras.length);
        console.log('All camera IDs:', updatedCameras.map(c => c.id));
        
        return {
          cameras: updatedCameras,
        };
      });
      
      // Auto-save after adding camera
      saveCamerasAsync();
      return newCamera;
    },
  
  setCurrentCamera: (camera) => {
    set({ currentCamera: camera });
  },
  
  addPhoto: (cameraId, photoData) => {
    console.log('=== ADD PHOTO TO STORE ===');
    console.log('Camera ID:', cameraId);
    console.log('Photo data:', photoData);
    
    const newPhoto: Photo = {
      ...photoData,
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }),
    };
    
    console.log('Generated photo ID:', newPhoto.id);
    
    set((state) => {
      console.log('Current cameras in store:', state.cameras.length);
      const targetCamera = state.cameras.find(c => c.id === cameraId);
      console.log('Target camera found:', !!targetCamera);
      console.log('Target camera photos before:', targetCamera?.photos.length || 0);
      
      const updatedCameras = state.cameras.map((camera) =>
        camera.id === cameraId
          ? { ...camera, photos: [...camera.photos, newPhoto] }
          : camera
      );
      
      const updatedTargetCamera = updatedCameras.find(c => c.id === cameraId);
      console.log('Target camera photos after:', updatedTargetCamera?.photos.length || 0);
      
      // Also update currentCamera if it matches
      const updatedCurrentCamera = state.currentCamera?.id === cameraId 
        ? updatedCameras.find(c => c.id === cameraId) || state.currentCamera
        : state.currentCamera;
      
      console.log('Current camera updated:', state.currentCamera?.id === cameraId);
      
      return {
        cameras: updatedCameras,
        currentCamera: updatedCurrentCamera,
      };
    });
    
    console.log('Photo added to store, saving...');
    // Save immediately to ensure persistence
    saveCamerasAsync();
  },
  
  findCameraById: (cameraId) => {
    const { cameras } = get();
    console.log('Looking for camera ID:', cameraId);
    console.log('Available cameras:', cameras.map(c => ({ id: c.id, name: c.name })));
    const found = cameras.find(camera => camera.id === cameraId) || null;
    console.log('Found camera:', found ? found.name : 'null');
    return found;
  },
  
  loadCameras: loadCamerasAsync,
  
  saveCameras: saveCamerasAsync,
  };
});