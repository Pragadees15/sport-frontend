import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Share2, 
  MessageCircle, 
  Loader2, 
  Settings,
  Eye,
  Trophy,
  MapPin,
  UserMinus,
  Shield,
  Award
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PostCard } from '../posts/PostCard';
import { FollowersModal } from './FollowersModal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import { User, Post } from '../../types';
import { mapPostsFromAPI } from '../../utils/postUtils';
import { shouldShowLocation } from '../../utils/locationUtils';
import toast from 'react-hot-toast';

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Users can view their own profile through this component

  useEffect(() => {
    if (!username) {
      // Use setTimeout to avoid setState during render warning
      setTimeout(() => navigate('/dashboard'), 0);
      return;
    }
    
    // Allow users to view their own profile through this component as well
    // The /profile route will use UserProfile component for editing capabilities
    
    fetchProfileData();
  }, [username, navigate, currentUser?.username]);

  // Optimized profile data fetching
  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let user;
      
      // Always try username first, then fall back to ID
      try {
        user = await apiService.getUserByUsername(username!);
      } catch (usernameError: any) {
        try {
          user = await apiService.getUserById(username!);
        } catch (idError) {
          // If both fail, propagate the original error
          throw usernameError;
        }
      }
      
      setProfileUser(user);
      
      // Parallel data fetching for better performance
      const [
        followStatusResult,
        postsResult,
        followersResult,
        followingResult
      ] = await Promise.allSettled([
      // Check if current user is following this user (only for other users' profiles)
        currentUser && user.id !== currentUser.id 
          ? apiService.checkFollowStatus(user.id)
          : Promise.resolve({ isFollowing: false }),
        // Fetch user's posts
        apiService.getUserPosts(user.id, { limit: 20 }),
        // Fetch followers
        apiService.getUserFollowers(user.id, { limit: 50 }),
        // Fetch following
        apiService.getUserFollowing(user.id, { limit: 50 })
      ]);

      // Handle follow status
      if (followStatusResult.status === 'fulfilled') {
        setIsFollowing(followStatusResult.value.isFollowing);
      } else {
        console.error('Error checking follow status:', followStatusResult.reason);
        setIsFollowing(false);
      }
      
      // Handle posts
      if (postsResult.status === 'fulfilled') {
        const mappedPosts = mapPostsFromAPI(postsResult.value.posts || []);
        setUserPosts(mappedPosts);
        // Update profileUser with posts count
        setProfileUser(prev => prev ? {
          ...prev,
          posts_count: postsResult.value.pagination?.total || mappedPosts.length
        } : null);
        setIsLoadingPosts(false);
      } else {
        console.error('Error fetching posts:', postsResult.reason);
        setIsLoadingPosts(false);
      }
      
      // Handle followers
      if (followersResult.status === 'fulfilled') {
        const followersData = followersResult.value.followers || [];
        setFollowers(followersData);
        // Update profileUser with followers count
        setProfileUser(prev => prev ? {
          ...prev,
          followers: {
            count: followersResult.value.pagination?.total || followersData.length
          }
        } : null);
      } else {
        console.error('Error fetching followers:', followersResult.reason);
      }

      // Handle following
      if (followingResult.status === 'fulfilled') {
        const followingData = followingResult.value.following || [];
        setFollowing(followingData);
        // Update profileUser with following count
        setProfileUser(prev => prev ? {
          ...prev,
          following: {
            count: followingResult.value.pagination?.total || followingData.length
          }
        } : null);
      } else {
        console.error('Error fetching following:', followingResult.reason);
      }
      
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      if (error.message?.includes('User not found')) {
        setError('User not found');
      } else if (error.message?.includes('private')) {
        setError('This profile is private');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setIsLoading(false);
    }
  }, [username, currentUser]);

  // Optimized follow toggle with better error handling
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !profileUser) return;
    
    setIsLoadingFollow(true);
    try {
      // Double-check the current follow status before making the API call
      const currentStatus = await apiService.checkFollowStatus(profileUser.id);
      
      if (currentStatus.isFollowing) {
        // User is currently following, so unfollow
        await apiService.unfollowUser(profileUser.id);
        setIsFollowing(false);
        // Update followers count
        setProfileUser(prev => prev ? {
          ...prev,
          followers: typeof prev.followers === 'object' && prev.followers?.count !== undefined
            ? { count: Math.max(0, prev.followers.count - 1) }
            : Math.max(0, (typeof prev.followers === 'number' ? prev.followers : 0) - 1)
        } : null);
        toast.success('Unfollowed successfully');
      } else {
        // User is not following, so follow
        await apiService.followUser(profileUser.id);
        setIsFollowing(true);
        // Update followers count
        setProfileUser(prev => prev ? {
          ...prev,
          followers: typeof prev.followers === 'object' && prev.followers?.count !== undefined
            ? { count: prev.followers.count + 1 }
            : (typeof prev.followers === 'number' ? prev.followers : 0) + 1
        } : null);
        toast.success('Following successfully');
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already following') || error.message?.includes('already followed') || 
          error.message?.includes('You are already following this user')) {
        // If we get an error about already following, update the state to reflect the current status
        setIsFollowing(true);
        toast.error('You are already following this user');
      } else if (error.message?.includes('not following') || error.message?.includes('not followed') ||
                 error.message?.includes('You are not following this user')) {
        // If we get an error about not following, update the state to reflect the current status
        setIsFollowing(false);
        toast.error('You are not following this user');
      } else {
        toast.error(error.message || 'Failed to update follow status');
      }
    } finally {
      setIsLoadingFollow(false);
    }
  }, [currentUser, profileUser, isFollowing]);


  // Optimized share profile handler
  const handleShareProfile = useCallback(async () => {
    if (!profileUser) return;
    
    try {
      // Use username if available, otherwise fall back to user ID
      const profileIdentifier = profileUser.username || profileUser.id;
      const profileUrl = `${window.location.origin}/profile/${profileIdentifier}`;
      const userName = profileUser.name || profileUser.fullName || 'User';
      const sportsCategory = profileUser.sports_categories?.[0] || profileUser.sportsCategory || 'Sports';
      const roleText = profileUser.role === 'coach' ? 'Professional Coach' : 
                      profileUser.role === 'aspirant' ? 'Aspiring Athlete' : 
                      profileUser.role === 'fan' ? 'Sports Fan' : 'Athlete';
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
  }, [profileUser]);

  const handleMessage = () => {
    if (!profileUser) return;
    // Navigate to messaging with this user
    navigate(`/messages?user=${profileUser.id}`);
  };

  const handleFollowersClick = () => {
    setFollowersModalType('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    setFollowersModalType('following');
    setShowFollowersModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Users className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  // Users can now view their own profile through this component

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="sm"
              className="mr-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          </motion.div>
          <div className="flex items-center space-x-3">
            <Avatar
              src={profileUser.avatar_url}
              fallbackSrc={profileUser.profileImage}
              alt={profileUser.name || profileUser.fullName || 'User'}
              name={profileUser.name || profileUser.fullName}
              userId={profileUser.id}
              size="sm"
              className="border-2 border-white shadow-md"
            />
            <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {profileUser.name || profileUser.fullName}'s Profile
          </h1>
              <p className="text-sm text-gray-500">@{profileUser.username}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Enhanced Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl mb-8"
        >
          {/* Dynamic Gradient Background */}
          <div className={`absolute inset-0 ${
            profileUser.role === 'coach' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600' :
            profileUser.role === 'aspirant' ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600' :
            'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600'
          } opacity-90`}></div>
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Enhanced Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative">
              <Avatar
                src={profileUser.avatar_url}
                fallbackSrc={profileUser.profileImage}
                alt={profileUser.name || profileUser.fullName || 'User'}
                name={profileUser.name || profileUser.fullName}
                userId={profileUser.id}
                size="xl"
                    className="border-4 border-white shadow-2xl"
                  />
                    {profileUser.is_verified && (
                    <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        profileUser.role === 'admin' || profileUser.role === 'administrator' ? 'bg-orange-500' :
                        profileUser.role === 'coach' ? 'bg-violet-500' : 'bg-blue-500'
                      }`}>
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                  </div>
                  )}
                </div>
              </div>

              {/* Enhanced Profile Info */}
              <div className="flex-1 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold">{profileUser.name || profileUser.fullName}</h1>
                    {profileUser.is_verified && (
                      <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                        <Award className="h-4 w-4" />
                        <span className="text-sm font-medium">Verified</span>
                      </div>
                    )}
              </div>

              {/* Action Buttons */}
              {currentUser && (
                <div className="flex items-center space-x-3">
                  {currentUser.id === profileUser.id ? (
                        // Own profile
                    <>
                      <Button
                        onClick={() => navigate('/profile')}
                            variant="outline"
                        size="sm"
                            className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        onClick={handleShareProfile}
                        variant="outline"
                        size="sm"
                            className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                            <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </>
                  ) : (
                        // Other user's profile
                    <>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleFollowToggle}
                        disabled={isLoadingFollow}
                        variant={isFollowing ? "outline" : "primary"}
                        size="sm"
                              className={isFollowing 
                                ? "bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm" 
                                : "bg-white text-gray-900 hover:bg-gray-100"
                              }
                      >
                        {isLoadingFollow ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFollowing ? (
                          <>
                                  <UserMinus className="h-4 w-4 mr-2" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleMessage}
                        variant="outline"
                        size="sm"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
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
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-white/90 text-lg mb-2">@{profileUser.username}</p>
                <div className="flex items-center space-x-4 text-white/80 mb-4">
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4" />
                    <span className="capitalize font-medium">
                      {profileUser.role === 'coach' ? 'Professional Coach' : 
                       profileUser.role === 'aspirant' ? 'Aspiring Athlete' : 'Sports Fan'}
                    </span>
                  </div>
                  {shouldShowLocation(profileUser.location) && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profileUser.location}</span>
                    </div>
                  )}
                </div>
                
                {profileUser.bio && (
                  <p className="text-white/90 text-lg mb-6 max-w-2xl">{profileUser.bio}</p>
                )}

                {/* Enhanced Stats */}
                <div className="grid grid-cols-3 gap-6 max-w-md">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFollowersClick}
                    className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-all duration-200"
                  >
                    <p className="text-2xl font-bold text-white">
                      {typeof profileUser.followers === 'object' && profileUser.followers?.count !== undefined 
                        ? profileUser.followers.count 
                        : typeof profileUser.followers === 'number' ? profileUser.followers : 0}
                    </p>
                    <p className="text-sm text-white/80">Followers</p>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFollowingClick}
                    className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-all duration-200"
                  >
                    <p className="text-2xl font-bold text-white">
                      {typeof profileUser.following === 'object' && profileUser.following?.count !== undefined 
                        ? profileUser.following.count 
                        : typeof profileUser.following === 'number' ? profileUser.following : 0}
                    </p>
                    <p className="text-sm text-white/80">Following</p>
                  </motion.button>
                  
                  <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <p className="text-2xl font-bold text-white">
                      {profileUser.posts_count || userPosts.length}
                    </p>
                    <p className="text-sm text-white/80">Posts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
        >
          <div className="border-b border-gray-100 bg-gray-50/50 px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
              Posts ({profileUser.posts_count || userPosts.length})
            </h2>
            </div>
          </div>

          <div className="p-8">
            {isLoadingPosts ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading posts...</p>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="space-y-8">
                {userPosts.map((post, index) => (
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
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Eye className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No posts yet
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {profileUser.name || profileUser.fullName} hasn't shared any posts yet. Check back later!
                </p>
                {currentUser && currentUser.id !== profileUser.id && (
                  <Button
                    onClick={handleMessage}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send a Message
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Enhanced Modals */}
      <AnimatePresence>
      {showFollowersModal && (
        <FollowersModal
          onClose={() => setShowFollowersModal(false)}
          type={followersModalType}
          users={followersModalType === 'followers' ? followers : following}
        />
      )}
      </AnimatePresence>
    </div>
  );
}