import { useState, useEffect } from 'react';
import { Search, X, MessageCircle, Loader2, Users, MapPin, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  bio?: string;
  location?: string;
  sports_categories?: string[];
  is_verified?: boolean;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
}

export function UserSearchModal({ isOpen, onClose, onStartChat }: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchTerm.length >= 2) {
      const timeout = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setUsers([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  const searchUsers = async (query: string) => {
    try {
      setLoading(true);
      const users = await apiService.searchUsers(query, 20);
      setUsers(users);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in to start a chat');
        return;
      }

      // Create a direct conversation
      const response = await apiService.createConversation({
        type: 'direct',
        participantIds: [userId]
      });
      
      onStartChat(response.conversation.id);
      onClose();
      toast.success('Chat started!');
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      
      // Handle authentication errors
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid or expired token')) {
        toast.error('Please log in again to start a chat');
        localStorage.removeItem('auth_token');
        return;
      }
      
      // If conversation already exists, extract the conversation ID from error
      if (error.response?.data?.conversationId) {
        onStartChat(error.response.data.conversationId);
        onClose();
        toast.success('Opening existing chat!');
        return;
      }
      
      toast.error('Failed to start chat');
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setUsers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-gray-200/50"
      >
        {/* Modern Header */}
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Start New Chat</h2>
                <p className="text-sm text-gray-600">Find and connect with users</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-3 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modern Search Input */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name, email, or bio..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
              autoFocus
            />
          </div>
        </div>

        {/* Modern Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchTerm.length < 2 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">Type at least 2 characters to search for users</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-500 font-medium">Searching users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">No users found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/50">
              <AnimatePresence>
                {users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={user.avatar_url}
                          alt={user.name}
                          name={user.name}
                          size="md"
                          className="ring-2 ring-white shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {user.name}
                            </p>
                            {user.is_verified && (
                              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${(
                                user.role === 'admin' || user.role === 'administrator'
                              ) ? 'bg-orange-500' : (user.role === 'coach' ? 'bg-violet-500' : (user.role === 'aspirant' ? 'bg-blue-500' : 'bg-blue-500'))}`}>
                                <Shield className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                          {user.bio && (
                            <p className="text-sm text-gray-500 truncate mt-1">{user.bio}</p>
                          )}
                          {user.location && (
                            <div className="flex items-center space-x-1 mt-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-400">{user.location}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartChat(user.id)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center space-x-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Chat</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}