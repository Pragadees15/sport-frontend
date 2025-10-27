/**
 * AthleteDiscovery Component
 * 
 * AI-powered athlete discovery with smart recommendations
 * Uses talent scoring and skill-based analysis
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Star, 
  MapPin, 
  Award, 
  Filter, 
  Search,
  Sparkles,
  Target,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { User } from '../../types';

interface AthleteAnalysis {
  skillLevel: number;
  activityScore: number;
  engagementScore: number;
  talentScore: number;
  strengths: string[];
  recommendations: string[];
}

interface DiscoveredAthlete {
  user: User;
  analysis: AthleteAnalysis;
}

export function AthleteDiscovery() {
  const { user } = useAuthStore();
  const [athletes, setAthletes] = useState<DiscoveredAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [minTalentScore, setMinTalentScore] = useState(60);
  const [sportsCategory, setSportsCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAthletes();
  }, [minTalentScore, sportsCategory]);

  const fetchAthletes = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 20,
        minTalentScore,
      };

      if (sportsCategory) {
        params.sportsCategory = sportsCategory;
      }

      const response = await apiService.discoverAthletes(params);
      setAthletes(response.athletes || []);
    } catch (error) {
      console.error('Failed to discover athletes:', error);
      toast.error('Failed to load athlete recommendations');
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter((athlete) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      athlete.user.name?.toLowerCase().includes(query) ||
      athlete.user.bio?.toLowerCase().includes(query) ||
      athlete.user.sports_categories?.some(cat => cat.toLowerCase().includes(query))
    );
  });

  const getTalentBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    if (score >= 70) return 'bg-gradient-to-r from-blue-400 to-indigo-500';
    if (score >= 60) return 'bg-gradient-to-r from-green-400 to-emerald-500';
    return 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const getTalentLabel = (score: number) => {
    if (score >= 80) return 'Elite';
    if (score >= 70) return 'Advanced';
    if (score >= 60) return 'Intermediate';
    return 'Developing';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              AI Athlete Discovery
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Find talented athletes using smart AI analysis
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {/* Sports Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sportsCategory}
              onChange={(e) => setSportsCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 appearance-none"
            >
              <option value="">All Sports</option>
              <option value="coco">COCO (Competitive)</option>
              <option value="martial-arts">Martial Arts</option>
              <option value="calorie-fight">Calorie Fight</option>
              <option value="adaptive-sports">Adaptive Sports</option>
              <option value="unstructured-sports">Unstructured Sports</option>
            </select>
          </div>

          {/* Talent Score Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Min Talent Score: {minTalentScore}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minTalentScore}
              onChange={(e) => setMinTalentScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Found {filteredAthletes.length} talented athletes
          </p>
          <Button
            onClick={fetchAthletes}
            variant="secondary"
            size="sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Athletes Grid */}
      {!loading && (
        <AnimatePresence mode="popLayout">
          {filteredAthletes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Athletes Found
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters or search query
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAthletes.map((athlete) => (
                <motion.div
                  key={athlete.user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <Avatar
                        src={athlete.user.avatar_url}
                        alt={athlete.user.name}
                        name={athlete.user.name}
                        size="lg"
                        className="ring-2 ring-white shadow-md"
                      />
                      {athlete.user.is_verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <Award className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {athlete.user.name}
                      </h3>
                      {athlete.user.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{athlete.user.location}</span>
                        </div>
                      )}
                      {athlete.user.sports_categories && athlete.user.sports_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {athlete.user.sports_categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Talent Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Talent Score
                      </span>
                      <div className={`px-3 py-1 ${getTalentBadgeColor(athlete.analysis.talentScore)} text-white text-sm font-bold rounded-full shadow-sm`}>
                        {getTalentLabel(athlete.analysis.talentScore)}
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${athlete.analysis.talentScore}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full ${getTalentBadgeColor(athlete.analysis.talentScore)}`}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Score</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {athlete.analysis.talentScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <Activity className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-blue-900">
                        {athlete.analysis.activityScore}
                      </div>
                      <div className="text-[10px] text-blue-600">Activity</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <Users className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-green-900">
                        {athlete.analysis.engagementScore}
                      </div>
                      <div className="text-[10px] text-green-600">Engagement</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <Zap className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-purple-900">
                        {athlete.analysis.skillLevel}
                      </div>
                      <div className="text-[10px] text-purple-600">Skill</div>
                    </div>
                  </div>

                  {/* Strengths */}
                  {athlete.analysis.strengths.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        Strengths
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {athlete.analysis.strengths.slice(0, 3).map((strength, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-md"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {athlete.user.bio && (
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                      {athlete.user.bio}
                    </p>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={() => {
                      window.location.href = `/profile/${athlete.user.id}`;
                    }}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    View Profile
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

