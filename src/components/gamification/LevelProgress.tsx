import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Flame } from 'lucide-react';
import { apiService } from '../../services/api';
import { UserLevel } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LevelProgressProps {
  userId?: string;
  compact?: boolean;
}

export function LevelProgress({ userId, compact = false }: LevelProgressProps) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;
  const [levelData, setLevelData] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchLevel = async () => {
      try {
        const response = await apiService.getUserLevel(targetUserId);
        setLevelData(response.level);
      } catch (error) {
        console.error('Failed to fetch level:', error);
        toast.error('Failed to load level data');
      } finally {
        setLoading(false);
      }
    };

    fetchLevel();
  }, [targetUserId]);

  if (loading || !levelData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const progressPercentage = levelData.xp_to_next_level > 0
    ? (levelData.current_xp / (levelData.current_xp + levelData.xp_to_next_level)) * 100
    : 100;

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-lg">Lv.{levelData.level}</span>
        </div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <span className="text-sm text-gray-600">
          {levelData.current_xp}/{levelData.current_xp + levelData.xp_to_next_level} XP
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6"
    >
      <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
          Level {levelData.level}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-0.5 sm:mb-1">
            {levelData.total_xp.toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-blue-700 font-medium">Total XP</div>
        </div>
        
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl">
          <div className="flex items-center justify-center space-x-1 text-orange-600 mb-0.5 sm:mb-1">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-2xl sm:text-3xl font-bold">{levelData.login_streak}</span>
          </div>
          <div className="text-xs sm:text-sm text-orange-700 font-medium">Day Streak</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs sm:text-sm mb-1">
          <span className="text-gray-700 font-medium">
            {levelData.current_xp} / {levelData.current_xp + levelData.xp_to_next_level} XP
          </span>
          <span className="text-gray-700 font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full flex items-center justify-end pr-1 sm:pr-2"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {progressPercentage > 15 && (
              <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
            )}
          </motion.div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          {levelData.xp_to_next_level} XP needed for Level {levelData.level + 1}
        </p>
      </div>
    </motion.div>
  );
}

