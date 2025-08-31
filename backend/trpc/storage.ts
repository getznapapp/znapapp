// Shared in-memory storage for demo purposes
// In production, this would be replaced with a proper database

// Photo storage
const photoStorage = new Map<string, any[]>();

// Camera settings storage
const cameraStorage = new Map<string, any>();

// Photo storage functions
export function getPhotosForCamera(cameraId: string): any[] {
  return photoStorage.get(cameraId) || [];
}

export function addPhotoToStorage(cameraId: string, photo: any): void {
  const existing = photoStorage.get(cameraId) || [];
  photoStorage.set(cameraId, [...existing, photo]);
}

// Camera settings functions
export function storeCameraSettings(cameraId: string, settings: any): void {
  cameraStorage.set(cameraId, settings);
}

export function getCameraSettings(cameraId: string): any | null {
  return cameraStorage.get(cameraId) || null;
}