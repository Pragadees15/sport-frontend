/**
 * Cache management utilities for handling browser cache issues
 */

export class CacheManager {
  /**
   * Clear all application cache and storage
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if available
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            }
          })
        );
      }
      
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      console.log('All cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
  
  /**
   * Clear only application-specific localStorage items
   */
  static clearAppStorage(): void {
    const keysToRemove = [
      'auth_token',
      'user_preferences',
      'app_state',
      'cached_user_data'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Application storage cleared');
  }
  
  /**
   * Force reload the page with cache bypass
   */
  static forceReload(): void {
    // Use location.reload(true) equivalent for modern browsers
    window.location.reload();
  }
  
  /**
   * Check if the app is running from cache
   */
  static isRunningFromCache(): boolean {
    return (
      window.performance &&
      window.performance.navigation &&
      window.performance.navigation.type === window.performance.navigation.TYPE_BACK_FORWARD
    );
  }
  
  /**
   * Add cache-busting parameter to URL
   */
  static addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
  }
  
  /**
   * Get cache status information
   */
  static getCacheInfo(): {
    localStorage: number;
    sessionStorage: number;
    hasServiceWorker: boolean;
    hasCacheAPI: boolean;
  } {
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasCacheAPI: 'caches' in window
    };
  }
}

/**
 * Hook for React components to manage cache
 */
export const useCacheManager = () => {
  const clearCache = async () => {
    try {
      await CacheManager.clearAllCache();
      CacheManager.forceReload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };
  
  const clearAppData = () => {
    CacheManager.clearAppStorage();
    CacheManager.forceReload();
  };
  
  return {
    clearCache,
    clearAppData,
    getCacheInfo: CacheManager.getCacheInfo,
    isFromCache: CacheManager.isRunningFromCache()
  };
};