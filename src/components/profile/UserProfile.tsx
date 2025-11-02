import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, 
  Share2, 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Eye,
  Trophy,
  Star,
  MapPin,
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PostCard } from '../posts/PostCard';
import { EditProfileModal } from './EditProfileModal';
import { FollowersModal } from './FollowersModal';
import { EvidenceUpload } from '../verification/EvidenceUpload';
import { LevelProgress } from '../gamification/LevelProgress';
import { AchievementsPanel } from '../gamification/AchievementsPanel';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import { User, Post } from '../../types';
import { mapPostsFromAPI } from '../../utils/postUtils';
import { shouldShowLocation } from '../../utils/locationUtils';
import toast from 'react-hot-toast';

export function UserProfile() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'shared' | 'achievements'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  
  // Data state
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [sharedPosts, setSharedPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Enhanced loading states
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingSharedPosts, setIsLoadingSharedPosts] = useState(true);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayPosts = activeTab === 'posts' ? userPosts : sharedPosts;

  // Helper function to extract numeric count from various formats
  const getNumericCount = (count: any): number => {
    if (typeof count === 'number') return count;
    if (typeof count === 'object' && count !== null) {
      if (Array.isArray(count)) {
        return count.length;
      }
      if (count.count !== undefined) {
        return count.count;
      }
    }
    return 0;
  };


  // Optimized data fetching with better error handling
  const fetchUserData = useCallback(async (showRefreshIndicator = false) => {
      if (!user?.id) return;

      try {
      setError(null);
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }

      // Parallel data fetching for better performance
      const [
        postsData,
        sharedPostsData,
        followersData,
        followingData,
        verificationData
      ] = await Promise.allSettled([
        apiService.getUserPosts(user.id, { limit: 20 }),
        apiService.getUserSharedPosts(user.id, { limit: 20 }),
        apiService.getUserFollowers(user.id, { limit: 50 }),
        apiService.getUserFollowing(user.id, { limit: 50 }),
        apiService.getMyVerificationRequests()
        ]);

      // Handle posts data
      if (postsData.status === 'fulfilled') {
        const mappedPosts = mapPostsFromAPI(postsData.value.posts || []);
        setUserPosts(mappedPosts);
        setIsLoadingPosts(false);
      } else {
        console.error('Error fetching posts:', postsData.reason);
        setIsLoadingPosts(false);
      }

      // Handle shared posts data
      if (sharedPostsData.status === 'fulfilled') {
        const mappedSharedPosts = mapPostsFromAPI(sharedPostsData.value.posts || []);
        setSharedPosts(mappedSharedPosts);
        setIsLoadingSharedPosts(false);
      } else {
        console.error('Error fetching shared posts:', sharedPostsData.reason);
        setIsLoadingSharedPosts(false);
      }

      // Handle followers data
      if (followersData.status === 'fulfilled') {
        setFollowers(followersData.value.followers || []);
        setIsLoadingFollowers(false);
      } else {
        console.error('Error fetching followers:', followersData.reason);
        setIsLoadingFollowers(false);
      }

      // Handle following data
      if (followingData.status === 'fulfilled') {
        setFollowing(followingData.value.following || []);
        setIsLoadingFollowing(false);
      } else {
        console.error('Error fetching following:', followingData.reason);
        setIsLoadingFollowing(false);
      }

      // Handle verification data
      if (verificationData.status === 'fulfilled') {
        const requests = verificationData.value.requests || [];
        // Get the most recent verification request
        if (requests.length > 0) {
          const latestRequest = requests[0]; // Already ordered by created_at DESC
          setVerificationStatus(latestRequest.status);
        }
        setIsLoadingVerification(false);
      } else {
        console.error('Error fetching verification status:', verificationData.reason);
        setIsLoadingVerification(false);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
      toast.error('Failed to load profile data');
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Optimized handlers with useCallback
  const handleFollowersClick = useCallback(() => {
    setFollowersModalType('followers');
    setShowFollowersModal(true);
  }, []);

  const handleFollowingClick = useCallback(() => {
    setFollowersModalType('following');
    setShowFollowersModal(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchUserData(true);
  }, [fetchUserData]);

  const handleShareProfile = useCallback(async () => {
    if (!user) return;
    if (!user.username) {
      toast.error('Set a username in your profile to share your profile');
      return;
    }
    
    try {
      // Always use username for profile share links
      const profileUrl = `${window.location.origin}/profile/${user.username}`;
      const userName = user.name || user.fullName || 'User';
      const sportsCategory = user.sports_categories?.[0] || user.sportsCategory || 'Sports';
      const roleText = user.role === 'coach' ? 'Professional Coach' : 
                      user.role === 'aspirant' ? 'Aspiring Athlete' : 
                      user.role === 'fan' ? 'Sports Fan' : 'Athlete';
      const shareText = `Check out ${userName}'s profile on SportsFeed! ${roleText} in ${sportsCategory.replace('-', ' ')}`;
      
      if (navigator.share && typeof navigator.canShare === 'function') {
        try {
          await navigator.share({
            title: `${userName} - SportsFeed`,
            text: shareText,
            url: profileUrl,
          });
          toast.success('Profile shared successfully!');
        } catch (shareError: any) {
          // User cancelled share or share failed
          if (shareError.name !== 'AbortError') {
            // Fallback to clipboard if share fails (but not if user cancelled)
            await navigator.clipboard.writeText(profileUrl);
            toast.success('Profile link copied to clipboard!');
          }
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share profile error:', error);
      toast.error('Failed to share profile. Please try again.');
    }
  }, [user]);

  // Memoized verification badge
  const getVerificationBadge = useMemo(() => {
    const isVerified = user?.is_verified ?? user?.isVerified;
    if (!isVerified) return null;

    const badgeColor = (user?.role === 'admin' || user?.role === 'administrator')
      ? 'text-orange-500'
      : (user?.role === 'coach' ? 'text-violet-500' : (user?.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'));

    return (
      <svg className={`w-5 h-5 ${badgeColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }, [user?.is_verified, user?.role]);


  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start space-x-4"
          >
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading profile</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Try Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        {/* Profile Header with Gradient Background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl mb-8"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative p-4 sm:p-6 md:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 sm:space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Profile Image with Enhanced Styling */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative">
            <Avatar
              src={user?.avatar_url}
              fallbackSrc={user?.profileImage}
              alt={user?.name || user?.fullName || 'User'}
              name={user?.name || user?.fullName}
              userId={user?.id}
              size="xl"
                    className="border-4 border-white shadow-2xl"
            />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEditModal(true)}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200"
                    title="Change profile photo"
                  >
                    <Camera className="h-4 w-4 text-gray-600" />
                  </motion.button>
                </div>
          </div>

          {/* Profile Info */}
              <div className="flex-1 text-white min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold truncate">{user?.name || user?.fullName}</h1>
                    {getVerificationBadge}
                  </div>
                  
                  {/* Enhanced Action Buttons */}
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setShowEditModal(true)}
                        variant="outline"
                        size="sm"
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={handleShareProfile}
                        variant="outline" 
                        size="sm"
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        variant="outline" 
                        size="sm"
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        {isRefreshing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  </div>
            </div>
                
                <p className="text-white/90 text-base sm:text-lg mb-2 truncate">@{user?.username}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-white/80 mb-3 sm:mb-4 text-sm sm:text-base">
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="capitalize font-medium truncate">
              {user?.role === 'coach' ? 'Professional Coach' : user?.role === 'aspirant' ? 'Aspiring Athlete' : 'Sports Fan'} 
                    </span>
                  </div>
                  {user?.sports_categories && user.sports_categories.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{user.sports_categories[0].replace('-', ' ')}</span>
                    </div>
                  )}
                  {shouldShowLocation(user?.location) && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{user.location}</span>
                    </div>
                  )}
                </div>
                
            {user?.bio && (
                  <p className="text-white/90 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 max-w-2xl break-words">{user.bio}</p>
                )}

                {/* Enhanced Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-md">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                onClick={handleFollowersClick}
                    className="text-center p-2 sm:p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl hover:bg-white/20 transition-all duration-200 min-h-[80px] sm:min-h-[100px]"
                disabled={isLoadingFollowers}
              >
                {isLoadingFollowers ? (
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto text-white/60 mb-1 sm:mb-2" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-white">{getNumericCount(user?.followers) || followers.length}</p>
                    )}
                    <p className="text-xs sm:text-sm text-white/80">Followers</p>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                onClick={handleFollowingClick}
                    className="text-center p-2 sm:p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl hover:bg-white/20 transition-all duration-200 min-h-[80px] sm:min-h-[100px]"
                disabled={isLoadingFollowing}
              >
                {isLoadingFollowing ? (
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto text-white/60 mb-1 sm:mb-2" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-white">{getNumericCount(user?.following) || following.length}</p>
                    )}
                    <p className="text-xs sm:text-sm text-white/80">Following</p>
                  </motion.button>
                  
                  <div className="text-center p-2 sm:p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl min-h-[80px] sm:min-h-[100px] flex flex-col justify-center">
                    <p className="text-xl sm:text-2xl font-bold text-white">{userPosts.length}</p>
                    <p className="text-xs sm:text-sm text-white/80">Posts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verification Status Card */}
            {user?.role === 'aspirant' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100"
          >
                <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isLoadingVerification ? (
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                ) : (
                  <>
                    {verificationStatus === 'approved' && <CheckCircle className="h-6 w-6 text-green-500" />}
                    {verificationStatus === 'rejected' && <XCircle className="h-6 w-6 text-red-500" />}
                    {verificationStatus === 'pending' && <Clock className="h-6 w-6 text-yellow-500" />}
                    {!verificationStatus && <AlertCircle className="h-6 w-6 text-gray-400" />}
                  </>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">Verification Status</h3>
                  {isLoadingVerification ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : (
                    <p className={`text-sm font-medium ${
                          verificationStatus === 'approved' ? 'text-green-600' :
                          verificationStatus === 'rejected' ? 'text-red-600' :
                          verificationStatus === 'pending' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                      {verificationStatus ? verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1) : 'Not Requested'}
                    </p>
                  )}
                </div>
                  </div>
                  {verificationStatus === 'pending' && !isLoadingVerification && (
                    <Button
                      onClick={() => setShowEvidenceUpload(true)}
                      size="sm"
                  variant="primary"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Evidence
                    </Button>
                  )}
                  {!verificationStatus && !isLoadingVerification && (
                    <Button
                      onClick={() => setShowEvidenceUpload(true)}
                      size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Request Verification
                    </Button>
                  )}
                </div>
                {user?.sportRole && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Sport Role:</span> {user.sportRole.name} 
                  {user.sportRole.isProfessional && <span className="text-blue-600 ml-1 font-medium">(Professional)</span>}
                </p>
              </div>
            )}
          </motion.div>
            )}

            {/* Sport Interests for Fans */}
            {user?.role === 'fan' && user?.sportInterests && user.sportInterests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sport Interests</h3>
            <div className="flex flex-wrap gap-3">
                  {user.sportInterests.map((interest, index) => (
                <motion.span
                      key={index}
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 text-sm font-medium rounded-full border border-green-200"
                    >
                      {interest}
                </motion.span>
                  ))}
                </div>
          </motion.div>
        )}

        {/* Content Tabs with Modern Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
        >
          {/* Enhanced Tab Headers */}
          <div className="border-b border-gray-100 bg-gray-50/50 overflow-x-auto scrollbar-hide">
            <nav className="flex min-w-max sm:min-w-0">
              <motion.button
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                onClick={() => setActiveTab('posts')}
                className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Posts ({userPosts.length})</span>
                </div>
                {activeTab === 'posts' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                onClick={() => setActiveTab('shared')}
                className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'shared'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Shared</span>
            </div>
                {activeTab === 'shared' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}
              </motion.button>
              
              <motion.button
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                onClick={() => setActiveTab('achievements')}
                className={`relative px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'achievements'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Achievements</span>
            </div>
                {activeTab === 'achievements' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}
              </motion.button>
            </nav>
          </div>

          {/* Enhanced Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-4 sm:p-6 md:p-8"
            >
          {activeTab === 'posts' ? (
            isLoadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading your posts...</p>
                    <div className="mt-6 flex items-center space-x-2 text-sm text-gray-500">
                      <Sparkles className="h-4 w-4" />
                      <span>Preparing your content</span>
                    </div>
              </div>
            ) : displayPosts.length > 0 ? (
                  <div className="space-y-8">
                    {displayPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <PostCard post={post} />
                      </motion.div>
                ))}
              </div>
            ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Eye className="h-12 w-12 text-blue-500" />
                </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No posts yet</h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      Start sharing your thoughts, experiences, and achievements with the community!
                    </p>
                    <Button
                      onClick={() => {/* Navigate to create post */}}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Create Your First Post
                    </Button>
              </div>
            )
          ) : activeTab === 'shared' ? (
            isLoadingSharedPosts ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading shared posts...</p>
                <div className="mt-6 flex items-center space-x-2 text-sm text-gray-500">
                  <Sparkles className="h-4 w-4" />
                  <span>Preparing your shared content</span>
                </div>
              </div>
            ) : sharedPosts.length > 0 ? (
              <div className="space-y-8">
                {sharedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Share2 className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No shared posts yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You haven't shared any posts yet. Start sharing interesting content from other users!
                </p>
              </div>
            )
          ) : activeTab === 'achievements' ? (
            <div className="space-y-4 sm:space-y-6">
              <LevelProgress />
              <AchievementsPanel />
            </div>
          ) : null}
            </motion.div>
          </AnimatePresence>
        </motion.div>

      {/* Modals */}
        <AnimatePresence>
      {showEditModal && (
        <EditProfileModal
              user={user!}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showFollowersModal && (
        <FollowersModal
          users={followersModalType === 'followers' ? followers : following}
          type={followersModalType}
          onClose={() => setShowFollowersModal(false)}
        />
      )}


      {showEvidenceUpload && (
        <EvidenceUpload
          onClose={() => setShowEvidenceUpload(false)}
          sportRole={user?.sportRole}
        />
      )}
        </AnimatePresence>
      </div>
    </div>
  );
}