import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2 } from 'lucide-react';
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
  read_at?: string;
  action_url?: string;
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

export function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      setupSocketListeners();
    }

    return () => {
      socketService.off('newNotification');
      socketService.off('notificationMarkedRead');
    };
  }, [user]);


  const setupSocketListeners = () => {
    socketService.on('newNotification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for new notification
      toast.success(notification.title, {
        duration: 3000,
        icon: '🔔',
      });
    });

    socketService.on('notificationMarkedRead', ({ notificationId }: { notificationId: string }) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications({ limit: 20 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiService.delete(`/notifications/${notificationId}`);
      
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👥';
      case 'message':
        return '📩';
      case 'post':
        return '📝';
      case 'share':
        return '🔄';
      case 'mention':
        return '📢';
      case 'event':
        return '📅';
      case 'achievement':
        return '🏆';
      case 'location':
        return '📍';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onDoubleClick={() => navigate('/dashboard/notifications')}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center group"
        title="Click for preview, double-click for full page"
      >
        <Bell className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-medium shadow-lg"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md md:w-96 bg-white rounded-lg sm:rounded-xl shadow-xl border border-gray-200 z-50 max-h-[80vh] sm:max-h-96 overflow-hidden"
            >
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {unreadCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={markAllAsRead}
                        className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5"
                      >
                        <Check className="h-3 w-3 mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">Mark all read</span>
                        <span className="sm:hidden">All</span>
                      </Button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-6 sm:p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2 text-xs sm:text-sm">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm sm:text-base">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0">
                          {(notification.from_user || notification.sender) ? (
                            <Avatar
                              src={notification.from_user?.avatar_url || notification.sender?.avatar_url}
                              alt={notification.from_user?.name || notification.sender?.name || 'User'}
                              name={notification.from_user?.name || notification.sender?.name || 'User'}
                              size="md"
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 rounded-full flex items-center justify-center text-base sm:text-lg">
                              {getNotificationIcon(notification.type)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm ${
                            !notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-0.5 sm:space-x-1">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                        
                        {!notification.is_read && (
                          <div className="flex-shrink-0">
                            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 sm:p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/dashboard/notifications');
                    }}
                    className="w-full text-center text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium py-1.5 min-h-[44px] flex items-center justify-center"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}