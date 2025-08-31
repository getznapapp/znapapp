// Simple UUID v4 generator for React Native compatibility
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Generate camera-specific ID
export const generateCameraId = (): string => {
  return generateUUID();
};

// Generate photo-specific ID with timestamp and randomness to reduce collisions
export const generatePhotoId = (cameraId?: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const cameraPrefix = cameraId ? cameraId.substring(0, 8) : 'unknown';
  
  // Create a more unique ID by combining timestamp, camera prefix, and random string
  const uniqueString = `${timestamp}-${cameraPrefix}-${random}`;
  
  // Convert to UUID format for consistency
  const hash = uniqueString.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  const randomHex = Math.random().toString(16).substring(2, 10);
  const timestampHex = timestamp.substring(0, 4);
  
  return `${hashHex.substring(0, 8)}-${timestampHex}-4${randomHex.substring(0, 3)}-${(Math.random() * 4 + 8 | 0).toString(16)}${randomHex.substring(3, 6)}-${randomHex.substring(6)}${hashHex.substring(8)}`;
};