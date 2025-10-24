/**
 * Avatar utility functions for handling profile images
 */

import { avatarCache } from './avatarCache';

// Helper function to validate if a URL is a valid image URL
export const isValidImageUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    // Check if it's a valid protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    
    // Check if it's a Google profile image or other known image domains
    const validDomains = [
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'ui-avatars.com',
      'gravatar.com',
      'cdn.discordapp.com',
      'avatars.githubusercontent.com'
    ];
    
    const hostname = urlObj.hostname.toLowerCase();
    return validDomains.some(domain => hostname.includes(domain)) || 
           url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) !== null;
  } catch {
    return false;
  }
};

// Helper function to optimize Google profile image URLs
export const optimizeGoogleImageUrl = (url: string, size: number = 200): string => {
  if (!url.includes('googleusercontent.com')) return url;
  
  try {
    // For Google profile images, we can optimize by:
    // 1. Using a higher resolution for better quality on modern displays
    // 2. Adding cache-friendly parameters
    const optimizedSize = Math.min(size * 2, 400); // Use 2x resolution for crisp display
    
    // Remove existing size parameters and add our own
    const baseUrl = url.split('=')[0];
    return `${baseUrl}=s${optimizedSize}-c`;
  } catch (error) {
    console.warn('Error optimizing Google image URL:', error);
    return url;
  }
};

// Helper function to validate and clean Google avatar URL
export const getValidAvatarUrl = (avatarUrl: string | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  
  try {
    const url = new URL(avatarUrl);
    // Ensure it's a Google profile image URL
    if (url.hostname.includes('googleusercontent.com')) {
      // Clean up the URL to ensure it's properly formatted
      return avatarUrl;
    }
  } catch (error) {
    console.warn('Invalid avatar URL:', avatarUrl);
  }
  return undefined;
};

// Generate fallback URL using a more reliable service
export const generateFallbackUrl = (displayName: string, size: number = 200): string => {
  // Clean the name to avoid issues with special characters
  const cleanName = displayName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const encodedName = encodeURIComponent(cleanName || 'User');
  
  // Use DiceBear API with higher quality settings
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedName}&size=${size}&backgroundColor=6366f1&textColor=ffffff&fontSize=40&fontWeight=600`;
};

// Generate a local fallback avatar using data URL
export const generateLocalFallbackAvatar = (displayName: string, size: number = 200): string => {
  try {
    const cleanName = displayName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const initials = cleanName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    // Create a high-quality SVG avatar as data URL
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" rx="${size * 0.5}"/>
        <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" 
              font-size="${size * 0.4}" font-weight="600" 
              fill="white" text-anchor="middle" dy="0.35em">${initials || 'U'}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch (error) {
    console.warn('Error generating local fallback avatar:', error);
    return '/default-avatar.svg';
  }
};

// Get the best available avatar URL with fallbacks
export const getBestAvatarUrl = (
  primaryUrl?: string,
  fallbackUrl?: string,
  name?: string,
  size: number = 200,
  userId?: string
): string => {
  // Check cache first if we have a userId
  if (userId) {
    const cacheKey = avatarCache.generateKey(userId, primaryUrl, name);
    const cachedUrl = avatarCache.get(cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }
  }

  let bestUrl: string;

  // Priority order: primaryUrl -> fallbackUrl -> generated fallback -> default
  if (primaryUrl && isValidImageUrl(primaryUrl)) {
    bestUrl = optimizeGoogleImageUrl(primaryUrl, size);
  } else if (fallbackUrl && isValidImageUrl(fallbackUrl)) {
    bestUrl = optimizeGoogleImageUrl(fallbackUrl, size);
  } else if (name) {
    // Try DiceBear API first, but have a local fallback ready
    bestUrl = generateFallbackUrl(name, size);
  } else {
    // Final fallback to a default avatar
    bestUrl = '/default-avatar.svg';
  }

  // Ensure we never return undefined or empty string
  if (!bestUrl || bestUrl.trim() === '') {
    bestUrl = '/default-avatar.svg';
  }

  // Cache the result if we have a userId
  if (userId && bestUrl !== '/default-avatar.svg') {
    const cacheKey = avatarCache.generateKey(userId, primaryUrl, name);
    avatarCache.set(cacheKey, bestUrl);
  }

  return bestUrl;
};
