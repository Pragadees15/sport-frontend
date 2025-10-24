import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  
  // Message events
  newMessage: (message: any) => void;
  messageUpdated: (message: any) => void;
  messageDeleted: (messageId: string) => void;
  messageRead: (data: { messageId: string; userId: string }) => void;
  
  // Conversation events
  conversationUpdated: (conversation: any) => void;
  conversationDeleted: (conversationId: string) => void;
  participantAdded: (data: { conversationId: string; participant: any }) => void;
  participantRemoved: (data: { conversationId: string; participantId: string }) => void;
  
  // Typing events
  userTyping: (data: { userId: string; conversationId: string; isTyping: boolean }) => void;
  
  // Notification events
  newNotification: (notification: any) => void;
  notificationRead: (notificationId: string) => void;
  notificationDeleted: (notificationId: string) => void;
  
  // User status events
  userOnline: (userId: string) => void;
  userOffline: (userId: string) => void;
  usersOnline: (userIds: string[]) => void;
  
  // Location events
  locationUpdate: (data: { userId: string; location: { latitude: number; longitude: number } }) => void;
  userJoinedLocation: (data: { userId: string; locationId: string }) => void;
  userLeftLocation: (data: { userId: string; locationId: string }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentLocationId: string | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private currentToken: string | null = null;

  connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      // Store the current token
      this.currentToken = token;
      
      // If socket exists and is connected, return it
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      // If already connecting, return existing socket or wait
      if (this.isConnecting && this.socket) {
        resolve(this.socket);
        return;
      }

      // If socket exists but not connected, disconnect it first
      if (this.socket && !this.isConnecting) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnecting = true;

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔥 Socket connection error:', error);
        this.isConnecting = false;
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
        this.handleReconnect(token);
      });

      this.setupEventListeners();
      this.reattachEventListeners();
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.eventListeners.clear();
    this.reconnectAttempts = 0;
  }

  emit(event: string, data?: any): boolean {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }
    console.warn(`⚠️ Cannot emit '${event}': Socket not connected`);
    return false;
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void;
  on(event: string, callback: (...args: any[]) => void): void;
  on(event: string, callback: (...args: any[]) => void): void {
    // Store the listener for reattachment after reconnection
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]): void;
  off(event: string, callback?: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      // Remove specific listener
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
      
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private reattachEventListeners(): void {
    if (!this.socket) return;

    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        this.socket!.on(event, callback as any);
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      if (this.currentToken) {
        this.handleReconnect(this.currentToken);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Location-specific events
    this.socket.on('locationUserCountUpdate', (data: {
      locationId: string;
      userCount: number;
      users: string[];
    }) => {
      window.dispatchEvent(new CustomEvent('locationUserCountUpdate', { detail: data }));
    });

    this.socket.on('userJoinedLocation', (data: {
      locationId: string;
      user: any;
      timestamp: string;
    }) => {
      window.dispatchEvent(new CustomEvent('userJoinedLocation', { detail: data }));
    });

    this.socket.on('userLeftLocation', (data: {
      locationId: string;
      userId: string;
      timestamp: string;
    }) => {
      window.dispatchEvent(new CustomEvent('userLeftLocation', { detail: data }));
    });

    this.socket.on('userCheckedIn', (data: {
      checkIn: any;
      user: any;
      tokensEarned: number;
      timestamp: string;
    }) => {
      window.dispatchEvent(new CustomEvent('userCheckedIn', { detail: data }));
    });

    this.socket.on('locationUsersResponse', (data: {
      locationId: string;
      userCount: number;
      users: string[];
    }) => {
      window.dispatchEvent(new CustomEvent('locationUsersResponse', { detail: data }));
    });

    // Livestream events
    this.socket.on('viewerJoined', (data: {
      livestreamId: string;
      userId: string;
      userEmail: string;
      viewerCount: number;
    }) => {
      window.dispatchEvent(new CustomEvent('livestreamViewerJoined', { detail: data }));
    });

    this.socket.on('viewerLeft', (data: {
      livestreamId: string;
      userId: string;
      viewerCount: number;
    }) => {
      window.dispatchEvent(new CustomEvent('livestreamViewerLeft', { detail: data }));
    });

    this.socket.on('livestreamStatusUpdate', (data: {
      livestreamId: string;
      isLive: boolean;
      startedAt?: string;
      endedAt?: string;
    }) => {
      window.dispatchEvent(new CustomEvent('livestreamStatusUpdate', { detail: data }));
    });
  }

  private handleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(token).catch(console.error);
    }, delay);
  }

  // Conversation methods
  joinConversation(conversationId: string): boolean {
    return this.emit('joinConversation', conversationId);
  }

  leaveConversation(conversationId: string): boolean {
    return this.emit('leaveConversation', conversationId);
  }

  // Message methods
  sendMessage(data: { conversationId: string; content: string; type?: string; mediaUrl?: string }): boolean {
    return this.emit('sendMessage', data);
  }

  markMessageAsRead(messageId: string): boolean {
    return this.emit('markMessageRead', { messageId });
  }

  // Typing indicators
  sendTyping(data: { conversationId: string; isTyping: boolean }): boolean {
    return this.emit('typing', data);
  }

  // Notification methods
  markNotificationAsRead(notificationId: string): boolean {
    return this.emit('markNotificationRead', { notificationId });
  }

  // Livestream methods
  joinLivestream(livestreamId: string): boolean {
    return this.emit('joinLivestream', livestreamId);
  }

  leaveLivestream(livestreamId: string): boolean {
    return this.emit('leaveLivestream', livestreamId);
  }

  updateLivestreamStatus(livestreamId: string, isLive: boolean): boolean {
    return this.emit('updateLivestreamStatus', { livestreamId, isLive });
  }

  // Location tracking methods
  joinLocation(locationId: string, latitude?: number, longitude?: number, locationName?: string): boolean {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join location');
      return false;
    }

    // Create consistent location ID from coordinates for room naming
    const lat = latitude || 0;
    const lng = longitude || 0;
    const coordinateBasedId = `${Math.round(lat * 10000)}_${Math.round(lng * 10000)}`;
    
    this.currentLocationId = coordinateBasedId;
    const success = this.emit('joinLocation', {
      locationId: coordinateBasedId,
      originalLocationId: locationId,
      latitude: lat,
      longitude: lng,
      locationName
    });
    
    if (success) {
      console.log(`Joined location room: ${coordinateBasedId} (original: ${locationId})`);
    }
    return success;
  }

  leaveLocation(locationId: string): boolean {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot leave location');
      return false;
    }

    const success = this.emit('leaveLocation', locationId);
    if (success && this.currentLocationId === locationId) {
      this.currentLocationId = null;
    }
    return success;
  }

  getLocationUsers(locationId: string): boolean {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot get location users');
      return false;
    }

    return this.emit('getLocationUsers', locationId);
  }

  updateLocation(latitude: number, longitude: number, accuracy?: number): boolean {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot update location');
      return false;
    }

    return this.emit('locationUpdate', {
      latitude,
      longitude,
      accuracy
    });
  }

  getCurrentLocationId(): string | null {
    return this.currentLocationId;
  }

  // User status methods
  setUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): boolean {
    return this.emit('setStatus', { status });
  }

  // Request current online users list
  requestOnlineUsers(): boolean {
    return this.emit('getOnlineUsers');
  }

  // Utility methods
  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  // Ping method for connection testing
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = Date.now();
      this.socket.emit('ping', start, () => {
        const latency = Date.now() - start;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }
}

export const socketService = new SocketService();
export default socketService;