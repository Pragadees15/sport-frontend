export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  fullName?: string;
  role: 'user' | 'admin' | 'moderator' | 'coach' | 'fan' | 'aspirant' | 'administrator';
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phone?: string;
  sports_categories?: string[];
  is_verified?: boolean;
  is_private?: boolean;
  is_banned?: boolean;
  ban_reason?: string;
  tokens?: number;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy fields for backward compatibility
  sportsCategory?: 'coco' | 'martial-arts' | 'calorie-fight';
  isVerified?: boolean;
  profileImage?: string;
  followers?: number | { count: number };
  following?: number | { count: number };
  posts?: number;
  followers_count?: number;
  posts_count?: number;
  createdAt?: string;
  sharedPosts?: string[];
  documents?: VerificationDocument[];
  accessibilityNeeds?: string[];
  preferredAccommodations?: string[];
  sportRole?: SportRole;
  evidenceDocuments?: EvidenceDocument[];
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isProfessional?: boolean;
  sportInterests?: string[];
  privacyMode?: boolean;
  darkMode?: boolean;
}

export interface VerificationDocument {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  documentType: 'certificate' | 'id' | 'license';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
}

export interface SportRole {
  id: string;
  name: string;
  category: 'coco' | 'martial-arts' | 'calorie-fight';
  description: string;
  isProfessional: boolean;
  requiresEvidence: boolean;
  evidenceTypes: string[];
}

export interface EvidenceDocument {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  documentType: 'certificate' | 'license' | 'award' | 'competition-result' | 'training-record' | 'other';
  sportRole: string;
  description: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  aiAnalysis?: {
    confidence: number;
    detectedText: string;
    suggestedAction: 'approve' | 'reject' | 'manual-review';
    analysisDate: string;
  };
}

export interface Post {
  id: string;
  author_id: string;
  author: User;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  media_urls?: string[];
  sports_category?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  tags?: string[];
  is_public: boolean;
  allow_comments: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Frontend convenience fields
  userId?: string; // alias for author_id
  user?: User; // alias for author
  mediaUrl?: string; // alias for first media_urls item
  mediaType?: 'image' | 'video' | 'audio'; // derived from type
  likes?: number; // alias for likes_count
  comments?: number; // alias for comments_count
  shares?: number; // alias for shares_count
  isLiked?: boolean; // computed field
  isLikedByUser?: boolean; // computed field for user like status
  createdAt?: string; // alias for created_at
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  likes_count: number;
  replies_count?: number;
  is_edited?: boolean;
  created_at: string;
  updated_at: string;
  author: User;
  likes?: number | { count: number }[]; // Can be either number or array
  replies?: Comment[];
  isLikedByUser?: boolean;
  
  // Frontend convenience fields
  postId?: string; // alias for post_id
  userId?: string; // alias for user_id
  author_id?: string; // legacy alias for user_id
  user?: User; // alias for author
  likesCount?: number; // alias for likes_count
  createdAt?: string; // alias for created_at
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video';
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnail_url?: string; // API response format
  videoUrl: string;
  video_url?: string; // API response format
  duration: number; // in seconds
  coachId: string;
  coach_id?: string; // API response format
  coach: User;
  category: 'coco' | 'martial-arts' | 'calorie-fight';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'free' | 'premium';
  tokenCost: number; // 0 for free videos
  token_cost?: number; // API response format
  views: number;
  views_count?: number; // API response format
  likes: number;
  likes_count?: number; // API response format
  isLiked: boolean;
  tags: string[];
  createdAt: string;
  created_at?: string; // API response format
}

