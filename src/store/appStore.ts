import { create } from 'zustand';
import { User, Post, Comment, Message, Conversation, Video, Membership, UserTokens, TokenTransaction, LocationCheckIn, SafeLocation, HeatMapData, Event, Livestream } from '../types';
import { apiService } from '../services/api';

interface AppState {
  currentView: 'home' | 'discover' | 'notifications' | 'messages' | 'profile' | 'expert' | 'play' | 'map';
  posts: Post[];
  users: User[];
  comments: Comment[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  videos: Video[];
  memberships: Membership[];
  userTokens: UserTokens[];
  userFollowing: { followerId: string; followingId: string }[];
  setCurrentView: (view: AppState['currentView']) => void;
  addPost: (post: Post) => void;
  updatePostLikes: (postId: string, likes: number, isLiked: boolean) => void;
  updatePostShares: (postId: string, shares: number) => void;
  addSharedPost: (userId: string, postId: string) => void;
  getSharedPosts: (userId: string) => Post[];
  addComment: (comment: Comment) => void;
  getPostComments: (postId: string) => Comment[];
  getFilteredPosts: (userSportsCategory: string) => Post[];
  getFilteredUsers: (userSportsCategory: string) => User[];
  getUserPosts: (userId: string) => Post[];
  getUserFollowers: (userId: string) => User[];
  getUserFollowing: (userId: string) => User[];
  addMessage: (message: Message) => void;
  getConversations: (userId: string, userSportsCategory: string | 'all') => Conversation[];
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  updateUserInStore: (updatedUser: User) => void;
  followUser: (userId: string, targetUserId: string) => void;
  unfollowUser: (userId: string, targetUserId: string) => void;
  isFollowing: (userId: string, targetUserId: string) => boolean;
  watchAd: (userId: string) => void;
  addVideo: (video: Video) => void;
  getVideosByCategory: (category: string) => Video[];
  getVideosByCoach: (coachId: string) => Video[];
  likeVideo: (videoId: string, userId: string) => void;
  watchVideo: (videoId: string, userId: string) => void;
  getUserTokens: (userId: string) => UserTokens;
  initializeUserTokens: (userId: string) => void;
  addTokens: (userId: string, amount: number, reason: string, description: string) => void;
  spendTokens: (userId: string, amount: number, reason: string, description: string) => boolean;
  purchaseTokens: (userId: string, amount: number, price: number) => void;
  addMembership: (membership: Membership) => void;
  getMembershipsByCoach: (coachId: string) => Membership[];
  livestreams: Livestream[];
  addLivestream: (livestreamData: any) => Promise<void>;
  getLivestreams: (category: string) => Livestream[];
  // Map and location features
  locationCheckIns: LocationCheckIn[];
  safeLocations: SafeLocation[];
  heatMapData: HeatMapData[];
  events: Event[];
  addLocationCheckIn: (checkIn: LocationCheckIn) => void;
  addSafeLocation: (location: SafeLocation) => void;
  updateHeatMapData: (data: HeatMapData) => void;
  addEvent: (event: Event) => void;
  getEventsByLocation: (locationId: string) => Event[];
  getEventsByCategory: (category: string) => Event[];
}

interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'verification';
  message: string;
  isRead: boolean;
  createdAt: string;
  fromUser?: User;
}

