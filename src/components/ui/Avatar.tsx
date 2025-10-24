import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getBestAvatarUrl, generateLocalFallbackAvatar } from '../../utils/avatarUtils';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackSrc?: string;
  name?: string;
  userId?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const pixelSizes = {
  sm: 64,   // 2x for crisp display
  md: 96,   // 2x for crisp display
  lg: 128,  // 2x for crisp display
  xl: 192   // 2x for crisp display
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  className = '',
  fallbackSrc,
  name,
  userId
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('/default-avatar.svg');
  const [retryCount, setRetryCount] = useState(0);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Reset error states when src changes
  useEffect(() => {
    setImageError(false);
    setFallbackError(false);
    setRetryCount(0);
    setUseLocalFallback(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, [src, fallbackSrc]);

  const handleImageError = useCallback(() => {
    console.log('Avatar image error for src:', currentSrc);
    
    // Don't handle errors for empty or default sources
    if (!currentSrc || currentSrc === '/default-avatar.svg') {
      return;
    }
    
    // If it's a Google image with 429 error, retry after a delay
    if (currentSrc.includes('googleusercontent.com') && retryCount < 2) {
      setRetryCount(prev => prev + 1);
      retryTimeoutRef.current = setTimeout(() => {
        setImageError(false);
        setCurrentSrc(getImageSrc());
      }, 1000 * retryCount); // Exponential backoff
    } else if (currentSrc.includes('dicebear.com') && retryCount < 1) {
      // If it's a DiceBear API error, try local fallback
      setRetryCount(prev => prev + 1);
      setUseLocalFallback(true);
    } else {
      setImageError(true);
    }
  }, [currentSrc, retryCount]);

  const handleFallbackError = () => {
    console.log('Avatar fallback error for fallbackSrc:', fallbackSrc);
    setFallbackError(true);
  };

  // Determine which image source to use
  const getImageSrc = () => {
    // Get size for optimization - use higher resolution for crisp display
    const pixelSize = pixelSizes[size];

    // If we should use local fallback, generate it
    if (useLocalFallback && name) {
      return generateLocalFallbackAvatar(name, pixelSize);
    }

    // Use utility function to get the best available avatar URL
    const avatarUrl = getBestAvatarUrl(
      !imageError ? src : undefined,
      !fallbackError ? fallbackSrc : undefined,
      name,
      pixelSize,
      userId
    );

    // Ensure we never return an empty string
    return avatarUrl || '/default-avatar.svg';
  };

  // Set initial source immediately
  useEffect(() => {
    setCurrentSrc(getImageSrc());
  }, []);

  // Update current source when dependencies change
  useEffect(() => {
    setCurrentSrc(getImageSrc());
  }, [src, fallbackSrc, name, imageError, fallbackError, size, useLocalFallback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if we don't have a valid src
  if (!currentSrc) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center ${className}`}
        title={alt}
      >
        <span className="text-gray-500 text-xs">?</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      onError={!imageError ? handleImageError : (!fallbackError && fallbackSrc) ? handleFallbackError : undefined}
      loading="lazy"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      style={{
        imageRendering: 'high-quality',
        WebkitImageRendering: 'high-quality'
      }}
      onLoad={() => {
        // Reset error states on successful load
        if (imageError || fallbackError || useLocalFallback) {
          setImageError(false);
          setFallbackError(false);
          setUseLocalFallback(false);
          setRetryCount(0);
        }
      }}
    />
  );
};