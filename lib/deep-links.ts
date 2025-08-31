import { Platform } from 'react-native';

/**
 * Generates a cross-platform invite URL that works for both app and web users
 * @param cameraId - The camera ID to join
 * @param baseUrl - The base URL of your app (e.g., 'https://yourdomain.com')
 * @returns A URL that redirects to app if installed, otherwise to web
 */
export function generateInviteUrl(cameraId: string, baseUrl?: string): string {
  // Always use production URL for invite links to ensure they work across all environments
  if (!baseUrl) {
    // Always use production Netlify URL for sharing
    baseUrl = 'https://znapapp.netlify.app';
  }
  return `${baseUrl}/camera?id=${encodeURIComponent(cameraId)}`;
}

/**
 * Generates a direct deep link URL for the app
 * @param cameraId - The camera ID to join
 * @returns A deep link URL that opens the app directly
 */
export function generateDeepLink(cameraId: string): string {
  return `myapp://join?cameraId=${encodeURIComponent(cameraId)}`;
}

/**
 * Generates a direct web URL for joining a camera
 * @param cameraId - The camera ID to join
 * @param baseUrl - The base URL of your app (e.g., 'https://yourdomain.com')
 * @returns A web URL for joining the camera
 */
export function generateWebUrl(cameraId: string, baseUrl?: string): string {
  // Always use production URL for web links to ensure they work across all environments
  if (!baseUrl) {
    // Always use production Netlify URL for sharing
    baseUrl = 'https://znapapp.netlify.app';
  }
  return `${baseUrl}/camera?id=${encodeURIComponent(cameraId)}`;
}

/**
 * Opens a camera invite URL using the appropriate method for the current platform
 * @param cameraId - The camera ID to join
 * @param baseUrl - The base URL of your app (only used on web)
 */
export function openCameraInvite(cameraId: string, baseUrl?: string): void {
  if (Platform.OS === 'web') {
    // On web, use the redirect URL
    window.open(generateInviteUrl(cameraId, baseUrl), '_blank');
  } else {
    // On mobile, we can use the deep link directly or share the redirect URL
    // For sharing, we'll use the redirect URL so it works for recipients without the app
    const inviteUrl = generateInviteUrl(cameraId, baseUrl);
    
    // You can integrate with expo-sharing here if needed
    console.log('Share this invite URL:', inviteUrl);
  }
}

/**
 * Extracts camera ID from various URL formats
 * @param url - The URL to parse
 * @returns The camera ID if found, null otherwise
 */
export function extractCameraIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Check for camera URL format: /camera?id=...
    if (urlObj.pathname === '/camera') {
      return urlObj.searchParams.get('id');
    }
    
    // Check for redirect URL format: /redirect?cameraId=...
    if (urlObj.pathname === '/redirect') {
      return urlObj.searchParams.get('cameraId');
    }
    
    // Check for join URL format: /join/cameraId
    const joinMatch = urlObj.pathname.match(/^\/join\/(.+)$/);
    if (joinMatch) {
      return decodeURIComponent(joinMatch[1]);
    }
    
    // Check for deep link format: myapp://join?cameraId=...
    if (urlObj.protocol === 'myapp:' && urlObj.pathname === '//join') {
      return urlObj.searchParams.get('cameraId');
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}