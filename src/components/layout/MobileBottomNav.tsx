import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, MessageCircle, Play, User, MapPin } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function MobileBottomNav() {
  const location = useLocation();
  const { notifications } = useAppStore();
  
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/dashboard/home', icon: Home, label: 'Home' },
    { path: '/dashboard/discover', icon: Search, label: 'Discover' },
    { path: '/dashboard/play', icon: Play, label: 'Play' },
    { path: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/dashboard/map', icon: MapPin, label: 'Map' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 md:hidden safe-bottom">
      <div className="flex items-center justify-around py-2 px-2 pb-safe">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center space-y-1 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] min-h-[56px] justify-center ${
              isActive(path)
                ? 'text-blue-600 bg-blue-50 scale-105'
                : 'text-gray-500 hover:text-gray-700 active:scale-95'
            }`}
          >
            <div className="relative">
              <Icon className="h-6 w-6 sm:h-5 sm:w-5" />
              {path === '/dashboard/notifications' && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs font-medium truncate max-w-[60px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
