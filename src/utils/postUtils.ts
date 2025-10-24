import { Post } from '../types';

/**
 * Maps raw post data from API to the frontend Post interface
 * This ensures consistent data structure across the application
 */
export function mapPostFromAPI(rawPost: any): Post {
  const mediaUrl = Array.isArray(rawPost.media_urls) ? rawPost.media_urls[0] : undefined;
  let mediaType: 'image' | 'video' | 'audio' | undefined = undefined;
  
  if (mediaUrl) {
    // Determine media type from URL
    if (mediaUrl.includes('/video/upload/')) {
      mediaType = 'video';
    } else if (mediaUrl.includes('/audio/') || mediaUrl.includes('.mp3') || mediaUrl.includes('.wav') || mediaUrl.includes('.ogg')) {
      mediaType = 'audio';
    } else {
      mediaType = 'image';
    }
  }
  
  return {
    ...rawPost,
    userId: rawPost.author_id,
    user: rawPost.author,
    mediaUrl,
    mediaType,
    likes: rawPost.likes_count,
    shares: rawPost.shares_count,
    comments: rawPost.comments_count,
    createdAt: rawPost.created_at
  };
}

/**
 * Maps an array of raw posts from API to frontend Post interface
 */
export function mapPostsFromAPI(rawPosts: any[]): Post[] {
  return rawPosts.map(mapPostFromAPI);
}
