import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Crown, Lock } from 'lucide-react';
import { apiService } from '../../services/api';
import { Achievement } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface AchievementsPanelProps {
  userId?: string;
  limit?: number;
}

const rarityIcons = {
  common: Star,
  rare: Zap,
  epic: Trophy,
  legendary: Crown
};

export function AchievementsPanel({ userId, limit }: AchievementsPanelProps) {
  const { user } = useAuthStore();
  const targetUserId = userId || user?.id;
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (!targetUserId) return;

    const fetchAchievements = async () => {
      try {
        const response = await apiService.getAchievements();
        let fetchedAchievements = response.achievements;

        // Filter by user if viewing own achievements
        if (targetUserId === user?.id) {
          fetchedAchievements = fetchedAchievements.map((ach: Achievement) => ({
            ...ach,
            unlocked: ach.unlocked || false,
            is_new: ach.is_new || false
          }));
        }

        setAchievements(fetchedAchievements);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
        toast.error('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [targetUserId, user?.id]);

  const filteredAchievements = achievements.filter(ach => {
    if (filter === 'unlocked') return ach.unlocked;
    if (filter === 'locked') return !ach.unlocked;
    return true;
  }).slice(0, limit);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 space-y-4 sm:space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Achievements
          </h3>
          <span className="text-sm font-normal text-gray-500">
            ({achievements.filter(a => a.unlocked).length}/{achievements.length})
          </span>
        </div>
        {!limit && (
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                filter === 'all' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                filter === 'unlocked' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unlocked
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                filter === 'locked' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Locked
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredAchievements.map((achievement) => {
          const Icon = rarityIcons[achievement.rarity] || Star;
          const isUnlocked = achievement.unlocked;
          const isNew = achievement.is_new;
          
          const borderColorClass = isUnlocked 
            ? (achievement.rarity === 'legendary' ? 'border-yellow-500' :
               achievement.rarity === 'epic' ? 'border-purple-500' :
               achievement.rarity === 'rare' ? 'border-blue-500' :
               'border-gray-500')
            : 'border-gray-300 opacity-60';

          return (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: 1.05 }}
              className={`relative bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 ${borderColorClass} shadow-sm hover:shadow-md transition-all duration-200`}
            >
              {isNew && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  !
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-2 sm:p-3 rounded-full ${
                  isUnlocked 
                    ? (achievement.rarity === 'legendary' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                       achievement.rarity === 'epic' ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
                       achievement.rarity === 'rare' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                       'bg-gradient-to-br from-gray-400 to-gray-600')
                    : 'bg-gray-300'
                }`}>
                  {isUnlocked ? (
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900">
                    {achievement.name}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {achievement.description}
                  </p>
                </div>

                {isUnlocked && (
                  <div className="flex items-center space-x-2 text-xs">
                    {achievement.xp_reward > 0 && (
                      <span className="text-blue-600 font-semibold">
                        +{achievement.xp_reward} XP
                      </span>
                    )}
                    {achievement.token_reward > 0 && (
                      <span className="text-yellow-600 font-semibold">
                        +{achievement.token_reward} 🪙
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={`absolute top-1 right-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-semibold ${
                achievement.rarity === 'legendary' ? 'bg-yellow-500 text-white' :
                achievement.rarity === 'epic' ? 'bg-purple-500 text-white' :
                achievement.rarity === 'rare' ? 'bg-blue-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {achievement.rarity}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

