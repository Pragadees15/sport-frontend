import { Livestream } from '../types';

/**
 * Transform API response livestream data to frontend format
 */
export const transformLivestreamFromAPI = (apiLivestream: any): Livestream => {
  return {
    id: apiLivestream.id,
    userId: apiLivestream.user_id,
    title: apiLivestream.title,
    description: apiLivestream.description,
    youtubeUrl: apiLivestream.youtube_url,
    thumbnailUrl: apiLivestream.thumbnail_url,
    category: apiLivestream.category,
    isLive: apiLivestream.is_live || false,
    scheduledTime: apiLivestream.scheduled_time,
    startedAt: apiLivestream.started_at,
    endedAt: apiLivestream.ended_at,
    viewersCount: apiLivestream.viewers_count || 0,
    maxViewers: apiLivestream.max_viewers || 0,
    isActive: apiLivestream.is_active !== false,
    createdAt: apiLivestream.created_at,
    updatedAt: apiLivestream.updated_at,
    user: apiLivestream.coach || apiLivestream.user,
    coach: apiLivestream.coach,
    // Keep API format fields for backward compatibility
    youtube_url: apiLivestream.youtube_url,
    thumbnail_url: apiLivestream.thumbnail_url,
    is_live: apiLivestream.is_live,
    scheduled_time: apiLivestream.scheduled_time,
    started_at: apiLivestream.started_at,
    ended_at: apiLivestream.ended_at,
    viewers_count: apiLivestream.viewers_count,
    max_viewers: apiLivestream.max_viewers,
    is_active: apiLivestream.is_active,
    created_at: apiLivestream.created_at,
    updated_at: apiLivestream.updated_at,
  };
};

/**
 * Transform frontend livestream data to API format
 */
export const transformLivestreamToAPI = (livestream: Partial<Livestream>): any => {
  return {
    title: livestream.title,
    description: livestream.description,
    youtubeUrl: livestream.youtubeUrl,
    thumbnailUrl: livestream.thumbnailUrl,
    category: livestream.category,
    scheduledTime: livestream.scheduledTime,
    isLive: livestream.isLive,
    isActive: livestream.isActive,
  };
};

/**
 * Get livestream status text
 */
export const getLivestreamStatus = (livestream: Livestream): string => {
  if (livestream.isLive) return 'Live';
  if (livestream.scheduledTime && new Date(livestream.scheduledTime) > new Date()) {
    return 'Scheduled';
  }
  return 'Ended';
};

/**
 * Get livestream status color classes
 */
export const getLivestreamStatusColor = (livestream: Livestream): string => {
  if (livestream.isLive) return 'text-red-600 bg-red-100';
  if (livestream.scheduledTime && new Date(livestream.scheduledTime) > new Date()) {
    return 'text-blue-600 bg-blue-100';
  }
  return 'text-gray-600 bg-gray-100';
};

/**
 * Format date for display
 */
export const formatLivestreamDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Check if user is the owner of the livestream
 */
export const isLivestreamOwner = (livestream: Livestream, userId: string): boolean => {
  return livestream.userId === userId;
};
