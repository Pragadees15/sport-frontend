import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  connect: (token: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: any) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],

  connect: async (token: string) => {
    try {
      const socket = await socketService.connect(token);

      socket.on('connect', () => {
        console.log('Connected to server');
        set({ isConnected: true });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        set({ isConnected: false, onlineUsers: [] });
      });

      socket.on('users_online', (users: string[]) => {
        set({ onlineUsers: users });
      });

      socket.on('user_joined', (userId: string) => {
        set(state => ({
          onlineUsers: [...state.onlineUsers, userId]
        }));
      });

      socket.on('user_left', (userId: string) => {
        set(state => ({
          onlineUsers: state.onlineUsers.filter(id => id !== userId)
        }));
      });

      set({ socket, isConnected: socketService.isConnected() });
    } catch (error) {
      console.error('Failed to connect to socket:', error);
    }
  },

  disconnect: () => {
    socketService.disconnect();
    set({ socket: null, isConnected: false, onlineUsers: [] });
  },

  joinRoom: (roomId: string) => {
    socketService.emit('join_room', roomId);
  },

  leaveRoom: (roomId: string) => {
    socketService.emit('leave_room', roomId);
  },

  sendMessage: (roomId: string, message: any) => {
    socketService.emit('send_message', { roomId, message });
  },
}));