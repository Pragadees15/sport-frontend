import { useState } from 'react';
import { Search, MessageCircle, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

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
    created_at?: string;
    sender: {
      name: string;
    };
  };
  unread_count: number;
  last_message_at?: string; // prefer this over updated_at
}

interface MessageListProps {
  conversations: Conversation[];
  onConversationSelect: (conversationId: string) => void;
  selectedConversationId?: string | null;
  loading?: boolean;
  typingByConversation?: Record<string, string[]>;
}

export function MessageList({ 
  conversations, 
  onConversationSelect, 
  selectedConversationId,
  loading = false,
  typingByConversation = {}
}: MessageListProps) {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = (conversations || []).filter(conversation => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in conversation name (for groups)
    if (conversation.name && conversation.name.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in participant names
    const participantNames = conversation.participants
      .filter(p => p.user && p.user.name)
      .map(p => p.user.name.toLowerCase())
      .join(' ');
    
    return participantNames.includes(searchLower);
  });

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getConversationDisplay = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return {
        name: conversation.name || 'Group Chat',
        avatar: null,
        subtitle: `${conversation.participants.length} members`
      };
    }
    
    // For direct conversations, show the other participant
    // Add null safety checks for both user and participant data
    if (!user?.id) {
      return {
        name: 'Loading...',
        avatar: null,
        subtitle: ''
      };
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.user && p.user.id !== user.id
    );
    
    if (otherParticipant && otherParticipant.user) {
      return {
        name: otherParticipant.user.name || 'Unknown User',
        avatar: otherParticipant.user.avatar_url,
        subtitle: otherParticipant.user.role || 'User',
      };
    }
    
    return {
      name: 'Unknown',
      avatar: null,
      subtitle: ''
    };
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    const typers = typingByConversation[conversation.id] || [];
    if (typers.length > 0) {
      // Show typing indicator instead of last message
      return 'typing…';
    }
    if (!conversation.last_message) {
      return 'No messages yet';
    }
    
    const { content, sender } = conversation.last_message;
    const isOwnMessage = user && sender.name === user.name;
    
    if (conversation.type === 'group' && !isOwnMessage) {
      return `${sender.name}: ${content}`;
    }
    
    return isOwnMessage ? `You: ${content}` : content;
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 sm:h-4 bg-gray-300 rounded w-3/4 mb-1.5 sm:mb-2"></div>
                  <div className="h-2.5 sm:h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Modern Search */}
      <div className="p-3 sm:p-4 border-b border-gray-200/50">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50/50 border border-gray-200/50 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2 font-medium">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
            {searchTerm && (
              <p className="text-sm text-gray-500">
                Try searching for a different name
              </p>
            )}
          </div>
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => {
                const display = getConversationDisplay(conversation);
                const isSelected = selectedConversationId === conversation.id;
                
                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center space-x-3 p-3 mx-2 mb-2 cursor-pointer transition-all duration-200 rounded-xl ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 shadow-sm' 
                        : 'hover:bg-gray-50/80 hover:shadow-sm'
                    }`}
                    onClick={() => onConversationSelect(conversation.id)}
                  >
                    <div className="relative flex-shrink-0">
                      {conversation.type === 'group' ? (
                        conversation.photo_url ? (
                          <img
                            src={conversation.photo_url}
                            alt="Group photo"
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                            <span className="text-white font-semibold text-sm">
                              {conversation.participants.length}
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="relative">
                          <Avatar
                            src={display.avatar || undefined}
                            alt={display.name}
                            name={display.name}
                            size="md"
                            className="ring-2 ring-white shadow-sm"
                          />
                          {(() => {
                            const p = conversation.participants.find(p => p.user && p.user.id !== user?.id)?.user;
                            const isVerified = p?.is_verified ?? (p as any)?.isVerified;
                            if (!isVerified) return null;
                            const color = (p?.role === 'admin' || p?.role === 'administrator') ? 'bg-orange-500' : (p?.role === 'coach' ? 'bg-violet-500' : (p?.role === 'aspirant' ? 'bg-blue-500' : 'bg-blue-500'));
                            return <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${color} ring-2 ring-white`}></div>;
                          })()}
                        </div>
                      )}
                      
                      {conversation.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-sm">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </div>
                      )}
                    </div>
                  
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold truncate ${
                          conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-800'
                        }`}>
                          {display.name}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.last_message?.created_at || conversation.last_message_at)}
                          </span>
                          {conversation.unread_count > 0 && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${
                          conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                        }`}>
                          {getLastMessagePreview(conversation)}
                        </p>
                        {conversation.unread_count > 0 && (
                          <div className="flex items-center space-x-1 ml-2">
                            <CheckCheck className="h-4 w-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      
                      {display.subtitle && conversation.type !== 'group' && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {display.subtitle}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}