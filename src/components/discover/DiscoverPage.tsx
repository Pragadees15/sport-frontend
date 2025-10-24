import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Users, 
  Filter, 
  MapPin, 
  Award,
  Zap,
  RefreshCw,
  Sparkles,
  Trophy,
  UserPlus,
  Check
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { User } from '../../types';
import { mapPostsFromAPI } from '../../utils/postUtils';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import toast from 'react-hot-toast';

interface DiscoverStats {
  total_users: number;
  total_posts: number;
  upcoming_events: number;
  total_locations: number;
  total_videos: number;
  active_users_this_week: number;
  coaches: number;
  aspirants: number;
}

interface DiscoverContent {
  users: User[];
  posts: any[];
  events: any[];
  locations: any[];
  videos: any[];
  pagination: any;
}

export function DiscoverPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'locations'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [sportsFilter, setSportsFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Utility function to safely capitalize strings
  const safeCapitalize = (str: string | null | undefined): string => {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  
  const [content, setContent] = useState<DiscoverContent>({
    users: [],
    posts: [],
    events: [],
    locations: [],
    videos: [],
    pagination: {}
  });
  const [stats, setStats] = useState<DiscoverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [processingFollow, setProcessingFollow] = useState<Set<string>>(new Set());

  // Allow unauthenticated users to view Discover page. Certain actions require auth.

  // Data fetching functions
  const fetchDiscoverContent = async () => {
    try {
      setLoading(true);
      // Reset content when switching tabs to show loading state
      setContent({
        users: [],
        posts: [],
        events: [],
        locations: [],
        videos: [],
        pagination: {}
      });
      
      const params = {
        search: searchTerm || undefined,
        category: activeTab === 'all' ? undefined : activeTab,
        sortBy: sortBy,
        sportsCategory: sportsFilter === 'all' ? undefined : sportsFilter,
        location: locationFilter || undefined,
        verified: verifiedOnly || undefined,
        page: currentPage,
        limit: 20
      };
      
      const response = await apiService.getDiscoverContent(params);
      const mappedData = {
        ...response.data,
        posts: mapPostsFromAPI(response.data.posts || [])
      };
      setContent(mappedData);
      // Initialize follow state from backend if provided
      if (Array.isArray(response.data?.users) && response.data.users.length > 0) {
        const presetIds = response.data.users
          .filter((u: any) => u.is_following === true)
          .map((u: any) => u.id);
        if (presetIds.length > 0) {
          setFollowingUsers(new Set(presetIds));
        }
      }
    } catch (error) {
      console.error('Error fetching discover content:', error);
      toast.error('Failed to load discover content');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getDiscoverStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Effects
  useEffect(() => {
    fetchDiscoverContent();
    fetchStats();
  }, [searchTerm, activeTab, sortBy, sportsFilter, locationFilter, verifiedOnly, currentPage]);

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Removed trending and recommendations per new requirements

  // Check follow status when content changes
  useEffect(() => {
    if (content.users.length > 0) {
      // If backend supplied is_following flags, prefer those to avoid extra calls
      const hasIsFollowing = content.users.some((u: any) => typeof (u as any).is_following === 'boolean');
      if (!hasIsFollowing) {
        checkFollowStatus(content.users);
      } else {
        const ids = content.users.filter((u: any) => (u as any).is_following).map((u: any) => u.id);
        setFollowingUsers(new Set(ids));
      }
    }
  }, [content.users]);

  // Check follow status for users
  const checkFollowStatus = async (users: User[]) => {
    if (!user || users.length === 0) return;
    
    try {
      const followStatusPromises = users.map(async (targetUser) => {
        try {
          const status = await apiService.checkFollowStatus(targetUser.id);
          return { userId: targetUser.id, isFollowing: status.isFollowing };
        } catch (error) {
          console.error(`Error checking follow status for ${targetUser.id}:`, error);
          return { userId: targetUser.id, isFollowing: false };
        }
      });
      
      const followStatuses = await Promise.all(followStatusPromises);
      const followingSet = new Set(
        followStatuses
          .filter(status => status.isFollowing)
          .map(status => status.userId)
      );
      
      setFollowingUsers(followingSet);
    } catch (error) {
      console.error('Error checking follow statuses:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }
    if (processingFollow.has(userId)) return;
    
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
        toast.success('Unfollowed successfully');
      } else {
        // Follow user
        await apiService.followUser(userId);
        setFollowingUsers(prev => new Set([...prev, userId]));
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



  const handleRefresh = () => {
    fetchDiscoverContent();
    fetchStats();
  };

  const handleUserClick = (targetUser: User) => {
    // Use username if available, otherwise fall back to user ID
    const profileIdentifier = targetUser.username || targetUser.id;
    navigate(`/profile/${profileIdentifier}`);
  };

  const getVerificationBadge = (targetUser: User) => {
    const isVerified = (targetUser as any).is_verified ?? (targetUser as any).isVerified;
    if (!isVerified) return null;
    const badgeColor = (targetUser.role === 'admin' || targetUser.role === 'administrator')
      ? 'text-orange-500'
      : (targetUser.role === 'coach' ? 'text-violet-500' : (targetUser.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'));
    return (
      <svg className={`w-4 h-4 ${badgeColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

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
              <span className="text-sm font-medium text-gray-700">Discover amazing aspirants</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Discover Sports Community
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Connect with aspirants, coaches, and sports enthusiasts from around the world
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Find Aspirants</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Explore Locations</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8"
        >
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search aspirants, coaches, and locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-6">
            {(['all', 'users', 'locations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'trending')}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="trending">Trending</option>
              </select>
              
              <select
                value={sportsFilter}
                onChange={(e) => setSportsFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Sports</option>
                <option value="coco">Coco</option>
                <option value="martial-arts">Martial Arts</option>
                <option value="calorie-fight">Calorie Fight</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>More Filters</span>
              </button>
            </div>
            
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 pt-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Enter location"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Verified only</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl w-fit mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-blue-600 mb-2">{stats.total_users}</p>
              <p className="text-sm text-blue-700 font-medium">Total Users</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl w-fit mx-auto mb-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-purple-600 mb-2">{stats.coaches}</p>
              <p className="text-sm text-purple-700 font-medium">Coaches</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl w-fit mx-auto mb-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-2">{stats.aspirants}</p>
              <p className="text-sm text-green-700 font-medium">Aspirants</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl w-fit mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-yellow-600 mb-2">{stats.active_users_this_week}</p>
              <p className="text-sm text-yellow-700 font-medium">Active This Week</p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading discover content...</h3>
              <p className="text-gray-600">Please wait while we fetch the latest content</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Users */}
              {(activeTab === 'all' || activeTab === 'users') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Community Members</h2>
                  </div>
                  
                  {content.users.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {content.users.map((targetUser) => (
                      <motion.div
                        key={targetUser.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        onClick={() => handleUserClick(targetUser)}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                      >
                        <div className="relative h-32 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600">
                          <Avatar
                            src={targetUser.avatar_url || targetUser.profileImage}
                            alt={targetUser.fullName || targetUser.name || 'User'}
                            name={targetUser.fullName || targetUser.name}
                            size="lg"
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 h-20 w-20 border-4 border-white shadow-lg"
                          />
                          {getVerificationBadge(targetUser) && (
                            <div className="absolute top-3 right-3">
                              {getVerificationBadge(targetUser)}
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-12 px-6 pb-6 text-center">
                          <div className="flex items-center justify-center space-x-1 mb-2">
                            <h3 className="font-bold text-gray-900 text-lg truncate max-w-[160px]">{targetUser.fullName || targetUser.name || 'Unknown User'}</h3>
                          </div>
                          
                          {targetUser.username && (
                            <p className="text-gray-600 text-sm mb-3 truncate">@{targetUser.username}</p>
                          )}
                          
                          <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {targetUser.role && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                targetUser.role === 'coach' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                              }`}>
                                {safeCapitalize(targetUser.role)}
                              </span>
                            )}
                            {targetUser.sportsCategory && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                targetUser.sportsCategory === 'coco' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800' :
                                targetUser.sportsCategory === 'martial-arts' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800' :
                                'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                              }`}>
                                {targetUser.sportsCategory.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            )}
                          </div>
                          
                          {targetUser.bio && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 px-2 break-words">{targetUser.bio}</p>
                          )}
                          
                          <div className="flex justify-center space-x-8 mb-4 text-sm">
                            <div className="text-center">
                              <p className="font-bold text-gray-900 text-lg">{(targetUser as any).posts_count ?? 0}</p>
                              <p className="text-gray-600 text-xs">Posts</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-gray-900 text-lg">{(targetUser as any).followers_count ?? 0}</p>
                              <p className="text-gray-600 text-xs">Followers</p>
                            </div>
                          </div>
                          
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={() => handleFollow(targetUser.id)}
                              disabled={processingFollow.has(targetUser.id)}
                              size="sm"
                              className="w-full py-2.5 text-sm font-medium"
                              variant={followingUsers.has(targetUser.id) ? 'outline' : (targetUser.role === 'coach' ? 'secondary' : 'primary')}
                            >
                            {processingFollow.has(targetUser.id) ? (
                              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : followingUsers.has(targetUser.id) ? (
                              <div className="flex items-center space-x-2">
                                <Check className="h-4 w-4" />
                                <span>Following</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <UserPlus className="h-4 w-4" />
                                <span>Follow</span>
                              </div>
                            )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No community members found</h3>
                      <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </motion.div>
              )}

          {/* Posts removed per requirements */}


              {/* Empty State */}
              {!loading && (
                (activeTab === 'all' && content.users.length === 0) ||
                (activeTab === 'users' && content.users.length === 0)
              ) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
                >
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No content found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Try adjusting your search or filter criteria to discover more content
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Clear Search
                    </button>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Show All
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Pagination */}
              {content.pagination && content.pagination.totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center items-center space-x-4 mt-8"
                >
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="px-4 py-2"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, content.pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  
                  <Button
                    onClick={() => setCurrentPage(Math.min(content.pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === content.pagination.totalPages}
                    variant="outline"
                    size="sm"
                    className="px-4 py-2"
                  >
                    Next
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
 }