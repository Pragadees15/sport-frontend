import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Heart, 
  Star, 
  Filter, 
  Radio, 
  Search, 
  TrendingUp, 
  Zap,
  Crown,
  Sparkles,
  ChevronDown,
  Grid3X3,
  List,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { VideoCard } from './VideoCard';
import { TokenWallet } from './TokenWallet';
import { MembershipCard } from './MembershipCard';
import { LivestreamCard } from './LivestreamCard';
import { LivestreamManager } from './LivestreamManager';
import { UploadVideoModal } from './UploadVideoModal';
import { WatchAdModal } from './WatchAdModal';
import { CreateMembershipModal } from './CreateMembershipModal';
import { CreateLivestreamModal } from '../modals/CreateLivestreamModal';
import { WomensLounge } from './WomensLounge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LevelProgress } from '../gamification/LevelProgress';
import { QuestsPanel } from '../gamification/QuestsPanel';
import { apiService } from '../../services/api';
import { transformLivestreamFromAPI } from '../../utils/livestreamUtils';
import toast from 'react-hot-toast';

export function PlayPage() {
  const { user } = useAuthStore();
  const { getUserTokens, initializeUserTokens } = useAppStore();
  
  // Tab and filter states
  const [activeTab, setActiveTab] = useState<'videos' | 'memberships' | 'livestreams' | 'upload' | 'womens-lounge'>('videos');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'coco' | 'martial-arts' | 'calorie-fight'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateMembershipModal, setShowCreateMembershipModal] = useState(false);
  const [showCreateLivestreamModal, setShowCreateLivestreamModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  
  // API data state
  const [videos, setVideos] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [livestreams, setLivestreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Stats for dashboard
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalLivestreams: 0,
    totalMemberships: 0,
    liveStreams: 0
  });

  // Fetch real token stats (balance, earned, spent)
  const [realTokens, setRealTokens] = useState<{ balance: number; totalEarned: number; totalSpent: number } | null>(null);
  useEffect(() => {
    const fetchTokens = async () => {
      if (!user) return;
      try {
        const { stats } = await apiService.getTokenStats();
        setRealTokens({
          balance: stats.currentBalance,
          totalEarned: stats.totalEarned,
          totalSpent: stats.totalSpent,
        });
      } catch (e) {
        // Fallback to local store if API fails
        initializeUserTokens(user.id);
      }
    };
    fetchTokens();
    const handler = () => fetchTokens();
    window.addEventListener('tokensUpdated', handler);
    return () => window.removeEventListener('tokensUpdated', handler);
  }, [user, initializeUserTokens, refreshTrigger]);

  // Enhanced data fetching with better error handling
  const fetchData = async (showRefreshIndicator = false) => {
    if (!user) return;
    
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const promises = [];
      
      // Fetch videos with search and sort
      promises.push(
        apiService.getVideos({
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
          search: searchQuery || undefined,
          limit: 50
        })
      );

      // Fetch memberships
      promises.push(
        apiService.getMemberships({
          limit: 50
        })
      );

      // Fetch livestreams
      promises.push(
        apiService.getLivestreams({
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          limit: 50
        })
      );

      const [videosResponse, membershipsResponse, livestreamsResponse] = await Promise.all(promises);
      
      setVideos((videosResponse as any).videos || []);
      setMemberships((membershipsResponse as any).memberships || []);
      
      const transformedLivestreams = ((livestreamsResponse as any).livestreams || []).map(transformLivestreamFromAPI);
      setLivestreams(transformedLivestreams);
      
      // Update stats
      setStats({
        totalVideos: (videosResponse as any).videos?.length || 0,
        totalLivestreams: transformedLivestreams.length,
        totalMemberships: (membershipsResponse as any).memberships?.length || 0,
        liveStreams: transformedLivestreams.filter((l: any) => l.isLive).length
      });
      
    } catch (error) {
      console.error('Error fetching play data:', error);
      toast.error('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [user, categoryFilter, typeFilter, searchQuery, sortBy, refreshTrigger]);
  
  // Memoized event handlers for better performance
  const handleCreated = useCallback(() => setRefreshTrigger(prev => prev + 1), []);
  const handleOpenMemberships = useCallback(() => setActiveTab('memberships'), []);
  const handleTokensUpdated = useCallback(() => {
    // Refresh token stats
    const fetchTokens = async () => {
      if (!user) return;
      try {
        const { stats } = await apiService.getTokenStats();
        setRealTokens({
          balance: stats.currentBalance,
          totalEarned: stats.totalEarned,
          totalSpent: stats.totalSpent,
        });
      } catch (e) {
        initializeUserTokens(user.id);
      }
    };
    fetchTokens();
  }, [user, initializeUserTokens]);

  // Event listeners for real-time updates
  useEffect(() => {
    
    window.addEventListener('livestreamCreated', handleCreated as EventListener);
    window.addEventListener('openMemberships', handleOpenMemberships as EventListener);
    window.addEventListener('tokensUpdated', handleTokensUpdated as EventListener);
    
    return () => {
      window.removeEventListener('livestreamCreated', handleCreated as EventListener);
      window.removeEventListener('openMemberships', handleOpenMemberships as EventListener);
      window.removeEventListener('tokensUpdated', handleTokensUpdated as EventListener);
    };
  }, [user, initializeUserTokens]);

  // Function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  if (!user) return null;

  const userTokens = realTokens
    ? { userId: user.id, balance: realTokens.balance, totalEarned: realTokens.totalEarned, totalSpent: realTokens.totalSpent, transactions: [] as any[] }
    : getUserTokens(user.id);

  // Filtered and sorted data
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesCategory = categoryFilter === 'all' || video.category === categoryFilter;
      const matchesType = typeFilter === 'all' || video.type === typeFilter;
      const matchesSearch = !searchQuery || 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.coach?.fullName || video.coach?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesType && matchesSearch;
    });
  }, [videos, categoryFilter, typeFilter, searchQuery]);

  const displayMemberships = useMemo(() => {
    return memberships.filter(membership => {
      const matchesSearch = !searchQuery || 
        membership.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [memberships, searchQuery]);

  const displayLivestreams = useMemo(() => {
    return livestreams.filter(livestream => {
      const matchesCategory = categoryFilter === 'all' || livestream.category === categoryFilter;
      const matchesSearch = !searchQuery || 
        livestream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        livestream.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [livestreams, categoryFilter, searchQuery]);

  // Tab configuration
  const tabs = [
    { id: 'videos', label: 'Videos', icon: Play, count: filteredVideos.length, color: 'blue' },
    { id: 'memberships', label: user.role === 'coach' ? 'My Memberships' : 'Memberships', icon: Star, count: displayMemberships.length, color: 'purple' },
    { id: 'livestreams', label: 'Livestreams', icon: Radio, count: displayLivestreams.length, color: 'red' },
    ...(user.gender === 'female' ? [{ id: 'womens-lounge', label: "Women's Lounge", icon: Heart, count: 0, color: 'pink' }] : []),
    ...(user.role === 'coach' ? [{ id: 'upload', label: 'Upload', icon: Zap, color: 'green' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        {/* Enhanced Header with Grid Layout */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            {/* Main Header Content - Takes 8 columns on XL screens */}
            <div className="xl:col-span-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                      Play & Learn
                    </h1>
                    <p className="text-gray-600 mt-0.5 text-xs sm:text-sm">Discover, learn, and grow with premium content</p>
                  </div>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium text-blue-700">Videos</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.totalVideos}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
                      <Radio className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      <span className="text-xs sm:text-sm font-medium text-red-700">Live</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.liveStreams}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                      <span className="text-xs sm:text-sm font-medium text-purple-700">Memberships</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.totalMemberships}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium text-green-700">Total</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.totalVideos + stats.totalLivestreams}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Sidebar - Token Wallet & Level Progress - Takes 4 columns on XL screens */}
            <div className="xl:col-span-4 space-y-4 sm:space-y-6">
              <TokenWallet tokens={userTokens} />
              <LevelProgress compact />
            </div>
          </div>
        </div>

        {/* Gamification Section - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <QuestsPanel type="daily" />
        </motion.div>

        {/* Enhanced Navigation and Search */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
          {/* Search and Controls */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Bar */}
              <div className="flex-1 w-full lg:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search videos, memberships, livestreams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full text-sm"
                  />
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Sort Dropdown */}
                <div className="relative flex-shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-2 sm:px-3 py-2 pr-6 sm:pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] sm:min-w-[140px]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="trending">Trending</option>
                  </select>
                  <ChevronDown className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <List className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
                
                {/* Refresh Button */}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="p-4 sm:p-6">
            <nav className="flex flex-wrap gap-1 sm:gap-2 bg-gray-100 rounded-xl p-1 sm:p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colorClasses = {
                  blue: isActive ? 'bg-blue-500 text-white shadow-lg' : 'text-blue-600 hover:bg-blue-50',
                  purple: isActive ? 'bg-purple-500 text-white shadow-lg' : 'text-purple-600 hover:bg-purple-50',
                  red: isActive ? 'bg-red-500 text-white shadow-lg' : 'text-red-600 hover:bg-red-50',
                  pink: isActive ? 'bg-pink-500 text-white shadow-lg' : 'text-pink-600 hover:bg-pink-50',
                  green: isActive ? 'bg-green-500 text-white shadow-lg' : 'text-green-600 hover:bg-green-50'
                };
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-300 flex-shrink-0 text-xs sm:text-sm ${
                      colorClasses[tab.color as keyof typeof colorClasses]
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count !== undefined && (
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold min-w-[18px] sm:min-w-[24px] text-center ${
                        isActive 
                          ? 'bg-white text-gray-900' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Enhanced Filters */}
          {(activeTab === 'videos' || activeTab === 'livestreams' || activeTab === 'memberships') && (
            <div className="p-4 sm:p-6 border-t border-gray-100">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:flex-wrap sm:gap-4 sm:items-center">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                
                {/* Category Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <span className="text-sm text-gray-600">Sport:</span>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'coco', 'martial-arts', 'calorie-fight'].map((category) => (
                      <button
                        key={category}
                        onClick={() => setCategoryFilter(category as any)}
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all ${
                          categoryFilter === category
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Sports' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Type Filter (only for videos) */}
                {activeTab === 'videos' && (
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm text-gray-600">Type:</span>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'free', 'premium'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setTypeFilter(type as any)}
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all ${
                            typeFilter === type
                              ? 'bg-purple-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Content Area */}
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'videos' && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
                      <Play className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-500" />
                    </div>
                    <p className="text-gray-600 mt-4 text-lg">Loading amazing videos...</p>
                  </div>
                ) : (
                  <>
                    {filteredVideos.length > 0 ? (
                      <div className={`grid gap-4 sm:gap-6 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 xs:grid-cols-2 md:tablet-landscape-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                          : 'grid-cols-1'
                      }`}>
                        {filteredVideos.map((video, index) => (
                          <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <VideoCard video={video} onVideoUpdate={refreshData} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <Play className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No videos found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          {searchQuery 
                            ? `No videos match "${searchQuery}". Try a different search term.`
                            : "No videos available right now. Check back later for new content!"
                          }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          {searchQuery && (
                            <Button
                              onClick={() => setSearchQuery('')}
                              variant="outline"
                              className="border-gray-300 hover:bg-gray-50"
                            >
                              Clear Search
                            </Button>
                          )}
                          <Button 
                            onClick={handleRefresh}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'memberships' && (
              <motion.div
                key="memberships"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {user.role === 'coach' && displayMemberships.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">Coach Dashboard</h3>
                        <p className="text-sm text-blue-700">
                          Manage your exclusive memberships and track your earnings
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-500"></div>
                      <Star className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-500" />
                    </div>
                    <p className="text-gray-600 mt-4 text-lg">Loading memberships...</p>
                  </div>
                ) : (
                  <>
                    {displayMemberships.length > 0 ? (
                      <div className={`grid gap-4 sm:gap-6 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 xs:grid-cols-2 md:tablet-landscape-cols-2 lg:grid-cols-3' 
                          : 'grid-cols-1'
                      }`}>
                        {displayMemberships.map((membership, index) => (
                          <motion.div
                            key={membership.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <MembershipCard membership={membership} onPurchased={refreshData} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <Star className="h-12 w-12 text-purple-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {user.role === 'coach' ? 'No memberships created yet' : 'No memberships available'}
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          {user.role === 'coach'
                            ? 'Create your first membership to offer exclusive content to your followers.'
                            : 'Check back later for exclusive membership opportunities.'}
                        </p>
                        {user.role === 'coach' && (
                          <Button
                            onClick={() => setShowCreateMembershipModal(true)}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Create Your First Membership
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'livestreams' && (
              <motion.div
                key="livestreams"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {user.role === 'coach' && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 mb-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-500 rounded-lg">
                          <Radio className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-900">Go Live</h3>
                          <p className="text-sm text-red-700">
                            Connect with your audience in real-time and build your community
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowCreateLivestreamModal(true)}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      >
                        <Radio className="h-4 w-4 mr-2" />
                        Start Livestream
                      </Button>
                    </div>
                  </div>
                )}

                {/* Coach Livestream Manager */}
                {user.role === 'coach' && displayLivestreams.length > 0 && (
                  <div className="mb-8">
                    <LivestreamManager 
                      livestreams={displayLivestreams} 
                      onRefresh={refreshData}
                    />
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-500"></div>
                      <Radio className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-red-500" />
                    </div>
                    <p className="text-gray-600 mt-4 text-lg">Loading livestreams...</p>
                  </div>
                ) : (
                  <>
                    {displayLivestreams.length > 0 ? (
                      <div className={`grid gap-4 sm:gap-6 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 xs:grid-cols-2 md:tablet-landscape-cols-2 lg:grid-cols-3' 
                          : 'grid-cols-1'
                      }`}>
                        {displayLivestreams.map((livestream: any, index) => (
                          <motion.div
                            key={livestream.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <LivestreamCard livestream={livestream} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="bg-gradient-to-r from-red-100 to-orange-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                          <Radio className="h-12 w-12 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          No livestreams available
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          {user.role === 'coach'
                            ? 'Start your first livestream to connect with your audience.'
                            : 'Check back later for live training sessions.'}
                        </p>
                        {user.role === 'coach' && (
                          <Button
                            onClick={() => setShowCreateLivestreamModal(true)}
                            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                          >
                            <Radio className="h-4 w-4 mr-2" />
                            Start Your First Livestream
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'womens-lounge' && (
              <motion.div
                key="womens-lounge"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WomensLounge />
              </motion.div>
            )}

            {activeTab === 'upload' && user.role === 'coach' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                  <div className="max-w-lg mx-auto">
                    <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                      <Zap className="h-12 w-12 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Your Content</h2>
                    <p className="text-gray-600 mb-8 text-lg">
                      Share your expertise with the community. Upload training videos, create membership programs, or start a livestream.
                    </p>

                    <div className="space-y-4 max-w-md mx-auto">
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
                        size="lg"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Upload Video
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 border-2"
                        size="lg"
                        onClick={() => setShowCreateMembershipModal(true)}
                      >
                        <Star className="h-5 w-5 mr-2" />
                        Create Membership
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 border-2"
                        size="lg"
                        onClick={() => setShowCreateLivestreamModal(true)}
                      >
                        <Radio className="h-5 w-5 mr-2" />
                        Start Livestream
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showUploadModal && (
            <UploadVideoModal
              onClose={() => setShowUploadModal(false)}
            />
          )}

          {showCreateMembershipModal && (
            <CreateMembershipModal
              onClose={() => setShowCreateMembershipModal(false)}
              coachId={user.id}
            />
          )}

          {showCreateLivestreamModal && (
            <CreateLivestreamModal
              isOpen={showCreateLivestreamModal}
              onClose={() => setShowCreateLivestreamModal(false)}
            />
          )}

          {showAdModal && (
            <WatchAdModal
              onClose={() => setShowAdModal(false)}
              userId={user.id}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}