import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Eye, Users } from 'lucide-react';
import { Livestream } from '../../types';

interface LivestreamStatusIndicatorProps {
  livestream: Livestream;
  showViewerCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LivestreamStatusIndicator: React.FC<LivestreamStatusIndicatorProps> = ({
  livestream,
  showViewerCount = true,
  size = 'md'
}) => {
  const [viewerCount, setViewerCount] = useState(livestream.viewersCount);

  // Update viewer count when livestream prop changes
  useEffect(() => {
    setViewerCount(livestream.viewersCount);
  }, [livestream.viewersCount]);

  // Listen for real-time viewer count updates
  useEffect(() => {
    const handleViewerUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.livestreamId === livestream.id) {
        setViewerCount(data.viewerCount);
      }
    };

    window.addEventListener('livestreamViewerJoined', handleViewerUpdate as EventListener);
    window.addEventListener('livestreamViewerLeft', handleViewerUpdate as EventListener);

    return () => {
      window.removeEventListener('livestreamViewerJoined', handleViewerUpdate as EventListener);
      window.removeEventListener('livestreamViewerLeft', handleViewerUpdate as EventListener);
    };
  }, [livestream.id]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          dot: 'w-1.5 h-1.5'
        };
      case 'lg':
        return {
          container: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
          dot: 'w-2 h-2'
        };
      default: // md
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          dot: 'w-1.5 h-1.5'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (livestream.isLive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-red-600 text-white rounded-full font-medium flex items-center space-x-1 ${sizeClasses.container}`}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className={`bg-white rounded-full ${sizeClasses.dot}`}
        />
        <Radio className={sizeClasses.icon} />
        <span>LIVE</span>
        {showViewerCount && (
          <div className="flex items-center ml-1">
            <Eye className="w-3 h-3 mr-1" />
            <span>{viewerCount}</span>
          </div>
        )}
      </motion.div>
    );
  }

  if (livestream.scheduledTime && new Date(livestream.scheduledTime) > new Date()) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-blue-600 text-white rounded-full font-medium flex items-center space-x-1 ${sizeClasses.container}`}
      >
        <Radio className={sizeClasses.icon} />
        <span>SCHEDULED</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gray-600 text-white rounded-full font-medium flex items-center space-x-1 ${sizeClasses.container}`}
    >
      <Radio className={sizeClasses.icon} />
      <span>ENDED</span>
      {showViewerCount && livestream.maxViewers > 0 && (
        <div className="flex items-center ml-1">
          <Users className="w-3 h-3 mr-1" />
          <span>Peak: {livestream.maxViewers}</span>
        </div>
      )}
    </motion.div>
  );
};
