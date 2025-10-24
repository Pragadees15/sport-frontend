import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '../posts/PostCard';
import { CreatePost } from '../posts/CreatePost';
import { Post } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';
import { mapPostsFromAPI } from '../../utils/postUtils';

export function Feed() {
  const { user } = useAuthStore();
  const { addPost } = useAppStore();
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [feedFilter, setFeedFilter] = useState<'my-sport' | 'all-sports'>('my-sport');
  const [loading, setLoading] = useState(false);

  // Optimized feed loading with better error handling
  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { posts } = await apiService.getHomeFeed({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc',
        feedFilter: feedFilter
      });
      // Map to local Post shape where necessary
      const mapped = mapPostsFromAPI(posts);
      setFilteredPosts(mapped);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  }, [user, feedFilter]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = useCallback((newPost: Post) => {
    addPost(newPost);
  }, [addPost]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      {/* Feed Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setFeedFilter('my-sport')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              feedFilter === 'my-sport'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            My Sport ({user.sportsCategory ? user.sportsCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'})
          </button>
          <button
            onClick={() => setFeedFilter('all-sports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              feedFilter === 'all-sports'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Sports
          </button>
        </div>
      </div>
      
      <CreatePost onPostCreated={handlePostCreated} />
      
      <div className="space-y-6">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {filteredPosts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-600">
            {feedFilter === 'my-sport' 
              ? `No posts from ${user.sportsCategory ? user.sportsCategory.replace('-', ' ') : 'your sport'} coaches yet.`
              : 'No posts from any sport yet.'
            }
            {user.role === 'coach' && ' Be the first to share something amazing!'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}