// Initialize with empty arrays - data will be loaded from API

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  posts: [],
  users: [],
  comments: [],
  conversations: [],
  messages: [],
  notifications: [],
  videos: [],
  memberships: [],
  userTokens: [],
  userFollowing: [],
  livestreams: [],
  locationCheckIns: [],
  safeLocations: [],
  heatMapData: [],
  events: [],

  setCurrentView: (view) => set({ currentView: view }),

  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

  updatePostLikes: (postId, likes, isLiked) => {
    set((state) => ({
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, likes, isLiked }
          : post
      ),
    }));
  },

  updatePostShares: (postId, shares) => {
    set((state) => ({
      posts: state.posts.map(post =>
        post.id === postId
          ? { ...post, shares }
          : post
      ),
    }));
  },

  addSharedPost: (userId, postId) => {
    set((state) => {
      // Update users array
      const updatedUsers = state.users.map(user =>
        user.id === userId
          ? { ...user, sharedPosts: [...(user.sharedPosts || []), postId] }
          : user
      );
      
      return { users: updatedUsers };
    });
  },

  getSharedPosts: (userId) => {
    const state = get();
    const user = state.users.find(u => u.id === userId);
    if (!user?.sharedPosts || user.sharedPosts.length === 0) return [];
    
    return state.posts.filter(post => user.sharedPosts?.includes(post.id));
  },

  addComment: (comment) => {
    set((state) => ({
      comments: [...state.comments, comment],
      posts: state.posts.map(post =>
        post.id === comment.postId
          ? { ...post, comments: (post.comments || 0) + 1 }
          : post
      ),
    }));
  },

  getPostComments: (postId) => {
    const { comments } = get();
    return comments
      .filter(comment => comment.postId === postId)
      .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
  },

  getFilteredPosts: (userSportsCategory) => {
    const { posts } = get();
    return posts.filter(post => 
      post.user?.sportsCategory === userSportsCategory
    ).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  },

  getFilteredUsers: (userSportsCategory) => {
    const { users } = get();
    return users.filter(user => user.sportsCategory === userSportsCategory);
  },

  getUserPosts: (userId) => {
    const { posts } = get();
    return posts.filter(post => post.userId === userId);
  },

  getUserFollowers: () => {
    // TODO: Implement real followers data from API
    return [];
  },

  getUserFollowing: () => {
    // TODO: Implement real following data from API
    return [];
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  getConversations: (userId, userSportsCategory) => {
    const { users, messages } = get();
    const filteredUsers = users.filter(user => 
      (userSportsCategory === 'all' || user.sportsCategory === userSportsCategory) && user.id !== userId
    );
    
    const conversations: Conversation[] = filteredUsers.map(otherUser => {
      const conversationMessages = messages.filter(msg =>
        (msg.senderId === userId && msg.receiverId === otherUser.id) ||
        (msg.senderId === otherUser.id && msg.receiverId === userId)
      );
      
      const lastMessage = conversationMessages.sort((a, b) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      )[0];
      
      const unreadCount = conversationMessages.filter(msg =>
        msg.receiverId === userId && !msg.isRead
      ).length;
      
      return {
        id: `conv-${userId}-${otherUser.id}`,
        participants: [otherUser],
        lastMessage,
        unreadCount,
        updatedAt: lastMessage?.createdAt || new Date().toISOString(),
      };
    });
    
    return conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  addNotification: (notification) => {
    set((state) => ({ notifications: [notification, ...state.notifications] }));
  },

  markNotificationAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ),
    }));
  },

  updateUserInStore: (updatedUser: User) => {
    set((state) => ({
      users: state.users.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      ),
    }));
  },

  followUser: (userId: string, targetUserId: string) => {
    const getFollowCount = (value: number | { count: number } | undefined): number => {
      if (typeof value === 'number') return value;
      if (value && typeof value === 'object' && 'count' in value) return value.count;
      return 0;
    };
    
    set((state) => {
      // Add to following relationship
      const newFollowing = { followerId: userId, followingId: targetUserId };
      const updatedUserFollowing = [...state.userFollowing, newFollowing];
      
      // Update user counts
      const updatedUsers = state.users.map(user => {
        if (user.id === userId) {
          return { ...user, following: getFollowCount(user.following) + 1 };
        }
        if (user.id === targetUserId) {
          return { ...user, followers: getFollowCount(user.followers) + 1 };
        }
        return user;
      });
      
      return { userFollowing: updatedUserFollowing, users: updatedUsers };
    });
  },

  unfollowUser: (userId: string, targetUserId: string) => {
    const getFollowCount = (value: number | { count: number } | undefined): number => {
      if (typeof value === 'number') return value;
      if (value && typeof value === 'object' && 'count' in value) return value.count;
      return 0;
    };
    
    set((state) => {
      // Remove from following relationship
      const updatedUserFollowing = state.userFollowing.filter(
        uf => !(uf.followerId === userId && uf.followingId === targetUserId)
      );
      
      // Update user counts
      const updatedUsers = state.users.map(user => {
        if (user.id === userId) {
          return { ...user, following: Math.max(0, getFollowCount(user.following) - 1) };
        }
        if (user.id === targetUserId) {
          return { ...user, followers: Math.max(0, getFollowCount(user.followers) - 1) };
        }
        return user;
      });
      
      return { userFollowing: updatedUserFollowing, users: updatedUsers };
    });
  },

  isFollowing: (userId: string, targetUserId: string) => {
    const { userFollowing } = get();
    return userFollowing.some(
      uf => uf.followerId === userId && uf.followingId === targetUserId
    );
  },

  // Video functions
  addVideo: (video) => set((state) => ({ videos: [video, ...state.videos] })),

  getVideosByCategory: (category) => {
    const { videos } = get();
    if (category === 'all') return videos;
    return videos.filter(video => video.category === category);
  },

  getVideosByCoach: (coachId) => {
    const { videos } = get();
    return videos.filter(video => video.coachId === coachId);
  },

  likeVideo: (videoId, userId) => {
    const { addTokens } = get();
    
    // Award tokens for liking videos
    addTokens(userId, 2, 'earned', 'Liked video');
    
    set((state) => ({
      videos: state.videos.map(video =>
        video.id === videoId
          ? { 
              ...video, 
              likes: video.isLiked ? video.likes - 1 : video.likes + 1,
              isLiked: !video.isLiked 
            }
          : video
      ),
    }));
  },

  watchVideo: (videoId, userId) => {
    // Award tokens for watching videos
    const { addTokens } = get();
    addTokens(userId, 5, 'earned', 'Watched video');
    
    // Increment view count
    set((state) => ({
      videos: state.videos.map(video =>
        video.id === videoId
          ? { ...video, views: video.views + 1 }
          : video
      ),
    }));
  },

  // Token functions
  getUserTokens: (userId) => {
    const { userTokens } = get();
    let userToken = userTokens.find(ut => ut.userId === userId);
    
    if (!userToken) {
      // Return default token object without triggering state update during render
      userToken = {
        userId,
        balance: 100, // Starting bonus
        totalEarned: 100,
        totalSpent: 0,
        transactions: [{
          id: Date.now().toString(),
          userId,
          type: 'earned',
          amount: 100,
          reason: 'earned',
          description: 'Welcome bonus',
          createdAt: new Date().toISOString(),
        }],
      };
    }
    
    return userToken;
  },

  initializeUserTokens: (userId) => {
    const { userTokens } = get();
    const existingToken = userTokens.find(ut => ut.userId === userId);
    
    if (!existingToken) {
      const newUserToken: UserTokens = {
        userId,
        balance: 100, // Starting bonus
        totalEarned: 100,
        totalSpent: 0,
        transactions: [{
          id: Date.now().toString(),
          userId,
          type: 'earned',
          amount: 100,
          reason: 'earned',
          description: 'Welcome bonus',
          createdAt: new Date().toISOString(),
        }],
      };
      
      set((state) => ({
        userTokens: [...state.userTokens, newUserToken]
      }));
    }
  },

  addTokens: (userId, amount, reason, description) => {
    set((state) => {
      const existingTokenIndex = state.userTokens.findIndex(ut => ut.userId === userId);
      
      const transaction: TokenTransaction = {
        id: Date.now().toString(),
        userId,
        type: reason as 'earned' | 'spent' | 'purchased',
        amount,
        reason,
        description,
        createdAt: new Date().toISOString(),
      };
      
      if (existingTokenIndex >= 0) {
        const updatedTokens = [...state.userTokens];
        updatedTokens[existingTokenIndex] = {
          ...updatedTokens[existingTokenIndex],
          balance: updatedTokens[existingTokenIndex].balance + amount,
          totalEarned: updatedTokens[existingTokenIndex].totalEarned + amount,
          transactions: [transaction, ...updatedTokens[existingTokenIndex].transactions],
        };
        return { userTokens: updatedTokens };
      } else {
        const newUserToken: UserTokens = {
          userId,
          balance: 100 + amount, // Welcome bonus + earned amount
          totalEarned: 100 + amount,
          totalSpent: 0,
          transactions: [transaction],
        };
        return { userTokens: [...state.userTokens, newUserToken] };
      }
    });
  },

  spendTokens: (userId, amount, reason, description) => {
    const { userTokens } = get();
    const userToken = userTokens.find(ut => ut.userId === userId);
    
    if (!userToken || userToken.balance < amount) {
      return false; // Insufficient tokens
    }
    
    set((state) => {
      const transaction: TokenTransaction = {
        id: Date.now().toString(),
        userId,
        type: 'spent',
        amount: -amount,
        reason,
        description,
        createdAt: new Date().toISOString(),
      };
      
      return {
        userTokens: state.userTokens.map(ut =>
          ut.userId === userId
            ? {
                ...ut,
                balance: ut.balance - amount,
                totalSpent: ut.totalSpent + amount,
                transactions: [transaction, ...ut.transactions],
              }
            : ut
        ),
      };
    });
    
    return true;
  },

  purchaseTokens: (userId, amount, price) => {
    const { addTokens } = get();
    addTokens(userId, amount, 'purchased', `Purchased ${amount} tokens for $${price}`);
  },

  // Membership functions
  addMembership: (membership) => set((state) => ({ 
    memberships: [...state.memberships, membership] 
  })),

  getMembershipsByCoach: (coachId) => {
    const { memberships } = get();
    return memberships.filter(membership => membership.coachId === coachId);
  },

  watchAd: (userId: string) => {
    const { addTokens } = get();
    addTokens(userId, 10, 'earned', 'Watched advertisement');
  },

  // Livestream functions
  addLivestream: async (livestreamData) => {
    // This method only updates local state. API calls should be made by the caller.
    set((state) => ({
      livestreams: [livestreamData as unknown as Livestream, ...state.livestreams]
    }));
  },

  getLivestreams: (category) => {
    const { livestreams } = get();
    if (category === 'all') return livestreams;
    return livestreams.filter(stream => stream.category === category);
  },

  // Map and location functions
  addLocationCheckIn: (checkIn) => set((state) => ({
    locationCheckIns: [checkIn, ...state.locationCheckIns]
  })),

  addSafeLocation: (location) => set((state) => ({
    safeLocations: [location, ...state.safeLocations]
  })),

  updateHeatMapData: (data) => set((state) => {
    const existingIndex = state.heatMapData.findIndex(
      item => item.latitude === data.latitude && item.longitude === data.longitude && item.type === data.type
    );
    
    if (existingIndex >= 0) {
      const updatedData = [...state.heatMapData];
      updatedData[existingIndex] = data;
      return { heatMapData: updatedData };
    } else {
      return { heatMapData: [...state.heatMapData, data] };
    }
  }),

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events]
  })),

  getEventsByLocation: (locationId) => {
    const { events } = get();
    return events.filter(event => 
      event.location.latitude && 
      event.location.longitude &&
      event.id === locationId
    );
  },

  getEventsByCategory: (category) => {
    const { events } = get();
    if (category === 'all') return events;
    return events.filter(event => event.category === category);
  },
}));