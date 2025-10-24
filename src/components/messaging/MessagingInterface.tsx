import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, ArrowLeft, X, Settings } from 'lucide-react';
// Emoji picker
// @ts-ignore - types provided by package
import data from '@emoji-mart/data';
// @ts-ignore - types provided by package
import Picker from '@emoji-mart/react';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EditGroupModal } from './EditGroupModal';
import { MoreMenuDropdown } from './MoreMenuDropdown';
import { useUserPresence } from '../../hooks/useUserPresence';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    is_verified: boolean;
  };
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  photo_url?: string;
  participants: {
    user: {
      id: string;
      name: string;
      avatar_url?: string;
      role: string;
      is_verified: boolean;
    };
    role: string;
    joined_at: string;
  }[];
  unread_count: number;
  last_message_at: string;
}

interface MessagingInterfaceProps {
  conversationId?: string;
  onBack?: () => void;
  onConversationUpdate?: () => void;
}

export function MessagingInterface({ conversationId, onBack, onConversationUpdate }: MessagingInterfaceProps) {
  const { user } = useAuthStore();
  const { onlineUsers } = useUserPresence();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File; previewUrl: string | null; progress: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (files: FileList | File[]) => {
    const list: File[] = Array.from(files as any);
    const mapped = list.map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
      file: f,
      previewUrl: f.type.startsWith('image') ? URL.createObjectURL(f) : null,
      progress: 0,
    }));
    setPendingFiles((prev) => [...prev, ...mapped]);
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearPendingFiles = () => {
    setPendingFiles((prev) => {
      prev.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const uploadWithProgress = (file: File, _folder: string, onProgress: (pct: number) => void): Promise<{ url: string; type: 'image' | 'video' | 'audio' | 'file' }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('auth_token') || '';
      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
      const url = `${baseUrl}/upload/single`;
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'messages');
      form.append('tags', 'message');

      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress(pct);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              const uploadedType = (json?.file?.type || '').toLowerCase();
              const t: 'image' | 'video' | 'audio' | 'file' = uploadedType === 'image'
                ? 'image'
                : uploadedType === 'video'
                ? 'video'
                : uploadedType === 'audio'
                ? 'audio'
                : 'file';
              resolve({ url: json?.file?.url, type: t });
            } catch (e) {
              reject(new Error('Invalid upload response'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  };

  useEffect(() => {
    if (conversationId && user) {
      loadConversation();
      loadMessages();
      joinConversation();
      setupSocketListeners();
    }

    return () => {
      if (conversationId) {
        leaveConversation();
        cleanupSocketListeners();
      }
    };
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Note: Backend presence API not implemented yet
  // Presence data will be populated via socket events only

  const setupSocketListeners = () => {
    if (!conversationId) return;

    socketService.on('newMessage', (message: Message) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, message]);
        markMessagesAsRead();
      }
    });

    socketService.on('userTyping', (payload: any) => {
      const userId: string = payload?.userId;
      const isTyping: boolean = !!payload?.isTyping;
      const convId: string | undefined = payload?.conversationId;
      // Support servers that don't send conversationId by assuming current conversation
      if (convId && convId !== conversationId) return;
      if (!userId) return;
      if (userId !== user?.id) {
        setTyping(prev => {
          if (isTyping) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else {
            return prev.filter(id => id !== userId);
          }
        });
      }
    });

    socketService.on('messageRead', () => {
      // Handle message read receipts if needed
    });
  };

  const cleanupSocketListeners = () => {
    socketService.off('newMessage');
    socketService.off('userTyping');
    socketService.off('messageRead');
  };

  const joinConversation = () => {
    if (conversationId) {
      socketService.joinConversation(conversationId);
    }
  };

  const leaveConversation = () => {
    if (conversationId) {
      socketService.leaveConversation(conversationId);
    }
  };

  const loadConversation = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const response = await apiService.get<{ conversation: Conversation }>(`/conversations/${conversationId}`);
      console.log('Loaded conversation:', response.conversation);
      setConversation(response.conversation);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await apiService.get<{ messages: Message[] }>(`/messages/conversation/${conversationId}?limit=50`);
      setMessages(response.messages.reverse()); // Reverse to show oldest first
      
      // Only mark messages as read if we successfully loaded messages
      // This indicates the user still has access to the conversation
      markMessagesAsRead();
    } catch (error) {
      console.error('Failed to load messages:', error);
      
      // If it's a 403 error, the user might not be a participant anymore
      if (error instanceof Error && error.message.includes('Not authorized')) {
        console.log('User no longer has access to this conversation');
        toast.error('You no longer have access to this conversation');
        // Refresh the conversation list to remove this conversation
        if (onConversationUpdate) {
          onConversationUpdate();
        }
      } else {
        toast.error('Failed to load messages');
      }
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId) return;

    try {
      await apiService.markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      
      // If it's a 403 error, the user might not be a participant anymore
      if (error instanceof Error && error.message.includes('Not authorized')) {
        console.log('User no longer has access to this conversation, refreshing conversation list');
        // Refresh the conversation list to remove this conversation
        if (onConversationUpdate) {
          onConversationUpdate();
        }
      }
    }
  };

  const sendMessage = async () => {
    if (!conversationId || sending) return;

    const hasText = newMessage.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const messageContent = hasText ? newMessage.trim() : '';
    setNewMessage('');
    setSending(true);

    try {
      if (hasFiles) {
        // Upload all files first
        const mediaData: { url: string; type: string }[] = [];
        
        for (const pf of pendingFiles) {
          const { url, type } = await uploadWithProgress(pf.file, 'messages', (pct) => {
            setPendingFiles((prev) => prev.map((x) => (x.id === pf.id ? { ...x, progress: pct } : x)));
          });
          mediaData.push({ url, type });
        }
        
        // If we have both text and files, send a single message with the text and primary media
        if (hasText) {
          const primaryMedia = mediaData[0];
          const ok = socketService.sendMessage({ 
            conversationId, 
            content: messageContent, 
            type: primaryMedia.type, 
            mediaUrl: primaryMedia.url 
          });
          if (!ok) throw new Error('Socket not connected');
        } else {
          // If only files, send each as separate media message
          for (const media of mediaData) {
            const contentForMedia = media.type === 'image' ? 'Sent an image' : media.type === 'video' ? 'Sent a video' : media.type === 'audio' ? 'Sent an audio' : 'Sent a file';
            const ok = socketService.sendMessage({ conversationId, content: contentForMedia, type: media.type, mediaUrl: media.url });
            if (!ok) throw new Error('Socket not connected');
          }
        }
        clearPendingFiles();
      } else if (hasText) {
        const ok = socketService.sendMessage({ conversationId, content: messageContent, type: 'text' });
        if (!ok) throw new Error('Socket not connected');
      }

      // Message will be added via socket event
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      if (hasText) setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!conversationId) return;

    socketService.sendTyping({
      conversationId,
      isTyping
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Handle typing indicators
    if (e.target.value.trim()) {
      handleTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 1000);
    } else {
      handleTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Emoji handling
  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) {
      setNewMessage(prev => prev + emoji);
      return;
    }
    const el = inputRef.current;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(next);
    // Restore caret after render
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close when clicking outside of picker or emoji button area
      if (!document.getElementById('emoji-popover')?.contains(target) &&
          !document.getElementById('emoji-button')?.contains(target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showEmojiPicker]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getOtherUser = () => {
    if (!conversation || conversation.type !== 'direct' || !user) return null;
    return conversation.participants.find(p => p.user.id !== user.id)?.user || null;
  };

  const getStatusText = () => {
    const otherUser = getOtherUser();
    if (!otherUser) {
      return 'offline';
    }
    
    const isOnline = onlineUsers.has(otherUser.id);
    
    if (isOnline) {
      return 'online';
    }
    
    return 'offline';
  };

  const getStatusColor = () => {
    const otherUser = getOtherUser();
    if (!otherUser) return 'bg-gray-400';
    
    const isOnline = onlineUsers.has(otherUser.id);
    
    if (isOnline) return 'bg-green-500';
    
    return 'bg-gray-400';
  };

  const getOtherParticipants = () => {
    if (!conversation || !user) return [];
    return conversation.participants.filter(p => p.user.id !== user.id);
  };

  const getConversationTitle = () => {
    if (!conversation) return 'Loading...';
    
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    
    const otherParticipants = getOtherParticipants();
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name;
    }
    
    return 'Chat';
  };

  const handleGroupUpdate = () => {
    loadConversation();
    if (onConversationUpdate) {
      onConversationUpdate();
    }
  };

  const handleGroupDelete = () => {
    if (onConversationUpdate) {
      onConversationUpdate();
    }
    // Navigate back to conversation list or close the interface
    if (onBack) {
      onBack();
    }
  };

  const isGroupAdmin = () => {
    if (!conversation || !user) return false;
    const userParticipant = conversation.participants.find(p => p.user.id === user.id);
    return userParticipant?.role === 'admin';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white to-gray-50">
      {/* Modern Header - Fixed */}
      <div className="sticky top-0 z-10 p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              {conversation.type === 'direct' && getOtherParticipants().length === 1 ? (
                <div className="relative">
                  <Avatar
                    src={getOtherParticipants()[0]?.user?.avatar_url}
                    alt={getOtherParticipants()[0]?.user?.name || 'Unknown User'}
                    name={getOtherParticipants()[0]?.user?.name || 'Unknown User'}
                    size="md"
                    className="ring-2 ring-white shadow-sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor()} rounded-full ring-2 ring-white`}></div>
                </div>
              ) : (
                conversation.photo_url ? (
                  <img
                    src={conversation.photo_url}
                    alt="Group photo"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                    <span className="text-white font-semibold">
                      {conversation?.participants?.length || 0}
                    </span>
                  </div>
                )
              )}
              
              <div>
                <h2 className="font-semibold text-gray-900">{getConversationTitle()}</h2>
                {conversation.type === 'group' ? (
                  <p className="text-sm text-gray-600">
                    {conversation.participants.length} members
                  </p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      {typing.length > 0 ? 'typing...' : getStatusText()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {conversation.type === 'group' && isGroupAdmin() && (
              <button
                onClick={() => setShowEditGroup(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Edit Group"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <MoreMenuDropdown
              conversationId={conversationId || ''}
              otherUserId={getOtherUser()?.id}
              isGroup={conversation.type === 'group'}
              onConversationUpdate={onConversationUpdate}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
        {[...messages]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((message, index, arr) => {
          const isOwn = message.sender_id === user?.id;
          const showAvatar = !isOwn && (index === 0 || arr[index - 1].sender_id !== message.sender_id);
          
          // Add null safety check for sender
          if (!message.sender) {
            return null;
          }
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {showAvatar && !isOwn && (
                  <Avatar
                    src={message.sender?.avatar_url}
                    alt={message.sender?.name || 'Unknown User'}
                    name={message.sender?.name || 'Unknown User'}
                    size="sm"
                    className="ring-2 ring-white shadow-sm"
                  />
                )}
                
                <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                  isOwn 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  {!isOwn && conversation?.type === 'group' && showAvatar && (
                    <p className="text-xs font-medium mb-1 text-gray-600">
                      {message.sender?.name || 'Unknown User'}
                    </p>
                  )}
                  {/* Media rendering */}
                  {message.media_url && (
                    <div className="mt-1">
                      {message.type === 'image' && (
                        <img src={message.media_url} alt="image" className="rounded-xl max-h-60 object-cover shadow-sm" />
                      )}
                      {message.type === 'video' && (
                        <video src={message.media_url} controls className="rounded-xl max-h-60 shadow-sm" />
                      )}
                      {message.type === 'audio' && (
                        <audio src={message.media_url} controls className="w-full" />
                      )}
                      {message.type === 'file' && (
                        <a href={message.media_url} target="_blank" rel="noreferrer" className={`${isOwn ? 'text-white underline' : 'text-blue-600 underline'}`}>View file</a>
                      )}
                    </div>
                  )}
                  {message.content && (
                    <p className="text-sm mt-1">{message.content}</p>
                  )}
                  <div className={`flex items-center justify-between mt-1 ${
                    isOwn ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <p className="text-xs">
                      {formatMessageTime(message.created_at)}
                    </p>
                    {isOwn && (
                      <div className="flex items-center space-x-1 ml-2">
                        <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        }).filter(Boolean)}
        
        {/* Typing indicators */}
        <AnimatePresence>
          {typing.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center space-x-2"
            >
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-500">
                {(() => {
                  if (!conversation) return 'Someone is typing...';
                  const names: string[] = [];
                  const uniqueIds = new Set(typing);
                  uniqueIds.forEach(id => {
                    const p = conversation.participants.find(p => p.user.id === id);
                    if (p?.user?.name) names.push(p.user.name);
                  });
                  if (names.length === 0) return 'Someone is typing...';
                  if (names.length === 1) return `${names[0]} is typing...`;
                  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
                  return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing...`;
                })()}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Modern Message Input */}
      <div className="p-4 border-t border-gray-200/50 bg-white/80 backdrop-blur-lg">
        <div
          className={`flex items-end space-x-3 ${isDragging ? 'ring-2 ring-blue-400 rounded-2xl' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              addFiles(e.dataTransfer.files);
              e.dataTransfer.clearData();
            }
          }}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              addFiles(e.target.files);
              e.currentTarget.value = '';
            }
          }} multiple />
          <button className="p-3 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
              disabled={sending}
              ref={inputRef}
            />
            {pendingFiles.length > 0 && (
              <div className="absolute -top-28 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex items-center space-x-2 max-w-md overflow-x-auto">
                {pendingFiles.map((pf) => (
                  <div key={pf.id} className="flex items-center space-x-2 border border-gray-200 rounded-lg p-2 mr-2 bg-gray-50">
                    {pf.previewUrl ? (
                      <img src={pf.previewUrl} className="h-10 w-10 object-cover rounded-lg" alt="preview" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-600">{pf.file.type.split('/')[0] || 'file'}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate max-w-[120px]">{pf.file.name}</p>
                      <div className="h-1 bg-gray-200 rounded-full">
                        <div className="h-1 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pf.progress}%` }}></div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(pf.id)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button id="emoji-button" onClick={() => setShowEmojiPicker(v => !v)} className="p-3 hover:bg-gray-100 rounded-xl transition-colors">
            <Smile className="h-5 w-5 text-gray-600" />
          </button>
          {showEmojiPicker && (
            <div id="emoji-popover" className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 w-80 md:w-96">
              <Picker
                data={data}
                onEmojiSelect={(e: any) => insertEmoji(e.native || e.shortcodes || '')}
                theme="light"
                previewPosition="none"
                searchPosition="sticky"
                dynamicWidth={false}
                perLine={7}
                emojiButtonSize={40}
                emojiSize={24}
                navPosition="top"
                skinTonePosition="search"
                maxFrequentRows={2}
              />
            </div>
          )}
          
          <Button
            onClick={sendMessage}
            disabled={(newMessage.trim().length === 0 && pendingFiles.length === 0) || sending}
            size="sm"
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Edit Group Modal */}
      {showEditGroup && conversation && (
        <EditGroupModal
          isOpen={showEditGroup}
          onClose={() => setShowEditGroup(false)}
          conversation={conversation}
          onGroupUpdate={handleGroupUpdate}
          onGroupDelete={handleGroupDelete}
        />
      )}
    </div>
  );
}