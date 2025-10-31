import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface SuggestedUser {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  role: string;
  sports_category: string;
  is_verified?: boolean;
  followers_count: number;
  posts_count: number;
  bio?: string;
}

export function SuggestedUsers() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());

  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true);
      
              const data = await apiService.getSuggestedUsers({
                limit: 5,
                exclude_following: true,
                ...(user?.sports_categories?.[0] && { sports_category: user.sports_categories[0] })
              });
              
      
      // Transform User objects to SuggestedUser objects
      const transformedUsers: SuggestedUser[] = (data.users || []).map(user => {
        return {
          ...user,
          sports_category: user.sports_categories?.[0] || 'other',
          followers_count: user.followers_count || 0,
          posts_count: user.posts_count || 0
        };
      });
      
      console.log('Transformed users:', transformedUsers);
      console.log('Users with role "user":', transformedUsers.filter(u => u.role === 'user'));
      
      if (transformedUsers.length > 0) {
        setSuggestedUsers(transformedUsers);
      } else {
        console.log('No users returned from API');
        setSuggestedUsers([]);
      }
      // Notify in case follow counts changed previously
      window.dispatchEvent(new Event('user:follow-changed'));
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      setSuggestedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
    }
  }, [user]);

  // Check follow status for suggested users
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || suggestedUsers.length === 0) return;
      
      try {
        // Use batch API if available, otherwise fall back to individual calls
        try {
          const userIds = suggestedUsers.map(u => u.id);
          const batchStatus = await apiService.checkFollowStatusBatch(userIds);
          const followingSet = new Set(
            Object.entries(batchStatus.statuses)
              .filter(([_, isFollowing]) => isFollowing)
              .map(([userId, _]) => userId)
          );
          setFollowingUsers(followingSet);
          console.log('Batch follow status check completed:', batchStatus.statuses);
        } catch (batchError) {
          console.log('Batch follow status failed, falling back to individual calls:', batchError);
          
          // Fallback to individual calls
          const followStatusPromises = suggestedUsers.map(async (suggestedUser) => {
            try {
              console.log(`Checking follow status for user: ${suggestedUser.id} (${suggestedUser.name})`);
              const status = await apiService.checkFollowStatus(suggestedUser.id);
              console.log(`Follow status for ${suggestedUser.id}:`, status);
              return { userId: suggestedUser.id, isFollowing: status.isFollowing };
            } catch (error) {
              console.error(`Error checking follow status for ${suggestedUser.id} (${suggestedUser.name}):`, error);
              // If it's a 404 error, the user might not exist, so we can skip them
              if (error instanceof Error && error.message.includes('not found')) {
                console.log(`User ${suggestedUser.id} not found, skipping follow status check`);
                return { userId: suggestedUser.id, isFollowing: false };
              }
              return { userId: suggestedUser.id, isFollowing: false };
            }
          });
          
          const followStatuses = await Promise.all(followStatusPromises);
          const followingSet = new Set(
            followStatuses
              .filter(status => status.isFollowing)
              .map(status => status.userId)
          );
          
          setFollowingUsers(followingSet);
        }
      } catch (error) {
        console.error('Error checking follow statuses:', error);
      }
    };

    checkFollowStatus();
  }, [suggestedUsers, user]);

  const handleFollow = async (userId: string) => {
    if (!user || processingFollow.has(userId)) return;
    
    setProcessingFollow(prev => new Set([...prev, userId]));
    
    try {
      const isCurrentlyFollowing = followingUsers.has(userId);
      
      if (isCurrentlyFollowing) {
        // Unfollow user
        await apiService.unfollowUser(userId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        // Update follower count optimistically
        setSuggestedUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, followers_count: Math.max(0, u.followers_count - 1) }
            : u
        ));
        // Notify other widgets to refresh stats
        window.dispatchEvent(new Event('user:follow-changed'));
        toast.success('Unfollowed successfully');
      } else {
        // Follow user
        await apiService.followUser(userId);
        setFollowingUsers(prev => new Set([...prev, userId]));
        // If we exclude following in fetch, remove the user from suggestions immediately
        setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
        // Optionally backfill another suggestion
        fetchSuggestedUsers();
        // Notify other widgets to refresh stats
        window.dispatchEvent(new Event('user:follow-changed'));
        toast.success('Following user');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to follow/unfollow user');
    } finally {
      setProcessingFollow(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDismiss = (userId: string) => {
    setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSeeAllSuggestions = () => {
    navigate('/dashboard/discover');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'coach':
        return 'text-blue-600 bg-blue-100';
      case 'administrator':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6"
    >
      <div className="flex items-center gap-2 sm:gap-2.5 mb-4 sm:mb-5">
        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-sm flex-shrink-0">
          <Users className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">Suggested for you</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-7 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestedUsers.map((suggestedUser, index) => (
            <motion.div
              key={suggestedUser.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:from-blue-50 hover:to-purple-50 transition-all duration-300"
            >
              <div className="flex items-start gap-2.5 sm:gap-3 w-full">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={suggestedUser.avatar_url}
                    alt={suggestedUser.name}
                    name={suggestedUser.name}
                    size="md"
                    className="ring-2 ring-white shadow-sm"
                  />
                  {suggestedUser.is_verified && (
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${(
                        suggestedUser.role === 'admin' || suggestedUser.role === 'administrator'
                      ) ? 'bg-orange-500' : (suggestedUser.role === 'coach' ? 'bg-violet-500' : (suggestedUser.role === 'aspirant' ? 'bg-blue-500' : 'bg-blue-500'))}`}
                    >
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Header with Name and Dismiss */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate-with-tooltip leading-tight">
                        {suggestedUser.name}
                      </h4>
                      {suggestedUser.username && (
                        <p className="text-xs text-gray-500 truncate-with-tooltip mt-0.5">
                          @{suggestedUser.username}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDismiss(suggestedUser.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  {/* Role and Sport Category */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0 ${getRoleColor(suggestedUser.role)}`}>
                      {suggestedUser.role}
                    </span>
                    <span className="text-xs text-gray-500 capitalize truncate-with-tooltip flex-shrink min-w-0">
                      {suggestedUser.sports_category.replace('-', ' ')}
                    </span>
                  </div>
                  
                  {/* Bio - Only show on larger sidebar or main content */}
                  {suggestedUser.bio && (
                    <p className="text-xs text-gray-600 truncate-2-lines overflow-safe leading-snug hidden 2xl:block">
                      {suggestedUser.bio}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
                    <span className="truncate">
                      <span className="font-semibold text-gray-900">{formatNumber(suggestedUser.followers_count)}</span> followers
                    </span>
                    <span className="hidden xl:inline truncate">
                      <span className="font-semibold text-gray-900">{formatNumber(suggestedUser.posts_count)}</span> posts
                    </span>
                  </div>
                  
                  {/* Follow Button - Full Width on Small Sidebar */}
                  <div className="pt-1">
                    <button
                      onClick={() => handleFollow(suggestedUser.id)}
                      disabled={followingUsers.has(suggestedUser.id) || processingFollow.has(suggestedUser.id)}
                      className={`w-full px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] shadow-sm ${
                        followingUsers.has(suggestedUser.id)
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {processingFollow.has(suggestedUser.id) ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                      ) : followingUsers.has(suggestedUser.id) ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          <span>Following</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Follow</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {suggestedUsers.length === 0 && (
            <div className="text-center py-8 sm:py-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">No suggestions available</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Check back later for new connections</p>
            </div>
          )}
        </div>
      )}
      
      {suggestedUsers.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
          <button 
            onClick={handleSeeAllSuggestions}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-semibold w-full text-center transition-all duration-200 hover:bg-blue-50 rounded-lg py-2 min-h-[40px]"
          >
            See all →
          </button>
        </div>
      )}
    </motion.div>
  );
}