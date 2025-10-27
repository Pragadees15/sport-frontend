import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

export function Dashboard() {
  const { user } = useAuthStore();
  const { connect, disconnect, isConnected } = useSocketStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      if (user && !isConnected) {
        try {
          const token = localStorage.getItem('auth_token');
          if (token) {
            await connect(token);
            setConnectionError(false);
          } else {
            setConnectionError(true);
          }
        } catch (error) {
          console.error('Connection error:', error);
          setConnectionError(true);
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    initializeConnection();

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [user, connect, disconnect, isConnected]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="relative mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">Loading Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">Please wait while we prepare your personalized experience.</p>
          
          <div className="space-y-2 sm:space-y-3 px-4">
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Initializing user session</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Loading your preferences</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Connecting to services</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="relative mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">Connecting...</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">Establishing secure connection to our services.</p>
          
          <div className="space-y-2 sm:space-y-3 px-4">
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Authenticating user</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Establishing real-time connection</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Loading dashboard</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="relative mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <WifiOff className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">Connection Error</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">We're having trouble connecting to our services. Please try again.</p>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm sm:text-base rounded-lg hover:from-red-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header />
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
        <MobileBottomNav />
      </motion.div>
    </div>
  );
}