import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../services/socket';

interface UserPresence {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
}

interface UseUserPresenceReturn {
  onlineUsers: Set<string>;
  getUserPresence: (userId: string) => Promise<UserPresence | null>;
  getCachedUserPresence: (userId: string) => UserPresence | null;
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => Promise<void>;
  isUserOnline: (userId: string) => boolean;
}

export function useUserPresence(): UseUserPresenceReturn {
  const { user } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userPresences, setUserPresences] = useState<Map<string, UserPresence>>(new Map());

  // Note: Backend presence API not implemented yet
  // For now, we'll rely on socket events only

  // Set up socket listeners for real-time presence updates
  useEffect(() => {
    if (!user) return;

    const handleUserOnline = (userId: string) => {
      console.log('🟢 User came online:', userId);
      setOnlineUsers(prev => new Set([...prev, userId]));
      setUserPresences(prev => new Map(prev).set(userId, { status: 'online' }));
    };

    const handleUserOffline = (userId: string) => {
      console.log('🔴 User went offline:', userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setUserPresences(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, { status: 'offline' });
        return newMap;
      });
    };

    const handleUsersOnline = (userIds: string[]) => {
      console.log('👥 Users online batch update:', userIds);
      setOnlineUsers(new Set(userIds));
      const newPresences = new Map();
      userIds.forEach(id => {
        newPresences.set(id, { status: 'online' });
      });
      setUserPresences(newPresences);
    };

    // Listen for presence events
    socketService.on('userOnline', handleUserOnline);
    socketService.on('userOffline', handleUserOffline);
    socketService.on('usersOnline', handleUsersOnline);

    // Listen for socket connection to request online users
    const handleConnect = () => {
      console.log('🔌 Socket connected, requesting online users');
      socketService.requestOnlineUsers();
    };

    socketService.on('connect', handleConnect);

    // Request current online users if already connected
    if (socketService.isConnected()) {
      socketService.requestOnlineUsers();
    }

    return () => {
      socketService.off('userOnline', handleUserOnline);
      socketService.off('userOffline', handleUserOffline);
      socketService.off('usersOnline', handleUsersOnline);
      socketService.off('connect', handleConnect);
    };
  }, [user]);

  // Update user's own presence - Backend API not implemented yet
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    console.log('⚠️ Backend presence API not implemented, updating local state only');
    
    // Update local state only
    if (user) {
      setUserPresences(prev => new Map(prev).set(user.id, { status }));
      if (status === 'online') {
        setOnlineUsers(prev => new Set([...prev, user.id]));
      } else {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(user.id);
          return newSet;
        });
      }
    }
  }, [user]);

  // Get user presence (with caching) - Backend API not implemented yet
  const getUserPresence = useCallback(async (userId: string): Promise<UserPresence | null> => {
    // Check cache first
    const cached = userPresences.get(userId);
    if (cached) {
      return cached;
    }

    // Backend API not implemented yet, return null
    console.log('⚠️ Backend presence API not implemented, returning null for user:', userId);
    return null;
  }, [userPresences]);

  // Get user presence synchronously (from cache only)
  const getCachedUserPresence = useCallback((userId: string): UserPresence | null => {
    return userPresences.get(userId) || null;
  }, [userPresences]);

  // Check if user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    getUserPresence,
    getCachedUserPresence,
    updatePresence,
    isUserOnline,
  };
}
