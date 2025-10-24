import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Trash2, Eye, Users, Calendar, Clock } from 'lucide-react';
import { Livestream } from '../../types';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { formatLivestreamDate } from '../../utils/livestreamUtils';
import { LivestreamStatusIndicator } from './LivestreamStatusIndicator';
import toast from 'react-hot-toast';

interface LivestreamManagerProps {
  livestreams: Livestream[];
  onRefresh: () => void;
}

export const LivestreamManager: React.FC<LivestreamManagerProps> = ({
  livestreams,
  onRefresh
}) => {
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);


  const handleStartLivestream = async (livestreamId: string) => {
    setIsUpdating(livestreamId);
    try {
      await apiService.updateLivestream(livestreamId, { isLive: true });
      socketService.updateLivestreamStatus(livestreamId, true);
      toast.success('Livestream started!');
      onRefresh();
    } catch (error) {
      console.error('Error starting livestream:', error);
      toast.error('Failed to start livestream');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleStopLivestream = async (livestreamId: string) => {
    setIsUpdating(livestreamId);
    try {
      await apiService.updateLivestream(livestreamId, { isLive: false });
      socketService.updateLivestreamStatus(livestreamId, false);
      toast.success('Livestream stopped!');
      onRefresh();
    } catch (error) {
      console.error('Error stopping livestream:', error);
      toast.error('Failed to stop livestream');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteLivestream = async (livestreamId: string) => {
    if (!confirm('Are you sure you want to delete this livestream?')) return;
    
    try {
      await apiService.deleteLivestream(livestreamId);
      toast.success('Livestream deleted!');
      onRefresh();
    } catch (error) {
      console.error('Error deleting livestream:', error);
      toast.error('Failed to delete livestream');
    }
  };


  if (!user || user.role !== 'coach') {
    return null;
  }

  const myLivestreams = livestreams.filter(stream => stream.userId === user.id);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-lg">
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Livestreams</h2>
        </div>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {myLivestreams.length} total streams
        </div>
      </div>

      {myLivestreams.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full p-6 w-20 h-20 mx-auto mb-6">
            <Play className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">No livestreams yet</h3>
          <p className="text-gray-600 text-lg">Create your first livestream to start connecting with your audience.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myLivestreams.map((livestream) => (
            <motion.div
              key={livestream.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{livestream.title}</h3>
                    <LivestreamStatusIndicator 
                      livestream={livestream} 
                      showViewerCount={false}
                      size="sm"
                    />
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                    {livestream.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span>{livestream.viewersCount} viewers</span>
                    </div>
                    
                    {livestream.maxViewers > 0 && (
                      <div className="flex items-center">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span>Peak: {livestream.maxViewers}</span>
                      </div>
                    )}

                    {livestream.scheduledTime && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">{formatLivestreamDate(livestream.scheduledTime)}</span>
                        <span className="sm:hidden">{new Date(livestream.scheduledTime).toLocaleDateString()}</span>
                      </div>
                    )}

                    {livestream.startedAt && livestream.isLive && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Started: {formatLivestreamDate(livestream.startedAt)}</span>
                        <span className="sm:hidden">Live</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:ml-6">
                  {livestream.isLive ? (
                    <Button
                      onClick={() => handleStopLivestream(livestream.id)}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg text-xs sm:text-sm px-3 py-2"
                      disabled={isUpdating === livestream.id}
                      size="sm"
                    >
                      <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="truncate">{isUpdating === livestream.id ? 'Stopping...' : 'Stop'}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStartLivestream(livestream.id)}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg text-xs sm:text-sm px-3 py-2"
                      disabled={isUpdating === livestream.id}
                      size="sm"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="truncate">{isUpdating === livestream.id ? 'Starting...' : 'Start'}</span>
                    </Button>
                  )}

                  <Button
                    onClick={() => handleDeleteLivestream(livestream.id)}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 text-xs sm:text-sm px-3 py-2"
                    size="sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
