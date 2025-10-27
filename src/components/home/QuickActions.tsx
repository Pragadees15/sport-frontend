import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  Video, 
  Calendar, 
  MapPin, 
  Users, 
  MessageCircle,
  Zap,
  Play,
  Trophy
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';

export function QuickActions() {
  const { user } = useAuthStore();
  const { setCurrentView } = useAppStore();
  const [todayStats, setTodayStats] = useState({
    posts_today: 0,
    active_chats: 0,
    upcoming_events: 0
  });

  useEffect(() => {
    const fetchTodayStats = async () => {
      if (!user?.id) return;
      
      try {
        const data = await apiService.getDashboardData(user.id);
        setTodayStats(data.dashboard.today_stats || {
          posts_today: 0,
          active_chats: 0,
          upcoming_events: 0
        });
      } catch (error) {
        console.error('Error fetching today stats:', error);
        // Keep default values
      }
    };

    fetchTodayStats();
  }, [user?.id]);

  const actions = [
    {
      id: 'create-post',
      title: 'Create Post',
      description: 'Share your progress',
      icon: PlusCircle,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => {
        // Scroll to create post section
        const createPostElement = document.querySelector('[data-create-post]');
        if (createPostElement) {
          createPostElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      id: 'start-workout',
      title: 'Start Workout',
      description: 'Begin training session',
      icon: Play,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => setCurrentView('play')
    },
    {
      id: 'find-events',
      title: 'Find Events',
      description: 'Discover local events',
      icon: Calendar,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => {
        // Navigate to events or discover page
        setCurrentView('discover');
      }
    },
    {
      id: 'check-in',
      title: 'Check In',
      description: 'Log your location',
      icon: MapPin,
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => setCurrentView('map')
    },
    {
      id: 'live-stream',
      title: 'Go Live',
      description: 'Start broadcasting',
      icon: Video,
      color: 'bg-pink-500 hover:bg-pink-600',
      onClick: () => {
        // Handle live streaming
        console.log('Starting live stream...');
      },
      premium: true
    },
    {
      id: 'find-coach',
      title: 'Find Coach',
      description: 'Connect with experts',
      icon: Users,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      onClick: () => setCurrentView('discover')
    }
  ];

  // Filter actions based on user role
  const availableActions = actions.filter(action => {
    if (action.premium && user?.role === 'user') {
      return false; // Hide premium features for regular users
    }
    return true;
  });

  const handleActionClick = (action: typeof actions[0]) => {
    if (action.premium && user?.role === 'user') {
      // Show upgrade prompt
      alert('This feature is available for coaches and premium members. Upgrade your account to access it!');
      return;
    }
    action.onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6"
    >
      <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {availableActions.map((action, index) => {
          const IconComponent = action.icon;
          
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleActionClick(action)}
              className={`relative p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl text-white text-left transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${action.color} group`}
            >
              {action.premium && (
                <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2 group-hover:scale-105 transition-transform truncate">{action.title}</h4>
                  <p className="text-xs opacity-90 leading-relaxed break-words line-clamp-2">{action.description}</p>
                </div>
                <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 ml-2 sm:ml-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Additional Quick Stats */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl">
            <div className="text-lg sm:text-xl font-bold text-blue-600 mb-0.5 sm:mb-1 truncate">{todayStats.posts_today}</div>
            <div className="text-xs text-blue-700 font-medium break-words line-clamp-2">Today's Posts</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl">
            <div className="text-lg sm:text-xl font-bold text-green-600 mb-0.5 sm:mb-1 truncate">{todayStats.active_chats}</div>
            <div className="text-xs text-green-700 font-medium break-words line-clamp-2">Active Chats</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl">
            <div className="text-lg sm:text-xl font-bold text-purple-600 mb-0.5 sm:mb-1 truncate">{todayStats.upcoming_events}</div>
            <div className="text-xs text-purple-700 font-medium break-words line-clamp-2">Upcoming</div>
          </div>
        </div>
      </div>
      
      {/* Coach-specific actions */}
      {user?.role === 'coach' && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Coach Tools</h4>
          <div className="space-y-1.5 sm:space-y-2">
            <button 
              onClick={() => setCurrentView('expert')}
              className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-colors"
            >
              <Trophy className="h-4 w-4 text-blue-600" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Expert Dashboard</div>
                <div className="text-xs text-gray-600">Manage your coaching</div>
              </div>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg transition-colors">
              <Video className="h-4 w-4 text-green-600" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Upload Video</div>
                <div className="text-xs text-gray-600">Share training content</div>
              </div>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg transition-colors">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Schedule Session</div>
                <div className="text-xs text-gray-600">Book with clients</div>
              </div>
            </button>
          </div>
        </div>
      )}
      
      {/* Emergency or Important Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Report Issue</span>
        </button>
      </div>
    </motion.div>
  );
}