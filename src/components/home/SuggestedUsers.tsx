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
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
          <Users className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Suggested for you</h3>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {suggestedUsers.map((suggestedUser, index) => (
            <motion.div
              key={suggestedUser.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 overflow-hidden"
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={suggestedUser.avatar_url}
                    alt={suggestedUser.name}
                    name={suggestedUser.name}
                    size="md"
                  />
                  {suggestedUser.is_verified && (
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center ${(
                        suggestedUser.role === 'admin' || suggestedUser.role === 'administrator'
                      ) ? 'bg-orange-500' : (suggestedUser.role === 'coach' ? 'bg-violet-500' : (suggestedUser.role === 'aspirant' ? 'bg-blue-500' : 'bg-blue-500'))}`}
                    >
                      <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {suggestedUser.name}
                      </h4>
                      {suggestedUser.username && (
                        <p className="text-xs text-gray-500 truncate">
                          @{suggestedUser.username}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleDismiss(suggestedUser.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 sm:space-x-2 mt-1 overflow-hidden">
                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full truncate flex-shrink-0 ${getRoleColor(suggestedUser.role)}`}>
                      {suggestedUser.role}
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:inline truncate flex-1 min-w-0">
                      {suggestedUser.sports_category.replace('-', ' ')}
                    </span>
                  </div>
                  
                  {suggestedUser.bio && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 hidden sm:block break-words overflow-hidden">
                      {suggestedUser.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 w-full">
                    <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-gray-500 flex-1 min-w-0">
                      <span className="truncate">{formatNumber(suggestedUser.followers_count)} followers</span>
                      <span className="hidden sm:inline truncate">{formatNumber(suggestedUser.posts_count)} posts</span>
                    </div>
                    
                    <button
                      onClick={() => handleFollow(suggestedUser.id)}
                      disabled={followingUsers.has(suggestedUser.id) || processingFollow.has(suggestedUser.id)}
                      className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full transition-colors flex-shrink-0 ml-2 ${
                        followingUsers.has(suggestedUser.id)
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      }`}
                    >
                      {processingFollow.has(suggestedUser.id) ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : followingUsers.has(suggestedUser.id) ? (
                        <div className="flex items-center space-x-1">
                          <Check className="h-3 w-3" />
                          <span className="hidden sm:inline">Following</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <UserPlus className="h-3 w-3" />
                          <span className="hidden sm:inline">Follow</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {suggestedUsers.length === 0 && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No suggestions available</p>
            </div>
          )}
        </div>
      )}
      
      {suggestedUsers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button 
            onClick={handleSeeAllSuggestions}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium w-full text-center transition-colors duration-200 hover:bg-blue-50 rounded-lg py-2"
          >
            See all suggestions
          </button>
        </div>
      )}
    </motion.div>
  );
}