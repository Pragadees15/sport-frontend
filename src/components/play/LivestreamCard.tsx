import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Radio, Eye, Calendar, ExternalLink, Square } from 'lucide-react';
import { Livestream } from '../../types';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { formatLivestreamDate } from '../../utils/livestreamUtils';
import { LivestreamPlayerModal } from './LivestreamPlayerModal';
import { LivestreamStatusIndicator } from './LivestreamStatusIndicator';
import toast from 'react-hot-toast';

interface LivestreamCardProps {
  livestream: Livestream;
}

export function LivestreamCard({ livestream }: LivestreamCardProps) {
  const { user } = useAuthStore();
  const [viewersCount, setViewersCount] = useState(livestream.viewersCount);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const getYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    try {
      if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1]?.split(/[?&]/)[0] || null;
      }
      if (url.includes('youtube.com/watch')) {
        const u = new URL(url);
        return u.searchParams.get('v');
      }
      if (url.includes('youtube.com/embed/')) {
        const after = url.split('youtube.com/embed/')[1];
        return after?.split(/[?&]/)[0] || null;
      }
    } catch {}
    return null;
  };

  const youTubeId = getYouTubeId(livestream.youtubeUrl);
  const derivedThumb = youTubeId
    ? `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`
    : undefined;

  // Update viewer count when livestream prop changes
  useEffect(() => {
    setViewersCount(livestream.viewersCount);
  }, [livestream.viewersCount]);

  // Real-time socket event listeners
  useEffect(() => {
    const handleViewerJoined = (event: CustomEvent) => {
      const data = event.detail;
      if (data.livestreamId === livestream.id) {
        setViewersCount(data.viewerCount);
      }
    };

    const handleViewerLeft = (event: CustomEvent) => {
      const data = event.detail;
      if (data.livestreamId === livestream.id) {
        setViewersCount(data.viewerCount);
      }
    };

    const handleStatusUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.livestreamId === livestream.id) {
        // Update the livestream status - this would typically come from parent component
        console.log('Livestream status updated:', data);
      }
    };

    window.addEventListener('livestreamViewerJoined', handleViewerJoined as EventListener);
    window.addEventListener('livestreamViewerLeft', handleViewerLeft as EventListener);
    window.addEventListener('livestreamStatusUpdate', handleStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('livestreamViewerJoined', handleViewerJoined as EventListener);
      window.removeEventListener('livestreamViewerLeft', handleViewerLeft as EventListener);
      window.removeEventListener('livestreamStatusUpdate', handleStatusUpdate as EventListener);
    };
  }, [livestream.id]);

  const handleWatchLivestream = async () => {
    if (!livestream.youtubeUrl) {
      toast.error('Livestream URL not available');
      return;
    }
    // Join the livestream room for real-time updates
    socketService.joinLivestream(livestream.id);
    setIsPlayerOpen(true);
    // Update viewer count in backend
    try {
      await apiService.updateLivestreamViewers(livestream.id, viewersCount + 1);
      setViewersCount(prev => prev + 1);
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  };

  const handleStartLivestream = async () => {
    if (!user || user.id !== livestream.userId) return;
    
    setIsUpdating(true);
    try {
      // Update via API
      await apiService.updateLivestream(livestream.id, { isLive: true });
      
      // Also send socket event for real-time updates
      socketService.updateLivestreamStatus(livestream.id, true);
      
      toast.success('Livestream started!');
    } catch (error) {
      console.error('Error starting livestream:', error);
      toast.error('Failed to start livestream');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStopLivestream = async () => {
    if (!user || user.id !== livestream.userId) return;
    
    setIsUpdating(true);
    try {
      // Update via API
      await apiService.updateLivestream(livestream.id, { isLive: false });
      
      // Also send socket event for real-time updates
      socketService.updateLivestreamStatus(livestream.id, false);
      
      toast.success('Livestream stopped!');
    } catch (error) {
      console.error('Error stopping livestream:', error);
      toast.error('Failed to stop livestream');
    } finally {
      setIsUpdating(false);
    }
  };

  const isOwner = user && user.id === livestream.userId;


  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'coco':
        return 'bg-purple-100 text-purple-800';
      case 'martial-arts':
        return 'bg-red-100 text-red-800';
      case 'calorie-fight':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'coco':
        return 'Coco';
      case 'martial-arts':
        return 'Martial Arts';
      case 'calorie-fight':
        return 'Calorie Fight';
      default:
        return category;
    }
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 group">
        {(livestream.thumbnailUrl || derivedThumb) ? (
          <img
            src={livestream.thumbnailUrl || derivedThumb}
            alt={livestream.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Radio className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
            <Play className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="absolute top-3 left-3">
          <LivestreamStatusIndicator 
            livestream={livestream} 
            showViewerCount={false}
            size="sm"
          />
        </div>
        
        {/* Viewer count */}
        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm flex items-center space-x-1 font-medium">
          <Eye className="w-3 h-3" />
          <span>{viewersCount}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Category */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${getCategoryColor(livestream.category)} flex-shrink-0`}>
            {getCategoryLabel(livestream.category)}
          </span>
          
          {livestream.maxViewers > 0 && (
            <div className="flex items-center text-xs text-gray-500 flex-shrink-0">
              <Users className="w-3 h-3 mr-1" />
              <span>Peak: {livestream.maxViewers}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-base sm:text-lg leading-tight">
          {livestream.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed text-sm sm:text-base">
          {livestream.description}
        </p>

        {/* Coach info */}
        <div className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-xl mb-4 overflow-hidden">
          <Avatar
            src={livestream.user.avatar_url || livestream.user.profileImage}
            alt={livestream.user.name || livestream.user.fullName || 'User'}
            name={livestream.user.name || livestream.user.fullName}
            size="sm"
            className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center space-x-1 sm:space-x-2">
              <span className="truncate">{livestream.user.name || livestream.user.fullName}</span>
              {(livestream.user.is_verified ?? (livestream.user as any).isVerified) && (
                <svg className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${(
                  livestream.user.role === 'admin' || livestream.user.role === 'administrator'
                ) ? 'text-orange-500' : (livestream.user.role === 'coach' ? 'text-violet-500' : (livestream.user.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'))}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </p>
          </div>
        </div>

        {/* Scheduled time */}
        {livestream.scheduledTime && !livestream.isLive && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Scheduled: {formatLivestreamDate(livestream.scheduledTime)}</span>
          </div>
        )}

        {/* Started time for live streams */}
        {livestream.isLive && livestream.startedAt && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Play className="w-4 h-4 mr-1" />
            <span>Started: {formatLivestreamDate(livestream.startedAt)}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-4 border-t border-gray-100">
          {isOwner ? (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {livestream.isLive ? (
                <Button
                  onClick={handleStopLivestream}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
                  disabled={isUpdating}
                >
                  <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{isUpdating ? 'Stopping...' : 'Stop Stream'}</span>
                </Button>
              ) : (
                <Button
                  onClick={handleStartLivestream}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
                  disabled={isUpdating}
                >
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{isUpdating ? 'Starting...' : 'Start Stream'}</span>
                </Button>
              )}
              <Button
                onClick={handleWatchLivestream}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-0"
                disabled={!livestream.youtubeUrl}
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Preview</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleWatchLivestream}
              className={`w-full text-xs sm:text-sm px-3 py-2 min-w-0 ${
                livestream.isLive
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
              }`}
              disabled={!livestream.youtubeUrl}
            >
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">{livestream.isLive ? 'Watch Live' : 'View Stream'}</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
    {isPlayerOpen && (
      <LivestreamPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        livestream={livestream}
      />
    )}
    </>
  );
}
