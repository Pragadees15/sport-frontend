import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Video, Send, Mic, Square, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { VoiceInput } from '../ui/VoiceInput';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface CreatePostProps {
  onPostCreated: (post: any) => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Only show create post for coaches
  if (!user || user.role !== 'coach') return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !mediaFile && !audioBlob) {
      toast.error('Please add some content, media, or voice note');
      return;
    }

    if (!user?.sports_categories?.[0]) {
      toast.error('Please set your sports category in your profile first');
      return;
    }

    setIsPosting(true);

    try {
      // Upload media files to Cloudinary first
      const mediaUrls: string[] = [];
      let postType = 'text';
      
      if (mediaFile) {
        try {
          toast.loading('Uploading media file...', { id: 'media-upload' });
          const uploadResult = await apiService.uploadFile(
            mediaFile, 
            'posts', 
            'post,media'
          );
          mediaUrls.push(uploadResult.file.url);
          postType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
          toast.success('Media uploaded successfully!', { id: 'media-upload' });
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          toast.error('Failed to upload media file. Please try again.', { id: 'media-upload' });
          return;
        }
      }
      
      if (audioBlob) {
        try {
          toast.loading('Uploading audio file...', { id: 'audio-upload' });
          // Convert blob to file for upload
          const audioFile = new File([audioBlob], 'audio-recording.webm', {
            type: 'audio/webm'
          });
          const uploadResult = await apiService.uploadFile(
            audioFile, 
            'posts', 
            'post,audio'
          );
          mediaUrls.push(uploadResult.file.url);
          postType = 'audio';
          toast.success('Audio uploaded successfully!', { id: 'audio-upload' });
        } catch (uploadError) {
          console.error('Audio upload failed:', uploadError);
          toast.error('Failed to upload audio file. Please try again.', { id: 'audio-upload' });
          return;
        }
      }

      // Create post via API (only fields supported by schema)
      const postData = {
        content: content.trim(),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
      };

      const response = await apiService.createPost(postData);
      
      // Transform the response to match the expected format
      const newPost = {
        id: response.id,
        author_id: response.author_id,
        author: response.author,
        content: response.content,
        type: response.type,
        media_urls: response.media_urls,
        sports_category: response.sports_category,
        location: response.location,
        tags: response.tags,
        is_public: response.is_public,
        allow_comments: response.allow_comments,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        created_at: response.created_at,
        updated_at: response.updated_at,
        // Frontend convenience fields
        userId: response.author_id,
        user: response.author,
        mediaUrl: response.media_urls?.[0],
        mediaType: mediaUrls.length > 0 ? (postType === 'video' ? 'video' as const : postType === 'audio' ? 'audio' as const : 'image' as const) : undefined,
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        createdAt: response.created_at,
      };

      onPostCreated(newPost);

      setContent('');
      setMediaFile(null);
      setAudioBlob(null);
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }
    
    setMediaFile(file);
    toast.success('Media file selected');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 overflow-hidden hover:shadow-md transition-all duration-300"
      data-create-post
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4">
          <div className="relative flex-shrink-0">
            <Avatar
              src={user?.avatar_url}
              fallbackSrc={user?.profileImage}
              alt={user?.fullName || 'User'}
              name={user?.fullName}
              size="lg"
              className="ring-2 ring-white shadow-sm"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 truncate">Share Your Expertise</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Connect with your athletes</p>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your training tips..."
              className="w-full p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-gray-50/50 transition-all duration-200 text-sm sm:text-base leading-relaxed"
              rows={4}
            />
            
            {mediaFile && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      {mediaFile.type.startsWith('image/') ? (
                        <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                      ) : (
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{mediaFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaFile(null)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-red-50 flex-shrink-0 ml-2"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
                {mediaFile.type.startsWith('image/') && (
                  <div className="mt-2 sm:mt-3 overflow-hidden rounded-lg">
                    <img
                      src={URL.createObjectURL(mediaFile)}
                      alt="Preview"
                      className="w-full h-40 sm:h-48 object-cover shadow-sm"
                    />
                  </div>
                )}
                {mediaFile.type.startsWith('video/') && (
                  <div className="mt-2 sm:mt-3 overflow-hidden rounded-lg">
                    <video
                      src={URL.createObjectURL(mediaFile)}
                      controls
                      className="w-full h-40 sm:h-48 object-cover shadow-sm"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {audioBlob && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-200 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm flex-shrink-0">
                      <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-green-700 block truncate">Voice note recorded</span>
                      <p className="text-[10px] sm:text-xs text-green-600 truncate">Ready to share</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioBlob(null)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-red-50 flex-shrink-0 ml-2"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4 sm:mt-6">
              <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center space-x-1.5 sm:space-x-2 text-gray-500 hover:text-blue-500 cursor-pointer transition-all duration-200 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl hover:bg-blue-50 flex-shrink-0 border border-gray-200 hover:border-blue-300 min-h-[44px]"
                >
                  <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">Photo</span>
                </label>

                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <label
                  htmlFor="video-upload"
                  className="flex items-center space-x-1.5 sm:space-x-2 text-gray-500 hover:text-purple-500 cursor-pointer transition-all duration-200 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl hover:bg-purple-50 flex-shrink-0 border border-gray-200 hover:border-purple-300 min-h-[44px]"
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">Video</span>
                </label>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center space-x-1.5 sm:space-x-2 cursor-pointer transition-all duration-200 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl flex-shrink-0 border min-h-[44px] ${
                    isRecording
                      ? 'text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300'
                      : 'text-gray-500 hover:text-green-500 hover:bg-green-50 border-gray-200 hover:border-green-300'
                  }`}
                >
                  {isRecording ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                  <span className="text-xs sm:text-sm font-medium">{isRecording ? 'Stop' : 'Voice'}</span>
                </button>

                {/* Voice-to-Text Input */}
                <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl border border-gray-200 hover:border-blue-300 min-h-[44px]">
                  <VoiceInput
                    onTranscript={(transcript) => {
                      setContent((prev) => prev ? `${prev} ${transcript}` : transcript);
                    }}
                    buttonSize="sm"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-500">Voice-to-Text</span>
                </div>
              </div>
              
              <Button
                type="submit"
                loading={isPosting}
                disabled={!content.trim() && !mediaFile && !audioBlob}
                size="sm"
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg sm:rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none text-sm min-h-[44px]"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Share Post
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}