import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  User, 
  LogOut, 
  MapPin, 
  ChevronDown,
  Play,
  Shield,
  Zap,
  Star,
  Compass
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from '../modals/notifications/NotificationBell';
import { useState, useEffect, useRef } from 'react';

export function Header() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocketStore();
  const location = useLocation();
  
  // State management
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  
  // Refs for click outside detection
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
  };



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
      
      
      if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setIsUserDropdownOpen(false);
      }
    };

      document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserDropdownOpen]);

  const getVerificationBadge = () => {
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
  };

  return (
    <>
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm"
    >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-1.5 xs:space-x-2 sm:space-x-4 min-w-0 flex-shrink">
              <Link to="/dashboard/home" className="flex items-center space-x-1.5 xs:space-x-2 group min-w-0 flex-shrink">
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
            {isConnected && (
                    <div className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  )}
                </div>
                <div className="hidden xs:block min-w-0 max-w-[120px] xs:max-w-[140px] sm:max-w-none">
                  <h1 className="text-base xs:text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                    SportsFeed
                  </h1>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 -mt-0.5 sm:-mt-1 truncate hide-xs">Connect. Compete. Excel.</p>
                </div>
              </Link>
          </div>


            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link 
                to="/dashboard/home"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  isActive('/dashboard/home') 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Home</span>
              </Link>

              <Link 
                to="/dashboard/discover"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  isActive('/dashboard/discover') 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Compass className="h-4 w-4" />
                <span className="text-sm font-medium">Discover</span>
              </Link>
            
            <Link 
                to="/dashboard/play"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  isActive('/dashboard/play') 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Play</span>
            </Link>
            
            <Link
              to="/dashboard/messages"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  isActive('/dashboard/messages') 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Messages</span>
            </Link>

            <Link
              to="/dashboard/map"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  isActive('/dashboard/map') 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Map</span>
            </Link>
          </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-0.5 xs:space-x-1 sm:space-x-2 flex-shrink-0">

              {/* Notifications */}
              <NotificationBell />


              {/* User Profile Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 p-1 xs:p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px]"
            >
              <Avatar
                src={user?.avatar_url}
                fallbackSrc={user?.profileImage}
                alt={user?.name || user?.fullName || 'User'}
                name={user?.name || user?.fullName}
                userId={user?.id}
                size="sm"
                className="flex-shrink-0"
              />
                  <div className="hidden md:block text-left min-w-0 max-w-[100px] lg:max-w-[120px]">
                  <p className="text-sm font-medium text-gray-900 truncate-with-tooltip">
                      {user?.name || user?.fullName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate-with-tooltip">{user?.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block flex-shrink-0" />
                </button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={user?.avatar_url}
                            fallbackSrc={user?.profileImage}
                            alt={user?.name || user?.fullName || 'User'}
                            name={user?.name || user?.fullName}
                            userId={user?.id}
                            size="md"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-1">
                              <p className="text-sm font-semibold text-gray-900">
                    {user?.name || user?.fullName}
                  </p>
                  {getVerificationBadge()}
                </div>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                            <p className="text-xs text-gray-400">{user?.email}</p>
                          </div>
                        </div>
              </div>

                      {/* Quick Actions */}
                      <div className="py-2">
                        <Link 
                          to="/dashboard/profile"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          <span>View Profile</span>
                        </Link>
                        

                        {/* Role-specific actions */}
                        {(user?.role === 'coach' || user?.role === 'administrator' || user?.role === 'admin') && (
                          <Link 
                            to="/dashboard/expert"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span>Expert Panel</span>
                          </Link>
                        )}

                        {(user?.role === 'aspirant' || user?.role === 'coach') && (
                          <Link 
                            to="/dashboard/verification"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Star className="h-4 w-4" />
                            <span>Verification</span>
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        </div>


    </motion.header>
    </>
  );
}