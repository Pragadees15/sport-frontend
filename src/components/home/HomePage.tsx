import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '../posts/PostCard';
import { CreatePost } from '../posts/CreatePost';
import { SuggestedUsers } from './SuggestedUsers.tsx';
import { ActivityStats } from './ActivityStats.tsx';
import { Post } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { mapPostsFromAPI } from '../../utils/postUtils';

import { 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Zap,
  Star,
  Target,
  Trophy,
  Rss
} from 'lucide-react';

export function HomePage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'my-sport' | 'all-sports' | 'following'>('my-sport');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Optimized fetchPosts with better error handling and performance
  const fetchPosts = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }
      
      setError(null);
      
      const params: any = {
        page: pageNum,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc',
        feedFilter
      };

      const resp = await apiService.getHomeFeed(params);
      const rawPosts = resp.posts || [];
      
      // Map to local Post shape where necessary
      const mappedPosts = mapPostsFromAPI(rawPosts);
      
      if (pageNum === 1 || isRefresh) {
        setPosts(mappedPosts);
      } else {
        setPosts(prev => [...prev, ...mappedPosts]);
      }
      
      setHasMore(Boolean(resp.hasMore));
      
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [feedFilter]);

  useEffect(() => {
    if (user) {
      fetchPosts(1);
    }
  }, [user, feedFilter]);

  // Memoized handlers for better performance
  const handlePostCreated = useCallback(async (newPost: Post) => {
    // Optimistically add the post to the top of the feed
    setPosts(prev => [newPost, ...prev]);
    
    // Optionally refresh to get the latest data
    setTimeout(() => {
      fetchPosts(1, true);
    }, 1000);
  }, [fetchPosts]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    fetchPosts(1, true);
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [loading, hasMore, page, fetchPosts]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 mb-6 shadow-lg">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Welcome to your sports hub</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 break-words text-center">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent inline-block">
                Welcome back, {user.name || user.fullName}!
              </span>
              <span className="ml-2 text-3xl emoji inline-block" role="img" aria-label="waving hand">👋</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 break-words">
              Ready to connect with your {user.sports_categories?.[0] ? user.sports_categories[0].replace('-', ' ') : 'sports'} community and achieve your goals?
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Track Progress</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Connect with Athletes</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Achieve Goals</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Sidebar - Desktop Only */}
          <div className="hidden xl:block xl:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ActivityStats />
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-6 space-y-6">

            {/* Feed Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Rss className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Your Feed</h2>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFeedFilter('my-sport')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    feedFilter === 'my-sport'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  <span className="hidden sm:inline truncate">My Sport ({user.sports_categories?.[0] ? user.sports_categories[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'})</span>
                  <span className="sm:hidden">My Sport</span>
                </button>
                <button
                  onClick={() => setFeedFilter('following')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    feedFilter === 'following'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  Following
                </button>
                <button
                  onClick={() => setFeedFilter('all-sports')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    feedFilter === 'all-sports'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  <span className="hidden sm:inline">All Sports</span>
                  <span className="sm:hidden">All</span>
                </button>
              </div>
            </motion.div>
            
            {/* Create Post */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              data-create-post
            >
              <CreatePost onPostCreated={handlePostCreated} />
            </motion.div>
            
            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start space-x-4"
              >
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading posts</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Posts Feed */}
            <div className="space-y-6">
              {loading && posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading your feed...</h3>
                  <p className="text-gray-600">Please wait while we fetch the latest posts</p>
                </div>
              ) : (
                <>
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && posts.length > 0 && (
                    <div className="flex justify-center py-8">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Zap className="h-5 w-5" />
                            <span>Load More Posts</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Empty State */}
            {!loading && posts.length === 0 && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No posts yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto break-words">
                  {feedFilter === 'my-sport' 
                    ? `No posts from ${user.sports_categories?.[0] ? user.sports_categories[0].replace('-', ' ') : 'your sport'} community yet.`
                    : feedFilter === 'following'
                    ? 'No posts from people you follow yet.'
                    : 'No posts from any sport yet.'
                  }
                </p>
                {user.role === 'coach' && (
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full px-6 py-3">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-700 font-medium">Be the first to share something amazing!</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Sidebar - Desktop Only */}
          <div className="hidden xl:block xl:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SuggestedUsers />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}