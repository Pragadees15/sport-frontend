import { useState, useEffect } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Heart, 
  UserPlus, 
  Calendar, 
  Trophy, 
  MapPin, 
  Settings, 
  Trash2, 
  CheckCheck, 
  Filter,
  Sparkles,
  Users,
  Zap,
  RefreshCw,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { apiService } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'post' | 'share' | 'mention' | 'system' | 'event' | 'achievement' | 'location';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  action_url?: string;
  read_at?: string;
  created_at: string;
  updated_at?: string;
  from_user?: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    is_verified: boolean;
  };
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    is_verified?: boolean;
  };
}

type FilterType = 'all' | 'unread' | 'message' | 'like' | 'follow' | 'event' | 'achievement';

export function NotificationsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadStats();
      setupSocketListeners();
    }

    return () => {
      cleanupSocketListeners();
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications(1, false);
    }
  }, [filter]);

  const setupSocketListeners = () => {
    socketService.on('newNotification', (notification: Notification) => {
      setNotifications(prev => {
        // Deduplicate by id and keep newest first
        const seen = new Set<string>();
        const merged = [notification, ...prev].filter(n => {
          if (!n?.id) return false;
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        return merged;
      });
    });

    socketService.on('notificationRead', (notificationId: string) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    });

    socketService.on('notificationDeleted', (notificationId: string) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    });
  };

  const cleanupSocketListeners = () => {
    socketService.off('newNotification');
    socketService.off('notificationRead');
    socketService.off('notificationDeleted');
  };

  const loadNotifications = async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      
      const response = await apiService.getNotifications({
        page,
        limit: 20,
        type: filter === 'all' ? undefined : filter,
        read: filter === 'unread' ? false : undefined
      });
      
      // Deduplicate just in case the backend returns duplicates
      const list = Array.isArray(response.notifications) ? response.notifications : [];
      const seen = new Set<string>();
      const deduped = list.filter((n) => {
        if (!n?.id) return false;
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      
      if (append) {
        setNotifications(prev => [...prev, ...deduped]);
      } else {
        setNotifications(deduped);
      }
      
      setHasMore(response.pagination?.hasNextPage || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getNotificationStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'like':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-600" />;
      case 'event':
        return <Calendar className="h-5 w-5 text-purple-600" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-600" />;
      case 'location':
        return <MapPin className="h-5 w-5 text-orange-600" />;
      case 'post':
        return <Bell className="h-5 w-5 text-blue-600" />;
      case 'share':
        return <RefreshCw className="h-5 w-5 text-purple-600" />;
      case 'mention':
        return <Users className="h-5 w-5 text-indigo-600" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await apiService.markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to relevant content if action_url exists
    if (notification.action_url) {
      // Handle navigation based on the URL
      // This would typically use your router
      console.log('Navigate to:', notification.action_url);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteSingle = async (notificationId: string) => {
    try {
      await apiService.deleteNotification(notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      // Delete each selected notification from the backend
      const deletePromises = Array.from(selectedNotifications).map(notificationId => 
        apiService.deleteNotification(notificationId)
      );
      
      await Promise.all(deletePromises);
      
      // Remove all selected notifications from the frontend state
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
      toast.success('Notifications deleted');
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      await apiService.markMultipleNotificationsAsRead(Array.from(selectedNotifications));
      
      setNotifications(prev => 
        prev.map(n => 
          selectedNotifications.has(n.id) ? { ...n, is_read: true } : n
        )
      );
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
      toast.success('Notifications marked as read');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read;
      case 'message':
      case 'like':
      case 'follow':
      case 'event':
      case 'achievement':
        return notification.type === filter;
      default:
        return true;
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            {/* Hero Section Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                  <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            
            {/* Notifications Skeleton */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/dashboard/home')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 group transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 mb-6 shadow-lg">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Stay updated with your community</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Notifications
            </h1>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Never miss important updates from your sports community
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Bell className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Real-time Updates</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Community Activity</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Instant Alerts</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Stats Section */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl w-fit mx-auto mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-blue-600 mb-2">{stats.total || 0}</p>
              <p className="text-sm text-blue-700 font-medium">Total</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl w-fit mx-auto mb-4">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-red-600 mb-2">{stats.unread || 0}</p>
              <p className="text-sm text-red-700 font-medium">Unread</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl w-fit mx-auto mb-4">
                <CheckCheck className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-2">{stats.read || 0}</p>
              <p className="text-sm text-green-700 font-medium">Read</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 text-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl w-fit mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-purple-600 mb-2">{stats.recent || 0}</p>
              <p className="text-sm text-purple-700 font-medium">This Week</p>
            </div>
          </motion.div>
        )}

        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">Your Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-2 hover:bg-green-50 hover:border-green-200"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all read</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast('Settings coming soon!', { icon: 'ℹ️' })}
              className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-200"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
          </div>
          {[
            { key: 'all', label: 'All', icon: Bell, color: 'blue' },
            { key: 'unread', label: 'Unread', icon: Eye, color: 'red' },
            { key: 'message', label: 'Messages', icon: MessageSquare, color: 'green' },
            { key: 'like', label: 'Likes', icon: Heart, color: 'pink' },
            { key: 'follow', label: 'Follows', icon: UserPlus, color: 'purple' },
            { key: 'event', label: 'Events', icon: Calendar, color: 'orange' },
            { key: 'achievement', label: 'Achievements', icon: Trophy, color: 'yellow' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key as FilterType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                filter === key
                  ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white shadow-lg transform scale-105`
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-100 hover:scale-105'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {showBulkActions && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6 mb-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <CheckCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-800">
                    {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedNotifications(new Set());
                      setShowBulkActions(false);
                    }}
                    className="hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkAsRead}
                    className="hover:bg-green-50 hover:border-green-200"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark as read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-red-600 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
          >
            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-fit mx-auto mb-6">
              <Bell className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications at the moment." 
                : 'No notifications match your current filter. Try adjusting your filter or check back later.'}
            </p>
            {filter !== 'all' && (
              <Button
                onClick={() => setFilter('all')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
              >
                View All Notifications
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                  notification.is_read 
                    ? 'opacity-75' 
                    : 'ring-2 ring-blue-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50'
                } ${
                  selectedNotifications.has(notification.id)
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(notification.id);
                    }}
                    className="mt-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  
                  <div className="flex-shrink-0">
                    {(notification.sender || notification.from_user) ? (
                      <div className="relative">
                        <Avatar
                          src={notification.sender?.avatar_url || notification.from_user?.avatar_url}
                          alt={notification.sender?.name || notification.from_user?.name || 'User'}
                          name={notification.sender?.name || notification.from_user?.name || 'User'}
                          size="md"
                        />
                        {(notification.sender?.is_verified || notification.from_user?.is_verified) && (
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                            (notification.sender?.role === 'admin' || notification.sender?.role === 'administrator' || notification.from_user?.role === 'admin' || notification.from_user?.role === 'administrator') 
                              ? 'bg-orange-500' 
                              : (notification.sender?.role === 'coach' || notification.from_user?.role === 'coach') 
                                ? 'bg-violet-500' 
                                : 'bg-blue-500'
                          }`}>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className={`text-base font-semibold ${
                            notification.is_read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <span className="text-xs text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded-full">
                          {formatTime(notification.created_at)}
                        </span>
                      
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 mt-3">
                      {!notification.is_read && (
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Mark as read
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingle(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && (
          <div className="text-center mt-8">
            <Button
              onClick={() => loadNotifications(currentPage + 1, true)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                'Load More Notifications'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}