import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Gift, Trophy } from 'lucide-react';
import { apiService } from '../../services/api';
import { Quest, UserQuest } from '../../types';
import toast from 'react-hot-toast';

interface QuestsPanelProps {
  type?: 'daily' | 'weekly' | 'all';
  compact?: boolean;
}

export function QuestsPanel({ type = 'all', compact = false }: QuestsPanelProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  // If type is specified (daily/weekly), use it; otherwise default to 'daily' for tab
  const questType = type === 'all' ? undefined : type;
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  
  // Determine which quest type to fetch based on props
  const fetchType = questType || activeTab;

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const [questsResponse, userQuestsResponse] = await Promise.all([
          apiService.getQuests(fetchType),
          apiService.getUserQuests()
        ]);

        setQuests(questsResponse.quests);
        setUserQuests([...userQuestsResponse.active, ...userQuestsResponse.completed]);
      } catch (error) {
        console.error('Failed to fetch quests:', error);
        toast.error('Failed to load quests');
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, [fetchType]);

  const handleClaimReward = async (questId: string) => {
    try {
      await apiService.claimQuestReward(questId);
      toast.success('Quest reward claimed!');
      // Refresh quests
      const userQuestsResponse = await apiService.getUserQuests();
      setUserQuests([...userQuestsResponse.active, ...userQuestsResponse.completed]);
      window.dispatchEvent(new CustomEvent('tokensUpdated'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim reward');
    }
  };

  const getQuestProgress = (quest: Quest) => {
    const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
    if (!userQuest || !quest.userProgress) {
      return { progress: 0, target: quest.requirement_value, status: 'active' };
    }
    return quest.userProgress;
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse h-20 sm:h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter quests based on type prop or activeTab
  const filteredQuests = quests.filter(q => {
    if (type === 'all') {
      return q.quest_type === activeTab;
    }
    return q.quest_type === type;
  });
  
  // Limit quests in compact mode
  const displayQuests = compact ? filteredQuests.slice(0, 3) : filteredQuests;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'} ${compact ? 'space-y-3' : 'space-y-4 sm:space-y-6'}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
            {compact ? (questType === 'daily' ? 'Daily Quests' : questType === 'weekly' ? 'Weekly Quests' : 'Quests') : 'Quests'}
          </h3>
        </div>
        {type === 'all' && !compact && (
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'daily'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                activeTab === 'weekly'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
          </div>
        )}
      </div>

      <div className={`${compact ? 'space-y-2' : 'space-y-3 sm:space-y-4'}`}>
        {displayQuests.length === 0 ? (
          <div className={`text-center text-gray-500 ${compact ? 'py-4 text-sm' : 'py-8'}`}>
            No quests available
          </div>
        ) : (
          displayQuests.map((quest) => {
            const progress = getQuestProgress(quest);
            const progressPercentage = (progress.progress / progress.target) * 100;
            const isCompleted = progress.status === 'completed';
            const isClaimed = progress.status === 'claimed';

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl ${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} border-2 shadow-sm hover:shadow-md transition-all duration-200 ${
                  isCompleted
                    ? 'border-green-500'
                    : isClaimed
                    ? 'border-gray-300'
                    : 'border-blue-200'
                }`}
              >
                <div className={`flex items-start justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5 sm:mb-1">
                      <h4 className={`font-bold text-gray-900 truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>
                        {quest.title}
                      </h4>
                      {isCompleted && (
                        <CheckCircle2 className={`text-green-500 flex-shrink-0 ${compact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'}`} />
                      )}
                    </div>
                    {!compact && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                        {quest.description}
                      </p>
                    )}
                  </div>
                  <div className={`flex flex-col items-end space-y-0.5 sm:space-y-1 ml-2 flex-shrink-0 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>
                    {quest.xp_reward > 0 && (
                      <span className={`font-semibold text-blue-600 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>
                        +{quest.xp_reward} XP
                      </span>
                    )}
                    {quest.token_reward > 0 && (
                      <span className={`font-semibold text-yellow-600 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>
                        +{quest.token_reward} 🪙
                      </span>
                    )}
                  </div>
                </div>

                <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
                  <div className={`flex justify-between text-gray-600 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>
                    <span className="font-medium">
                      {progress.progress} / {progress.target}
                    </span>
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
                    <motion.div
                      className={`h-full rounded-full ${
                        isCompleted
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gradient-to-r from-blue-400 to-purple-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {isCompleted && !isClaimed && (
                    <button
                      onClick={() => handleClaimReward(quest.id)}
                      className={`w-full mt-1.5 sm:mt-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
                    >
                      <Gift className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      <span>{compact ? 'Claim' : 'Claim Reward'}</span>
                    </button>
                  )}
                  {isClaimed && (
                    <div className={`text-center text-gray-500 mt-1.5 sm:mt-2 ${compact ? 'text-[10px] sm:text-xs' : 'text-xs'}`}>
                      Reward claimed
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