export interface Livestream {
  id: string;
  userId: string;
  user: User;
  title: string;
  description: string;
  youtubeUrl: string;
  youtube_url?: string; // API response format
  thumbnailUrl?: string;
  thumbnail_url?: string; // API response format
  category: 'coco' | 'martial-arts' | 'calorie-fight' | 'adaptive-sports' | 'unstructured-sports';
  isLive: boolean;
  is_live?: boolean; // API response format
  scheduledTime?: string;
  scheduled_time?: string; // API response format
  startedAt?: string;
  started_at?: string; // API response format
  endedAt?: string;
  ended_at?: string; // API response format
  viewersCount: number;
  viewers_count?: number; // API response format
  maxViewers: number;
  max_viewers?: number; // API response format
  isActive: boolean;
  is_active?: boolean; // API response format
  createdAt: string;
  created_at?: string; // API response format
  updatedAt: string;
  updated_at?: string; // API response format
  // Coach information
  coach?: User;
}

export interface Membership {
  id: string;
  name: string;
  description: string;
  price: number; // in tokens
  duration: number; // in days
  benefits: string[];
  coachId: string;
  coach: User;
  isActive: boolean;
}

export interface UserTokens {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: TokenTransaction[];
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent' | 'purchased';
  amount: number;
  reason: string;
  description: string;
  createdAt: string;
}

export interface LocationCheckIn {
  id: string;
  userId: string;
  user: User;
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  checkInType: 'event' | 'practice' | 'general';
  eventId?: string;
  duration?: number; // in minutes
  createdAt: string;
  checked_in_at?: string;
}

export interface SafeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  safetyFeatures: ('women-safe' | 'disability-friendly' | 'accessible-parking' | 'accessible-entrance' | 'accessible-restrooms' | 'well-lit' | 'security-present')[];
  verifiedBy: string[];
  reportedBy: string;
  lastVerified: string;
  description?: string;
  sportsAvailable: string[];
  averageRating: number;
  totalRatings: number;
  isVerified: boolean;
}

export interface HeatMapData {
  latitude: number;
  longitude: number;
  intensity: number; // 0-1 scale
  type: 'activity' | 'safety' | 'women-safe' | 'disability-friendly';
  timestamp: string;
  userCount: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
  };
  startTime: string;
  endTime: string;
  organizerId: string;
  organizer: User;
  category: 'coco' | 'martial-arts' | 'calorie-fight';
  maxParticipants?: number;
  currentParticipants: number;
  isWomenOnly: boolean;
  accessibilityFeatures: string[];
  tokenCost: number;
  isActive: boolean;
  createdAt: string;
}

// =====================================================
// GAMIFICATION TYPES
// =====================================================

export interface UserLevel {
  user_id: string;
  level: number;
  current_xp: number;
  total_xp: number;
  xp_to_next_level: number;
  login_streak: number;
  max_login_streak: number;
  activity_streak: number;
  max_activity_streak: number;
  last_login_date?: string;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'engagement' | 'social' | 'content' | 'milestone' | 'special';
  icon_url?: string;
  xp_reward: number;
  token_reward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  sort_order: number;
  unlocked?: boolean;
  is_new?: boolean;
  unlocked_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  is_new: boolean;
  achievement?: Achievement;
}

export interface Quest {
  id: string;
  code: string;
  title: string;
  description: string;
  quest_type: 'daily' | 'weekly' | 'special';
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  token_reward: number;
  duration_type: 'daily' | 'weekly' | 'monthly' | 'permanent';
  is_recurring: boolean;
  is_active: boolean;
  sort_order: number;
  userProgress?: {
    progress: number;
    target: number;
    status: 'active' | 'completed' | 'expired' | 'claimed';
    expires_at?: string;
    completed_at?: string;
  };
}

export interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  progress: number;
  target: number;
  status: 'active' | 'completed' | 'expired' | 'claimed';
  started_at: string;
  completed_at?: string;
  expires_at?: string;
  xp_earned: number;
  tokens_earned: number;
  quest?: Quest;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  source_type: string;
  source_id?: string;
  description?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
  role?: string;
  value: number;
  level?: number;
  total_xp?: number;
}

export interface Leaderboard {
  leaderboard: LeaderboardEntry[];
  userRank?: number;
  userData?: LeaderboardEntry;
  type: 'xp' | 'level' | 'tokens' | 'streak' | 'achievements';
}