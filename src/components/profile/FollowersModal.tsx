import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  UserPlus, 
  Users, 
  UserCheck, 
  UserX, 
  Loader2,
  Shield,
  MapPin
} from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import { shouldShowLocation } from '../../utils/locationUtils';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface FollowersModalProps {
  users: User[];
  type: 'followers' | 'following';
  onClose: () => void;
}

export function FollowersModal({ users, type, onClose }: FollowersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAuthStore();


  const displayUsers = users;
  
  // Initialize following set based on modal type and current user's relationships
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (!currentUser) return;
        // Always resolve follow state using batch endpoint to avoid pagination issues
        const ids = displayUsers.map(u => u.id).filter(id => id !== currentUser.id);
        if (ids.length === 0) {
          if (isMounted) setFollowingUsers(new Set());
          return;
        }
        const { statuses } = await apiService.checkFollowStatusBatch(ids);
        const followed = new Set(Object.entries(statuses).filter(([, v]) => v).map(([k]) => k));
        if (isMounted) setFollowingUsers(followed);
      } catch (e) {
        // Non-fatal; UI will still allow toggling
        console.warn('Failed to preload follow state in modal:', e);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [type, currentUser?.id, displayUsers]);
  
  // Memoized filtered users for better performance
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return displayUsers;
    
    const term = searchTerm.toLowerCase();
    return displayUsers.filter(user =>
      (user.name || user.fullName)?.toLowerCase().includes(term) ||
      user.username?.toLowerCase().includes(term)
    );
  }, [displayUsers, searchTerm]);

  // Memoized verification badge
  const getVerificationBadge = useCallback((user: User) => {
    const isVerified = (user as any).is_verified ?? (user as any).isVerified;
    if (!isVerified) return null;

    const badgeColor = (user.role === 'admin' || user.role === 'administrator')
      ? 'text-orange-500'
      : (user.role === 'coach' ? 'text-violet-500' : (user.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'));

    return (
      <svg className={`w-4 h-4 ${badgeColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }, []);

  // Optimized follow toggle with better error handling
  const handleFollowToggle = useCallback(async (userId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUser || loadingUsers.has(userId)) return;

    setLoadingUsers(prev => new Set(prev).add(userId));

    try {
      if (isCurrentlyFollowing) {
        await apiService.unfollowUser(userId);
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast.success('User unfollowed successfully');
      } else {
        await apiService.followUser(userId);
        setFollowingUsers(prev => new Set(prev).add(userId));
        toast.success('User followed successfully');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [currentUser, loadingUsers]);

  const isFollowing = (userId: string) => {
    return followingUsers.has(userId);
  };

  // Memoized button text and variant functions
  const getButtonText = useCallback((user: User) => {
    if (user.id === currentUser?.id) return 'You';
    if (type === 'followers') {
      return isFollowing(user.id) ? 'Following' : 'Follow Back';
    }
    return 'Unfollow';
  }, [currentUser?.id, type, followingUsers]);

  const getButtonVariant = useCallback((user: User) => {
    if (user.id === currentUser?.id) return 'outline';
    if (type === 'followers' && !isFollowing(user.id)) return 'primary';
    return 'outline';
  }, [currentUser?.id, type, followingUsers]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white capitalize truncate">
                    {type} ({displayUsers.length})
                  </h2>
                  <p className="text-white/80 text-xs sm:text-sm truncate">
                    {type === 'followers' ? 'People who follow you' : 'People you follow'}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-white/20 rounded-full flex-shrink-0 ml-2"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Search */}
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${type}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Enhanced Users List */}
          <div className="overflow-y-auto max-h-96">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  {searchTerm ? 'No users found' : `No ${type} yet`}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : type === 'followers' 
                      ? 'When people follow you, they\'ll appear here' 
                      : 'Start following people to see them here'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="p-3 sm:p-4 md:p-6 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
                            <Avatar
                              src={user.avatar_url || user.profileImage}
                              alt={(user.name || user.fullName || user.username || 'User')}
                              name={(user.name || user.fullName || user.username || 'User')}
                              size="lg"
                              className="w-full h-full border-2 border-white shadow-lg"
                            />
                          </div>
                          {user.is_verified && (
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-white rounded-full p-0.5 sm:p-1 shadow-md">
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${
                                user.role === 'admin' || user.role === 'administrator' ? 'bg-orange-500' :
                                user.role === 'coach' ? 'bg-violet-500' : 'bg-blue-500'
                              }`}>
                                <Shield className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-0.5 sm:mb-1">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg truncate">
                              {user.name || user.fullName}
                            </h3>
                            <div className="flex-shrink-0">
                              {getVerificationBadge(user)}
                            </div>
                          </div>
                          {user.username && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 truncate">@{user.username}</p>
                          )}
                          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1 sm:mb-2 flex-wrap gap-y-1">
                            <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                              user.role === 'coach' ? 'bg-purple-100 text-purple-800' : 
                              user.role === 'aspirant' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            {shouldShowLocation(user.location) && (
                              <div className="flex items-center space-x-0.5 sm:space-x-1 text-[10px] sm:text-xs text-gray-500 truncate">
                                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                <span className="truncate">{user.location}</span>
                              </div>
                            )}
                          </div>
                          {user.bio && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 hidden sm:block">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant={getButtonVariant(user)}
                          onClick={() => handleFollowToggle(user.id, isFollowing(user.id))}
                          disabled={user.id === currentUser?.id || loadingUsers.has(user.id)}
                          className={`text-xs sm:text-sm ${user.id === currentUser?.id 
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed" 
                            : isFollowing(user.id) 
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          }`}
                        >
                          {loadingUsers.has(user.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 animate-spin mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Loading...</span>
                            </>
                          ) : (
                            <>
                              {user.id === currentUser?.id ? (
                                <>
                                  <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">{getButtonText(user)}</span>
                                </>
                              ) : isFollowing(user.id) ? (
                                <>
                                  <UserX className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">{getButtonText(user)}</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">{getButtonText(user)}</span>
                                </>
                              )}
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


