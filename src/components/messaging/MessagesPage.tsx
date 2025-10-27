import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Users, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { MessageList } from './MessageList';
import { MessagingInterface } from './MessagingInterface';
import { CreateGroupModal } from './CreateGroupModal';
import { UserSearchModal } from './UserSearchModal';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  photo_url?: string;
  participants: {
    user: {
      id: string;
      name: string;
      avatar_url?: string;
      role: string;
      is_verified: boolean;
    };
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      name: string;
    };
  };
  unread_count: number;
  updated_at: string;
}

export function MessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { connect, isConnected } = useSocketStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [typingByConversation, setTypingByConversation] = useState<Record<string, string[]>>({});
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access your messages.</p>
        </div>
      </div>
    );
  }

  // Memoized resize handler
  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Ensure socket connection is established
  useEffect(() => {
    if (user && !isConnected) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        connect(token);
      }
    }
  }, [user, isConnected, connect]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Realtime: update conversations list on new messages
  useEffect(() => {
    // Typing indicators across list
    const handleUserTyping = (payload: any) => {
      const convId: string | undefined = payload?.conversationId;
      const userId: string | undefined = payload?.userId;
      const isTyping: boolean = !!payload?.isTyping;
      if (!userId) return;
      if (convId) {
        setTypingByConversation(prev => {
          const current = new Set(prev[convId] || []);
          if (userId === user?.id) return prev; // ignore self
          if (isTyping) {
            current.add(userId);
          } else {
            current.delete(userId);
          }
          return { ...prev, [convId]: Array.from(current) };
        });
        // Auto-expire typing after 3s if no stop event arrives
        const key = `${convId}:${userId}`;
        if (typingTimeoutsRef.current.has(key)) {
          clearTimeout(typingTimeoutsRef.current.get(key)!);
        }
        if (isTyping) {
          const t = setTimeout(() => {
            setTypingByConversation(prev => {
              const current = new Set(prev[convId] || []);
              current.delete(userId);
              return { ...prev, [convId]: Array.from(current) };
            });
            typingTimeoutsRef.current.delete(key);
          }, 3000);
          typingTimeoutsRef.current.set(key, t);
        } else {
          typingTimeoutsRef.current.delete(key);
        }
      }
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { socketService } = require('../../services/socket');
      socketService.on('userTyping', handleUserTyping);
      return () => {
        socketService.off('userTyping', handleUserTyping);
      };
    } catch {
      return () => {};
    }
  }, [user]);

  useEffect(() => {
    const handleNewMessage = (message: any) => {
      setConversations(prev => {
        // Find the conversation
        const convId = message.conversation_id || message.conversationId;
        const idx = prev.findIndex(c => c.id === convId);
        if (idx === -1) return prev;

        const updated = [...prev];
        const target = { ...updated[idx] } as any;
        // Update last message preview and time
        target.last_message = {
          content: message.content,
          created_at: message.created_at,
          sender: { name: message.sender?.name || (user?.id === message.sender_id ? user.name : '') }
        };
        target.last_message_at = message.created_at;
        // Increment unread if not the sender and not currently open
        if (message.sender_id !== user?.id && selectedConversationId !== convId) {
          target.unread_count = (target.unread_count || 0) + 1;
        }

        updated.splice(idx, 1);
        return [target as any, ...updated];
      });
      // Clear typing for this conversation for the sender (they stopped typing)
      const convId = message.conversation_id || message.conversationId;
      const senderId = message.sender_id;
      if (convId && senderId) {
        setTypingByConversation(prev => {
          const current = new Set(prev[convId] || []);
          current.delete(senderId);
          return { ...prev, [convId]: Array.from(current) };
        });
      }
    };

    // Attach and cleanup
    window.addEventListener('newMessage', handleNewMessage as any);
    // Also attach to socket service directly
    const onSocketNewMsg = (m: any) => handleNewMessage(m);
    try {
      // optional: may not exist if socket not yet connected
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { socketService } = require('../../services/socket');
      socketService.on('newMessage', onSocketNewMsg);
      return () => {
        socketService.off('newMessage', onSocketNewMsg);
        window.removeEventListener('newMessage', handleNewMessage as any);
      };
    } catch {
      return () => {
        window.removeEventListener('newMessage', handleNewMessage as any);
      };
    }
  }, [user, selectedConversationId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found, skipping conversation load');
        setConversations([]);
        return;
      }

      const response = await apiService.getConversations();
      setConversations(response.conversations || []);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      
      // Handle authentication errors
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid or expired token')) {
        toast.error('Please log in to view your conversations');
        localStorage.removeItem('auth_token');
        setConversations([]);
        return;
      }
      
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  const handleCreateGroup = async (groupData: { name: string; memberIds: string[] }) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in to create a group');
        return;
      }

      const response = await apiService.createConversation({
        type: 'group',
        name: groupData.name,
        participantIds: groupData.memberIds
      });
      
      setConversations(prev => [response.conversation, ...prev]);
      setShowCreateGroup(false);
      setSelectedConversationId(response.conversation.id);
      toast.success('Group created successfully!');
    } catch (error: any) {
      console.error('Failed to create group:', error);
      
      // Handle authentication errors
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid or expired token')) {
        toast.error('Please log in again to create a group');
        localStorage.removeItem('auth_token');
        return;
      }
      
      toast.error('Failed to create group');
    }
  };

  const handleStartChat = (conversationId: string) => {
    // Reload conversations to include the new one
    loadConversations();
    setSelectedConversationId(conversationId);
  };



  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isMobile && selectedConversationId) {
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Also lock on html element
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        document.documentElement.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, selectedConversationId]);

  // Mobile view: show either conversation list or messaging interface
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <motion.div 
          className="fixed inset-0 z-[100] bg-white overflow-hidden"
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3 }}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100dvh', // Dynamic viewport height for mobile browsers (falls back to 100vh)
          }}
        >
          <MessagingInterface
            conversationId={selectedConversationId}
            onBack={handleBackToList}
            onConversationUpdate={loadConversations}
          />
        </motion.div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
        {/* Compact User Profile Section - Mobile - Fixed */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.name}
                    name={user.name}
                    size="sm"
                    className="ring-2 ring-white shadow-sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{user.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Mobile Header - Fixed */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Messages</h1>
                  <p className="text-xs text-gray-500">{conversations.length} conversations</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => setShowUserSearch(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-1 bg-white/50 hover:bg-white border-gray-200 px-2 py-1 text-xs"
                >
                  <Search className="h-3 w-3" />
                  <span>New</span>
                </Button>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  size="sm"
                  className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-2 py-1 text-xs"
                >
                  <Users className="h-3 w-3" />
                  <span>Group</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-[calc(100vh-140px)] overflow-y-auto">
          <MessageList
            conversations={conversations}
            onConversationSelect={handleConversationSelect}
            loading={loading}
            typingByConversation={typingByConversation}
          />
        </div>
        
        <AnimatePresence>
          {showCreateGroup && (
            <CreateGroupModal
              isOpen={showCreateGroup}
              onClose={() => setShowCreateGroup(false)}
              onCreateGroup={handleCreateGroup}
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showUserSearch && (
            <UserSearchModal
              isOpen={showUserSearch}
              onClose={() => setShowUserSearch(false)}
              onStartChat={handleStartChat}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop view: side-by-side layout
  return (
    <div className="h-[calc(100vh-64px)] flex bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
      {/* Modern Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-lg border-r border-gray-200/50 shadow-xl flex flex-col overflow-hidden">
        {/* Compact User Profile Section - Fixed */}
        <div className="sticky top-0 z-10 p-3 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/30 to-indigo-50/30">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar
                src={user.avatar_url}
                alt={user.name}
                name={user.name}
                size="md"
                className="ring-2 ring-white shadow-sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <h3 className="font-semibold text-gray-900 truncate text-sm">{user.name}</h3>
                {user.is_verified && (
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                    user.role === 'coach' ? 'bg-violet-500' : 'bg-blue-500'
                  }`}>
                    <svg className="h-1.5 w-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Compact Header - Fixed */}
        <div className="sticky top-0 z-10 p-3 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Messages</h1>
                <p className="text-xs text-gray-500">{conversations.length} conversations</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => setShowUserSearch(true)}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1 bg-white/50 hover:bg-white border-gray-200 px-2 py-1 text-xs"
              >
                <Search className="h-3 w-3" />
                <span>New</span>
              </Button>
              <Button
                onClick={() => setShowCreateGroup(true)}
                size="sm"
                className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-2 py-1 text-xs"
              >
                <Users className="h-3 w-3" />
                <span>Group</span>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <MessageList
            conversations={conversations}
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId}
            loading={loading}
            typingByConversation={typingByConversation}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {selectedConversationId ? (
          <MessagingInterface 
            conversationId={selectedConversationId} 
            onConversationUpdate={loadConversations}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <motion.div 
              className="text-center max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Messages</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Start a conversation with someone or create a group chat
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                  className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => setShowUserSearch(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Start New Chat</h3>
                  <p className="text-sm text-gray-600">Find users and start a conversation</p>
                </motion.div>
                <motion.div 
                  className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => setShowCreateGroup(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Create Group Chat</h3>
                  <p className="text-sm text-gray-600">Start a group conversation</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showUserSearch && (
          <UserSearchModal
            isOpen={showUserSearch}
            onClose={() => setShowUserSearch(false)}
            onStartChat={handleStartChat}
          />
        )}
      </AnimatePresence>
    </div>
  );
}