import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';

interface UserStats {
  posts_count: number;
  followers_count: number;
  following_count: number;
  likes_received: number;
  comments_received: number;
  shares_received: number;
  streak_days: number;
  total_workouts: number;
  achievements_count: number;
  tokens_balance: number;
}

export function ActivityStats() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const fetchUserStats = async () => {
    const now = Date.now();
    if (isFetchingRef.current) return; // prevent concurrent fetches
    if (now - lastFetchRef.current < 700) return; // debounce rapid triggers
    lastFetchRef.current = now;
    isFetchingRef.current = true;
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const data = await apiService.getUserStats(user.id);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setStats({
        posts_count: 0,
        followers_count: 0,
        following_count: 0,
        likes_received: 0,
        comments_received: 0,
        shares_received: 0,
        streak_days: 0,
        total_workouts: 0,
        achievements_count: 0,
        tokens_balance: 0
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  // Refetch on follow/unfollow changes elsewhere in the app
  useEffect(() => {
    const handler = () => fetchUserStats();
    window.addEventListener('user:follow-changed', handler as EventListener);
    return () => window.removeEventListener('user:follow-changed', handler as EventListener);
  }, []);

  const formatNumber = (num: number | undefined) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
          <div className="space-y-2 sm:space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6"
    >
      <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Your Activity</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-0.5 sm:mb-1 truncate">{formatNumber(stats.posts_count)}</div>
          <div className="text-xs sm:text-sm text-blue-700 font-medium break-words">Posts</div>
        </div>
        
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-0.5 sm:mb-1 truncate">{formatNumber(stats.followers_count)}</div>
          <div className="text-xs sm:text-sm text-green-700 font-medium break-words">Followers</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-0.5 sm:mb-1 truncate">{formatNumber(stats.following_count)}</div>
          <div className="text-xs sm:text-sm text-purple-700 font-medium break-words">Following</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-0.5 sm:mb-1 truncate">{stats.streak_days}</div>
          <div className="text-xs sm:text-sm text-orange-700 font-medium break-words">Day Streak</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-gray-700 font-medium">Engagement Rate</span>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, stats.posts_count > 0 ? Math.round(((stats.likes_received || 0) + (stats.comments_received || 0)) / stats.posts_count) : 0)}%` 
                }}
              ></div>
            </div>
            <span className="font-bold text-gray-900 text-xs sm:text-sm">
              {stats.posts_count > 0 ? Math.round(((stats.likes_received || 0) + (stats.comments_received || 0)) / stats.posts_count) : 0}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}