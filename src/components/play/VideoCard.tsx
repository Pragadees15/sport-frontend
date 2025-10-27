import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Eye, Heart, Lock, Coins, Share } from 'lucide-react';
import { Video } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { VideoPlayerModal } from './VideoPlayerModal';
import { WatchAdModal } from './WatchAdModal';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface VideoCardProps {
  video: Video;
  onVideoUpdate?: () => void;
}

export function VideoCard({ video, onVideoUpdate }: VideoCardProps) {
  const { user } = useAuthStore();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [likesCount, setLikesCount] = useState(video.likes_count || video.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    if (!user) return;

    // For premium videos, ensure user has premium access first
    if (video.type === 'premium') {
      try {
        const { hasAccess } = await apiService.checkMembershipAccess('premium');
        if (!hasAccess) {
          toast.error('Premium membership required to watch this video');
          // Hint the Play Page to open Memberships tab
          window.dispatchEvent(new Event('openMemberships'));
          return;
        }
      } catch (_) {
        // If check fails, be safe and block until user verifies
        toast.error('Unable to verify membership. Please try again.');
        return;
      }
    }

    // Record video watch
    try {
      // Open the player immediately for better UX; backend validation still runs
      setShowPlayer(true);
      const response = await apiService.watchVideo(video.id);
      
      // Show feedback based on whether this was a new view
      if (response.isNewView) {
        toast.success('Video watch recorded! +5 tokens earned');
      } else {
        toast.success('Welcome back to this video!');
      }
      
      // Do not refresh here to avoid reloading the video section mid-play.
      // The view count and tokens will be updated when the user closes the modal.
    } catch (error) {
      console.error('Failed to record video watch:', error);
      // Still show the player even if watch recording fails
      setShowPlayer(true);
    }
  };

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
        // Notify listeners to refresh token stats
        window.dispatchEvent(new CustomEvent('tokensUpdated'));
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

  const handleShare = () => {
    if (!user) return;
    
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
        // Fallback to clipboard
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
          toast.success('Video link copied to clipboard!');
        });
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
        toast.success('Video link copied to clipboard!');
      }).catch(() => {
        toast.success('Video shared!');
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'coco': return 'bg-orange-100 text-orange-800';
      case 'martial-arts': return 'bg-red-100 text-red-800';
      case 'calorie-fight': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
      >
        {/* Thumbnail */}
        <div className="relative group">
          <img
            src={video.thumbnail_url || video.thumbnailUrl}
            alt={video.title}
            className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={handlePlay}
              className="bg-white/90 hover:bg-white rounded-full p-3 sm:p-4 transition-all transform hover:scale-110 shadow-lg"
            >
              <Play className="h-6 w-6 sm:h-8 sm:w-8 text-gray-800 ml-1" />
            </button>
          </div>
          
          {/* Duration */}
          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/80 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm flex items-center font-medium">
            <Clock className="h-3 w-3 mr-0.5 sm:mr-1" />
            {formatDuration(video.duration)}
          </div>
          
          {/* Premium Badge */}
          {video.type === 'premium' && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold flex items-center shadow-lg">
              <Lock className="h-3 w-3 mr-0.5 sm:mr-1" />
              {video.tokenCost} tokens
            </div>
          )}
          
          {/* Free Badge */}
          {video.type === 'free' && (
            <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-lg">
              FREE
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-hidden">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <h3 className="font-bold text-gray-900 line-clamp-2 flex-1 text-base sm:text-lg leading-tight">{video.title}</h3>
          </div>
          
          <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">{video.description}</p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${getCategoryColor(video.category)}`}>
              {video.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${getDifficultyColor(video.difficulty)}`}>
              {video.difficulty.charAt(0).toUpperCase() + video.difficulty.slice(1)}
            </span>
          </div>
          
          {/* Coach Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-xl overflow-hidden">
            <Avatar
              src={video.coach?.avatar_url || video.coach?.profileImage}
              alt={video.coach?.fullName || video.coach?.name || 'Coach'}
              name={video.coach?.fullName || video.coach?.name}
              size="sm"
              className="h-8 w-8 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{video.coach?.fullName || video.coach?.name}</span>
                {(video.coach?.is_verified ?? video.coach?.isVerified) && (
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${(
                    video.coach?.role === 'admin' || video.coach?.role === 'administrator'
                  ) ? 'text-orange-500' : (video.coach?.role === 'coach' ? 'text-violet-500' : (video.coach?.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'))}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 capitalize truncate">{video.coach?.role || 'Coach'}</p>
            </div>
          </div>
          
          {/* Stats and Actions */}
          <div className="pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-medium">{(video.views_count || video.views || 0).toLocaleString()}</span>
                </div>
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center space-x-0.5 sm:space-x-1 transition-all min-h-[44px] min-w-[44px] justify-center ${
                    isLiked ? 'text-red-500' : 'hover:text-red-500'
                  } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="font-medium">{likesCount}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-0.5 sm:space-x-1 text-gray-500 hover:text-blue-500 transition-colors min-h-[44px] min-w-[44px] justify-center"
                >
                  <Share className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-medium hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
            
            <Button
              onClick={handlePlay}
              size="sm"
              className={`w-full text-xs sm:text-sm ${
                video.type === 'premium' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
              }`}
            >
              {video.type === 'premium' ? (
                <>
                  <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {video.tokenCost} Tokens
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Watch Free
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Video Player Modal */}
      {showPlayer && (
        <VideoPlayerModal
          video={video}
          onClose={() => setShowPlayer(false)}
          onVideoUpdate={onVideoUpdate}
        />
      )}
      
      {/* Watch Ad Modal */}
      {showAdModal && (
        <WatchAdModal
          onClose={() => setShowAdModal(false)}
          userId={user?.id || ''}
        />
      )}
    </>
  );
}