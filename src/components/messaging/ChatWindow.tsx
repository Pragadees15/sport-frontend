import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Smile, Share, X } from 'lucide-react';
// Removed unused imports of Conversation/Message types
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { Avatar } from '../ui/Avatar';
import { VoiceInput } from '../ui/VoiceInput';
import { MoreMenuDropdown } from './MoreMenuDropdown';
import toast from 'react-hot-toast';
// Emoji picker
// @ts-ignore - types provided by package
import data from '@emoji-mart/data';
// @ts-ignore - types provided by package
import Picker from '@emoji-mart/react';

interface ChatWindowProps {
  conversation: any;
}

interface SocketMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  media_url?: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
    role?: string;
    is_verified?: boolean;
  };
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { user } = useAuthStore();
  // Note: Backend presence API not implemented yet
  // const { isUserOnline, getCachedUserPresence } = useUserPresence();
  const [newMessage, setNewMessage] = useState('');
  const [conversationMessages, setConversationMessages] = useState<SocketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File; previewUrl: string | null; progress: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!document.getElementById('emoji-popover-chat')?.contains(target) &&
          !document.getElementById('emoji-button-chat')?.contains(target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showEmojiPicker]);

  const otherUser = (conversation?.participants || []).find((p: any) => p?.user?.id !== user?.id)?.user || conversation?.participants?.[0]?.user || {};

  useEffect(() => {
    loadMessages();
    
    // Join conversation for real-time updates
    if (conversation.id) {
      socketService.joinConversation(conversation.id);
      
      // Listen for new messages
      const handleNewMessage = (message: any) => {
        const convId = message.conversation_id || (message as any).conversationId;
        if (convId === conversation.id) {
          setConversationMessages(prev => [...prev, message as SocketMessage]);
        }
      };
      
      socketService.on('newMessage', handleNewMessage);
      
      return () => {
        socketService.off('newMessage', handleNewMessage);
        socketService.leaveConversation(conversation.id);
      };
    }
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const loadMessages = async () => {
    if (!conversation.id) return;
    
    try {
      setLoading(true);
      const response = await apiService.get<{ messages: SocketMessage[] }>(`/messages/conversation/${conversation.id}?limit=50`);
      setConversationMessages((response.messages || []).reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !conversation.id || sending) return;
    const hasText = newMessage.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    try {
      setSending(true);
      
      if (hasFiles) {
        // Upload sequentially via existing API (no progress UI here to keep ChatWindow lean)
        for (const pf of pendingFiles) {
          const { file } = await apiService.uploadFile(pf.file, 'messages');
          const uploadedUrl: string = file.url;
          const uploadedType: string = (file.type || '').toLowerCase();
          const type: 'image' | 'video' | 'audio' | 'file' = uploadedType === 'image' ? 'image' : uploadedType === 'video' ? 'video' : uploadedType === 'audio' ? 'audio' : 'file';
          const contentForMedia = hasText ? newMessage.trim() : (type === 'image' ? 'Sent an image' : type === 'video' ? 'Sent a video' : type === 'audio' ? 'Sent an audio' : 'Sent a file');
          socketService.sendMessage({ conversationId: conversation.id, content: contentForMedia, type, mediaUrl: uploadedUrl });
        }
        clearPendingFiles();
        if (hasText) {
          socketService.sendMessage({ conversationId: conversation.id, content: newMessage.trim(), type: 'text' });
        }
        setNewMessage('');
      } else {
        socketService.sendMessage({ conversationId: conversation.id, content: newMessage.trim(), type: 'text' });
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = () => {
    if (!conversation || conversation.type !== 'direct' || !user) return null;
    const participants = conversation.participants || [];
    return participants.find((p: any) => p.user && p.user.id !== user.id)?.user || null;
  };

  const getStatusText = () => {
    const otherUser = getOtherUser();
    if (!otherUser) return 'offline';
    
    // Since backend API is not implemented, we can only show online/offline
    // based on socket events
    return 'offline';
  };

  const getStatusColor = () => {
    const otherUser = getOtherUser();
    if (!otherUser) return 'bg-gray-400';
    
    // Since backend API is not implemented, we can only show online/offline
    // based on socket events
    return 'bg-gray-400';
  };

  const handleShareProfile = async () => {
    try {
      // Use username if available, otherwise fall back to user ID
      const profileIdentifier = otherUser.username || otherUser.id;
      const shareUrl = `${window.location.origin}/profile/${profileIdentifier}`;
      const usernameDisplay = otherUser.username ? `(@${otherUser.username})` : '';
      const userName = otherUser.fullName || otherUser.name || 'User';
      const roleText = otherUser.role === 'coach' ? 'Professional Coach' : 
                      otherUser.role === 'aspirant' ? 'Aspiring Athlete' : 
                      otherUser.role === 'fan' ? 'Sports Fan' : 'Athlete';
      const sportsCategory = (otherUser.sportsCategory || otherUser.sports_categories?.[0] || 'sports').replace('-', ' ');
      const shareText = `Connect with ${userName} ${usernameDisplay} - ${roleText} specializing in ${sportsCategory} on SportsFeed!`;
      
      if (navigator.share && typeof navigator.canShare === 'function') {
        try {
          await navigator.share({
            title: `${userName} - SportsFeed`,
            text: shareText,
            url: shareUrl,
          });
          toast.success('Profile shared successfully!');
        } catch (shareError: any) {
          // User cancelled share or share failed
          if (shareError.name !== 'AbortError') {
            // Fallback to clipboard if share fails (but not if user cancelled)
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Profile link copied to clipboard!');
          }
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share profile error:', error);
      toast.error('Failed to share profile. Please try again.');
    }
  };

  const getVerificationBadge = () => {
    const isVerified = otherUser.is_verified ?? otherUser.isVerified;
    if (!isVerified) return null;

    const badgeColor = (otherUser.role === 'admin' || otherUser.role === 'administrator')
      ? 'text-orange-500'
      : (otherUser.role === 'coach' ? 'text-violet-500' : (otherUser.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'));

    return (
      <svg className={`w-4 h-4 ${badgeColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-gray-50">
      {/* Modern Chat Header - Fixed */}
      <div className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 border-b border-gray-200/50 bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar
              src={otherUser.avatar_url || otherUser.profileImage}
              alt={otherUser.fullName || otherUser.name || 'User'}
              name={otherUser.fullName || otherUser.name}
              size="md"
              className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-white shadow-sm"
            />
            <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 ${getStatusColor()} rounded-full ring-2 ring-white`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg truncate">{otherUser.fullName}</h3>
              {getVerificationBadge()}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={handleShareProfile}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg sm:rounded-xl hover:bg-blue-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Share Profile"
          >
            <Share className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <MoreMenuDropdown
            conversationId={conversation.id}
            otherUserId={getOtherUser()?.id}
            isGroup={conversation.type === 'group'}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {conversationMessages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm ${
                      isOwn
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {/* Media rendering */}
                    {message.media_url && (
                      <div className="mt-1">
                        {message.type === 'image' && (
                          <img src={message.media_url} alt="image" className="rounded-lg sm:rounded-xl max-h-48 sm:max-h-60 object-cover shadow-sm w-full" />
                        )}
                        {message.type === 'video' && (
                          <video src={message.media_url} controls className="rounded-lg sm:rounded-xl max-h-48 sm:max-h-60 shadow-sm w-full" />
                        )}
                        {message.type === 'audio' && (
                          <audio src={message.media_url} controls className="w-full" />
                        )}
                        {message.type === 'file' && (
                          <a href={message.media_url} target="_blank" rel="noreferrer" className={`text-xs sm:text-sm ${isOwn ? 'text-white underline' : 'text-blue-600 underline'}`}>View file</a>
                        )}
                      </div>
                    )}
                    {message.content && (
                      <p className="text-xs sm:text-sm mt-1 break-words">{message.content}</p>
                    )}
                    <div className={`flex items-center justify-between mt-1.5 sm:mt-2 ${
                      isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <p className="text-[10px] sm:text-xs">
                        {new Date(message.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {isOwn && (
                        <div className="flex items-center space-x-1 ml-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-200 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Modern Message Input */}
      <form onSubmit={handleSendMessage} className="p-2 sm:p-3 md:p-4 border-t border-gray-200/50 bg-white/80 backdrop-blur-lg pb-safe">
        <div
          className={`flex items-center space-x-2 sm:space-x-3 ${isDragging ? 'ring-2 ring-blue-400 rounded-2xl' : ''}`}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 md:p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Image className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200 text-sm sm:text-base"
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
            <button
              id="emoji-button-chat"
              type="button"
              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5 min-h-[44px] flex items-center justify-center"
              onClick={() => setShowEmojiPicker(v => !v)}
            >
              <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            {showEmojiPicker && (
              <div id="emoji-popover-chat" className="absolute bottom-14 sm:bottom-16 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2 sm:p-3 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md md:w-96">
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
          </div>

          {/* Voice-to-Text Input */}
          <div className="flex items-center px-2 py-1">
            <VoiceInput
              onTranscript={(transcript) => {
                setNewMessage((prev) => prev ? `${prev} ${transcript}` : transcript);
              }}
              buttonSize="md"
            />
          </div>
          
          <button
            type="submit"
            disabled={(newMessage.trim().length === 0 && pendingFiles.length === 0) || sending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 text-white p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}