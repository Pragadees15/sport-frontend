import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, Share } from 'lucide-react';
import { Video } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
  onVideoUpdate?: () => void;
}

export function VideoPlayerModal({ video, onClose, onVideoUpdate }: VideoPlayerModalProps) {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likes_count || video.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const src = (video as any).video_url || (video as any).videoUrl || '';

  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      if (!url) return null;
      const isShort = url.includes('youtu.be/');
      const isWatch = url.includes('youtube.com/watch');
      if (isShort) {
        const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (isWatch) {
        const u = new URL(url);
        const id = u.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.includes('youtube.com/embed/')) return url;
      return null;
    } catch {
      return null;
    }
  };
  const youTubeEmbedUrl = /youtube\.com|youtu\.be/.test(src) ? getYouTubeEmbedUrl(src) : null;

  const handleLike = async () => {
    if (!user) return;
    
    if (isLiking) {
      return; // Prevent multiple simultaneous requests
    }
    
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiking(true);
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      await apiService.likeVideo(video.id);
      
      if (newIsLiked) {
        toast.success('Video liked! +2 tokens earned');
      }
      
      // Refresh video data to get updated counts
      if (onVideoUpdate) {
        onVideoUpdate();
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      toast.error('Failed to like video');
    } finally {
      setIsLiking(false);
    }
  };

  const handleClose = () => {
    // Refresh video data when closing to get updated view count
    if (onVideoUpdate) {
      onVideoUpdate();
    }
    onClose();
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    const shareText = `Check out this ${video.type === 'premium' ? 'premium' : 'free'} ${video.category.replace('-', ' ')} video by ${video.coach?.fullName || video.coach?.name}: "${video.title}"`;

    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: shareText,
        url: shareUrl,
      }).then(() => {
        toast.success('Video shared successfully!');
      }).catch(() => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
          toast.success('Video link copied to clipboard!');
        });
      });
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
        toast.success('Video link copied to clipboard!');
      }).catch(() => {
        toast.success('Video shared!');
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-2xl font-bold text-gray-900 truncate">{video.title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black">
          {youTubeEmbedUrl ? (
            <iframe
              src={youTubeEmbedUrl}
              className="w-full h-64 md:h-96"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={video.title}
            />
          ) : (
            <video
              src={src}
              poster={(video as any).thumbnail_url || (video as any).thumbnailUrl}
              controls
              autoPlay
              muted
              playsInline
              className="w-full h-64 md:h-96 object-contain"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Video Info */}
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{video.title}</h3>
              <p className="text-gray-600 mb-4 text-lg leading-relaxed">{video.description}</p>
              
              {/* Coach Info */}
              <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                <Avatar
                  src={video.coach?.avatar_url || video.coach?.profileImage}
                  alt={video.coach?.fullName || video.coach?.name || 'Coach'}
                  name={video.coach?.fullName || video.coach?.name}
                  size="md"
                  className="h-12 w-12 mr-4"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-900 text-lg">{video.coach?.fullName || video.coach?.name}</p>
                    {video.coach?.isVerified && (
                      <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 capitalize font-medium">{video.coach?.sportsCategory?.replace('-', ' ') || 'Sports'}</p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-3 ml-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                loading={isLiking}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                {likesCount}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleShare}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-3 mb-6">
            {video.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-8 text-sm text-gray-500 border-t border-gray-200 pt-6">
            <span className="font-semibold">{(video.views_count || video.views || 0).toLocaleString()} views</span>
            <span className="font-semibold">{video.likes_count || video.likes || 0} likes</span>
            <span className="capitalize font-semibold">{video.difficulty} level</span>
            <span className="font-semibold">{Math.floor(video.duration / 60)} minutes</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}