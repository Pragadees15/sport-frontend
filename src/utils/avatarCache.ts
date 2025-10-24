/**
 * Simple in-memory cache for avatar URLs to reduce API calls
 */

interface CacheEntry {
  url: string;
  timestamp: number;
  errorCount: number;
}

class AvatarCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ERRORS = 3;

  set(key: string, url: string): void {
    this.cache.set(key, {
      url,
      timestamp: Date.now(),
      errorCount: 0
    });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    // Check if URL has too many errors
    if (entry.errorCount >= this.MAX_ERRORS) {
      return null;
    }

    return entry.url;
  }

  markError(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.errorCount++;
      // If too many errors, remove from cache
      if (entry.errorCount >= this.MAX_ERRORS) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key from user data
  generateKey(userId: string, avatarUrl?: string, name?: string): string {
    if (avatarUrl) {
      return `avatar_${userId}_${avatarUrl}`;
    }
    if (name) {
      return `fallback_${userId}_${name}`;
    }
    return `default_${userId}`;
  }
}

export const avatarCache = new AvatarCache();
