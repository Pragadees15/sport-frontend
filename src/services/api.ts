import { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    
    console.log('Current token:', token ? `${token.substring(0, 20)}...` : 'No token');
    
    // Check if token is expired
    if (token && this.isTokenExpired(token)) {
      console.warn('Token is expired, clearing from storage');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
      return {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    console.log('Auth headers:', headers);
    return headers;
  }

  private addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });
      
      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        // Clear expired token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/auth';
        throw new Error('Session expired. Please log in again.');
      }
      
      // Handle validation errors with detailed information
      if (errorData.details && Array.isArray(errorData.details)) {
        const validationErrors = errorData.details.map((detail: any) => 
          `${detail.field}: ${detail.message}`
        ).join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }
      
      throw new Error(errorData.error || 'Request failed');
    }
    return response.json();
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<{ user: User; session: any }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    
    const data = await this.handleResponse<{ user: User; session: any }>(response);
    
    // Store the token
    if (data.session?.access_token) {
      localStorage.setItem('auth_token', data.session.access_token);
    }
    
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    username: string;
    role: string;
    sportsCategories?: string[];
    gender?: string;
    dateOfBirth?: string;
    location?: string;
    bio?: string;
    accessibilityNeeds?: string[];
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    sportRoles?: string[];
  }): Promise<{ user: User; session: any }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    const data = await this.handleResponse<{ user: User; session: any }>(response);
    
    // Store the token
    if (data.session?.access_token) {
      localStorage.setItem('auth_token', data.session.access_token);
    }
    
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(this.addCacheBuster(`${API_BASE_URL}/auth/me`), {
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    
    const data = await this.handleResponse<{ user: User }>(response);
    return data.user;
  }

  // Note: Google OAuth is now handled directly by Supabase on the frontend
  // The googleAuth method has been removed as authentication is managed by Supabase's native OAuth flow

  // User endpoints
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await this.handleResponse<{ users: User[] }>(response);
    return data.users;
  }

  async getUserById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await this.handleResponse<{ user: User }>(response);
    return data.user;
  }

  async getUserByUsername(username: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/username/${username}`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await this.handleResponse<{ user: User }>(response);
    return data.user;
  }

  async followUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/users/follow`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || error.message || 'Failed to follow user';
      
      // Handle specific error cases
      if (response.status === 400) {
        if (errorMessage.includes('already') || errorMessage.includes('duplicate')) {
          throw new Error('You are already following this user');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  async unfollowUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/users/follow/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || error.message || 'Failed to unfollow user';
      
      // Handle specific error cases
      if (response.status === 400) {
        if (errorMessage.includes('not following') || errorMessage.includes('not found')) {
          throw new Error('You are not following this user');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }

  async checkFollowStatus(userId: string): Promise<{ isFollowing: boolean }> {
    const response = await fetch(`${API_BASE_URL}/users/follow-status/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check follow status');
    }
    
    return response.json();
  }

  async checkFollowStatusBatch(userIds: string[]): Promise<{ statuses: Record<string, boolean> }> {
    const response = await fetch(`${API_BASE_URL}/users/follow-status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userIds })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to check follow status' }));
      throw new Error(error.error || 'Failed to check follow status');
    }
    
    return response.json();
  }

  async getUserPosts(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{ posts: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/posts?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ posts: any[]; pagination: any }>(response);
  }

  async getUserSharedPosts(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{ posts: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/shared-posts?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ posts: any[]; pagination: any }>(response);
  }

  async getUserFollowers(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{ followers: User[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/followers?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ followers: User[]; pagination: any }>(response);
  }

  async getUserFollowing(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{ following: User[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}/following?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ following: User[]; pagination: any }>(response);
  }

  // Profile sharing
  async shareProfileByUsername(username: string, message?: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/users/share-profile`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ username, message })
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async getReceivedProfileShares(params?: { page?: number; limit?: number }): Promise<{ shares: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const response = await fetch(`${API_BASE_URL}/users/profile-shares/received?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ shares: any[]; pagination: any }>(response);
  }

  async getSentProfileShares(params?: { page?: number; limit?: number }): Promise<{ shares: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const response = await fetch(`${API_BASE_URL}/users/profile-shares/sent?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ shares: any[]; pagination: any }>(response);
  }

  async updateProfile(profileData: {
    name?: string;
    username?: string;
    role?: string;
    gender?: string;
    date_of_birth?: string;
    phone?: string;
    bio?: string;
    avatar_url?: string;
    location?: string;
    sports_categories?: string[];
    accessibility_needs?: string[];
    emergency_contact?: any;
    privacyMode?: boolean;
    darkMode?: boolean;
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    
    const data = await this.handleResponse<{ user: User }>(response);
    return data.user;
  }

  async getUserStats(userId: string): Promise<{ stats: any; recent_achievements: any[] }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ stats: any; recent_achievements: any[] }>(response);
  }

  async getSuggestedUsers(params?: {
    limit?: number;
    exclude_following?: boolean;
    sports_category?: string;
  }): Promise<{ users: User[] }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/users/suggested?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ users: User[] }>(response);
  }

  async searchUsers(query: string, limit?: number): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/users/search/${encodeURIComponent(query)}?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await this.handleResponse<{ users: User[] }>(response);
    return data.users;
  }

  async getDashboardData(userId: string): Promise<{ dashboard: any }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ dashboard: any }>(response);
  }

  // Posts endpoints
  async getPosts(params?: {
    page?: number;
    limit?: number;
    sportsCategory?: string;
    type?: string;
    authorId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ posts: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/posts?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ posts: any[]; pagination: any }>(response);
  }

  async getPost(postId: string): Promise<{ post: any }> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ post: any }>(response);
  }

  async getHomeFeed(params?: {
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'likes_count' | 'comments_count' | 'shares_count';
    sortOrder?: 'asc' | 'desc';
    feedFilter?: 'my-sport' | 'following' | 'all-sports';
  }): Promise<{ posts: any[]; total: number; hasMore: boolean }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/posts/home?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ posts: any[]; total: number; hasMore: boolean }>(response);
  }

  async createPost(postData: {
    content: string;
    mediaUrls?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(postData),
    });
    
    const data = await this.handleResponse<{ post: any }>(response);
    return data.post;
  }

  async deletePost(postId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async likePost(postId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to like post');
    }
  }

  async sharePost(postId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/share`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share post');
    }
  }

  async getTrendingPosts(params?: {
    limit?: number;
    timeframe?: 'today' | 'week' | 'month';
    sportsCategory?: string;
  }): Promise<{ posts: any[] }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/posts/trending/posts?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ posts: any[] }>(response);
  }

  // Comment endpoints
  async getPostComments(postId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'likes';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ comments: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/comments/post/${postId}?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ comments: any[]; pagination: any }>(response);
  }

  async createComment(commentData: {
    postId: string;
    content: string;
    parentId?: string;
  }): Promise<{ comment: any }> {
    const response = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(commentData),
    });
    
    return this.handleResponse<{ comment: any }>(response);
  }

  async updateComment(commentId: string, content: string): Promise<{ comment: any }> {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    
    return this.handleResponse<{ comment: any }>(response);
  }

  async deleteComment(commentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async likeComment(commentId: string): Promise<{ liked: boolean }> {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ liked: boolean }>(response);
  }

  async getCommentReplies(commentId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'likes';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ replies: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/replies?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ replies: any[]; pagination: any }>(response);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return this.handleResponse<{ status: string; timestamp: string }>(response);
  }

  // Video endpoints
  async getVideos(params?: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    type?: string;
    coachId?: string;
    search?: string;
  }): Promise<{ videos: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/videos?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ videos: any[]; pagination: any }>(response);
  }

  async getVideoById(id: string): Promise<{ video: any }> {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ video: any }>(response);
  }

  async createVideo(videoData: {
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    duration: number;
    category: string;
    difficulty: string;
    type?: string;
    tokenCost?: number;
    tags?: string[];
  }): Promise<{ video: any }> {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(videoData),
    });
    
    return this.handleResponse<{ video: any }>(response);
  }

  async likeVideo(videoId: string): Promise<{ liked: boolean }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ liked: boolean }>(response);
  }

  async watchVideo(videoId: string): Promise<{ isNewView: boolean }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ isNewView: boolean }>(response);
  }

  // Tokens endpoints
  async getTokenBalance(): Promise<{ balance: number }> {
    const response = await fetch(`${API_BASE_URL}/tokens/balance`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ balance: number }>(response);
  }

  async getTokenStats(): Promise<{ stats: { currentBalance: number; totalEarned: number; totalSpent: number } }> {
    const response = await fetch(`${API_BASE_URL}/tokens/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ stats: { currentBalance: number; totalEarned: number; totalSpent: number } }>(response);
  }

  async purchaseTokens(purchaseData: {
    packageId: string;
    paymentMethod: string;
    stripePaymentIntentId?: string;
  }): Promise<{ transaction: any; newBalance: number }> {
    // Filter out undefined values
    const cleanData = Object.fromEntries(
      Object.entries(purchaseData).filter(([_, value]) => value !== undefined)
    );
    
    console.log('Sending purchase request:', cleanData);
    console.log('Auth headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/tokens/purchase`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(cleanData),
    });
    
    console.log('Purchase response status:', response.status);
    console.log('Purchase response headers:', response.headers);
    
    return this.handleResponse<{ transaction: any; newBalance: number }>(response);
  }

  async getReferralCode(): Promise<{ referralCode: string; referralLink: string }> {
    const response = await fetch(`${API_BASE_URL}/tokens/referral-code`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ referralCode: string; referralLink: string }>(response);
  }

  async processReferralSignup(referralCode: string, newUserId: string): Promise<{ message: string; referrerReward: number; newUserReward: number }> {
    const response = await fetch(`${API_BASE_URL}/tokens/referral-signup`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ referralCode, newUserId }),
    });
    
    return this.handleResponse<{ message: string; referrerReward: number; newUserReward: number }>(response);
  }

  async getReferralStats(): Promise<{ stats: { totalReferrals: number; totalEarned: number; referrals: any[] } }> {
    const response = await fetch(`${API_BASE_URL}/tokens/referral-stats`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ stats: { totalReferrals: number; totalEarned: number; referrals: any[] } }>(response);
  }

  // Livestream endpoints
  async getLivestreams(params?: {
    page?: number;
    limit?: number;
    category?: string;
    isLive?: boolean;
    coachId?: string;
  }): Promise<{ livestreams: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/livestreams?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ livestreams: any[]; pagination: any }>(response);
  }

  async getLivestreamById(id: string): Promise<{ livestream: any }> {
    const response = await fetch(`${API_BASE_URL}/livestreams/${id}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ livestream: any }>(response);
  }

  async createLivestream(livestreamData: {
    title: string;
    description: string;
    youtubeUrl: string;
    thumbnailUrl?: string;
    category: string;
    scheduledTime?: string;
    isLive?: boolean;
  }): Promise<{ livestream: any }> {
    const response = await fetch(`${API_BASE_URL}/livestreams`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(livestreamData),
    });
    
    return this.handleResponse<{ livestream: any }>(response);
  }

  async updateLivestream(id: string, updateData: {
    title?: string;
    description?: string;
    youtubeUrl?: string;
    thumbnailUrl?: string;
    category?: string;
    scheduledTime?: string;
    isLive?: boolean;
    isActive?: boolean;
  }): Promise<{ livestream: any }> {
    const response = await fetch(`${API_BASE_URL}/livestreams/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    
    return this.handleResponse<{ livestream: any }>(response);
  }

  async deleteLivestream(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/livestreams/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async updateLivestreamViewers(id: string, viewers: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/livestreams/${id}/viewers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ viewers }),
    });
    
    await this.handleResponse<void>(response);
  }

  // Membership endpoints
  async getMemberships(params?: {
    page?: number;
    limit?: number;
    type?: string;
    isActive?: boolean;
  }): Promise<{ memberships: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/memberships?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ memberships: any[]; pagination: any }>(response);
  }

  async purchaseMembership(purchaseData: {
    membershipId: string;
    paymentMethod: string;
    stripePaymentIntentId?: string;
  }): Promise<{ userMembership: any }> {
    const response = await fetch(`${API_BASE_URL}/memberships/purchase`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(purchaseData),
    });
    
    return this.handleResponse<{ userMembership: any }>(response);
  }

  async getUserMemberships(): Promise<{ activeMemberships: any[]; expiredMemberships: any[] }> {
    const response = await fetch(`${API_BASE_URL}/memberships/user/my-memberships`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ activeMemberships: any[]; expiredMemberships: any[] }>(response);
  }

  async hasMembership(membershipId: string): Promise<{ hasMembership: boolean }> {
    const response = await fetch(`${API_BASE_URL}/memberships/user/has/${membershipId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ hasMembership: boolean }>(response);
  }

  async checkMembershipAccess(type: string): Promise<{ hasAccess: boolean; membership: any }> {
    const response = await fetch(`${API_BASE_URL}/memberships/user/access/${type}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ hasAccess: boolean; membership: any }>(response);
  }

  async createMembership(membershipData: {
    name: string;
    description: string;
    price: number;
    tokenCost: number;
    duration: number;
    features: string[];
    type: string;
    isActive?: boolean;
  }): Promise<{ membership: any }> {
    const response = await fetch(`${API_BASE_URL}/memberships`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(membershipData),
    });
    
    return this.handleResponse<{ membership: any }>(response);
  }

  // Event endpoints
  async getEvents(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    status?: string;
    organizerId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ events: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/events?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ events: any[]; pagination: any }>(response);
  }

  async getEventById(id: string): Promise<{ event: any }> {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ event: any }>(response);
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    category: string;
    type: string;
    startDate: string;
    endDate: string;
    location?: string;
    virtualLink?: string;
    maxParticipants?: number;
    registrationFee?: number;
    tokenCost?: number;
    requiresApproval?: boolean;
    tags?: string[];
    imageUrl?: string;
    requirements?: string[];
  }): Promise<{ event: any }> {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    
    return this.handleResponse<{ event: any }>(response);
  }

  async registerForEvent(eventId: string, registrationData: {
    paymentMethod: string;
    stripePaymentIntentId?: string;
    message?: string;
  }): Promise<{ registration: any }> {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(registrationData),
    });
    
    return this.handleResponse<{ registration: any }>(response);
  }

  async getUserEventRegistrations(): Promise<{ registrations: any[] }> {
    const response = await fetch(`${API_BASE_URL}/events/user/my-registrations`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ registrations: any[] }>(response);
  }

  // Location endpoints
  async checkInToLocation(checkInData: {
    latitude: number;
    longitude: number;
    locationName?: string;
    activity: string;
    duration: number;
    notes?: string;
  }): Promise<{ checkIn: any; tokensEarned: number }> {
    const response = await fetch(`${API_BASE_URL}/locations/checkin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(checkInData),
    });
    
    return this.handleResponse<{ checkIn: any; tokensEarned: number }>(response);
  }

  async getUserCheckIns(params?: {
    page?: number;
    limit?: number;
    activity?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ checkIns: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/locations/checkins?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ checkIns: any[]; pagination: any }>(response);
  }

  async getSafeLocations(params?: {
    page?: number;
    limit?: number;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    isVerified?: boolean;
    search?: string;
  }): Promise<{ locations: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/locations/safe-locations?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ locations: any[]; pagination: any }>(response);
  }

  async createSafeLocation(locationData: {
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    category: string;
    amenities?: string[];
    safetyFeatures?: string[];
    operatingHours?: any;
    contactInfo?: any;
    imageUrls?: string[];
  }): Promise<{ location: any; tokensEarned: number }> {
    const response = await fetch(`${API_BASE_URL}/locations/safe-locations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(locationData),
    });
    
    return this.handleResponse<{ location: any; tokensEarned: number }>(response);
  }

  async updateSafeLocation(id: string, updates: {
    name?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    category?: string;
    amenities?: string[];
    safetyFeatures?: string[];
    operatingHours?: any;
    contactInfo?: any;
    imageUrls?: string[];
    isActive?: boolean;
    isVerified?: boolean;
  }): Promise<{ location: any; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/locations/safe-locations/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse<{ location: any; message?: string }>(response);
  }

  async markSafeLocation(id: string, safetyFeatures: string[]): Promise<{ location: any; tokensEarned: number; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/locations/safe-locations/${id}/mark-safe`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ safetyFeatures }),
    });
    return this.handleResponse<{ location: any; tokensEarned: number; message?: string }>(response);
  }

  async markUnsafeLocation(id: string): Promise<{ message: string; verifications: number }> {
    const response = await fetch(`${API_BASE_URL}/locations/safe-locations/${id}/mark-unsafe`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ message: string; verifications: number }>(response);
  }

  async getHeatMapData(params?: {
    activity?: string;
    startDate?: string;
    endDate?: string;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }): Promise<{ heatMapData: any[] }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'bounds') {
            queryParams.append(key, JSON.stringify(value));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/locations/heatmap?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ heatMapData: any[] }>(response);
  }

  async getUserLocationStats(): Promise<{ stats: any }> {
    const response = await fetch(`${API_BASE_URL}/locations/stats/user`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ stats: any }>(response);
  }

  async getActiveUsersAtLocation(locationId: string, latitude?: number, longitude?: number): Promise<{ activeUsers: any[]; userCount: number; locationId: string }> {
    // Use coordinate-based ID if coordinates are provided, otherwise use original locationId
    let requestLocationId = locationId;
    if (latitude !== undefined && longitude !== undefined) {
      requestLocationId = `${Math.round(latitude * 10000)}_${Math.round(longitude * 10000)}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/locations/active-users/${requestLocationId}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ activeUsers: any[]; userCount: number; locationId: string }>(response);
  }

  // Notification preferences
  async getNotificationPreferences(): Promise<{ preferences: any }> {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ preferences: any }>(response);
  }

  async updateNotificationPreferences(preferences: any): Promise<{ preferences: any }> {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(preferences),
    });
    
    return this.handleResponse<{ preferences: any }>(response);
  }

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number; type?: string; read?: boolean }): Promise<{ notifications: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/notifications?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ notifications: any[]; pagination: any }>(response);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async markMultipleNotificationsAsRead(notificationIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ notificationIds }),
    });
    
    await this.handleResponse<void>(response);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async deleteAllNotifications(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    const response = await fetch(`${API_BASE_URL}/notifications/unread/count`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ unreadCount: number }>(response);
  }

  async getNotificationStats(): Promise<{ stats: any }> {
    const response = await fetch(`${API_BASE_URL}/notifications/stats`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ stats: any }>(response);
  }

  // Messages
  async getMessages(params?: { conversationId?: string; page?: number; limit?: number; before?: string }): Promise<{ messages: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/messages?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ messages: any[]; pagination: any }>(response);
  }

  async sendMessage(data: { conversationId: string; content: string; type?: string; mediaUrl?: string }): Promise<{ message: any }> {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    // Backend returns { success, message: 'Message sent successfully', data }
    const res = await this.handleResponse<any>(response);
    return { message: res.data ?? res.message };
  }

  async editMessage(messageId: string, content: string): Promise<{ message: any }> {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    
    // Backend returns { success, message: 'Message updated successfully', data }
    const res = await this.handleResponse<any>(response);
    return { message: res.data ?? res.message };
  }

  async deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  // Conversations
  async getConversations(params?: { page?: number; limit?: number; search?: string }): Promise<{ conversations: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/conversations?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ conversations: any[]; pagination: any }>(response);
  }

  async getConversation(conversationId: string): Promise<{ conversation: any }> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ conversation: any }>(response);
  }

  async createConversation(data: { type: 'direct' | 'group'; participantIds: string[]; name?: string; description?: string }): Promise<{ conversation: any }> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Special handling: backend may return 400 with existing conversationId
      const errorData = await response.json().catch(() => ({}));
      if (errorData?.conversationId) {
        return { conversation: { id: errorData.conversationId } } as any;
      }
      // Fallback to default error handling
      const text = errorData?.error || 'Request failed';
      throw new Error(text);
    }

    return this.handleResponse<{ conversation: any }>(response);
  }

  async updateConversation(conversationId: string, data: { name?: string; description?: string; isPrivate?: boolean; photo_url?: string }): Promise<{ conversation: any }> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<{ conversation: any }>(response);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async addParticipants(conversationId: string, participantIds: string[]): Promise<{ conversation: any }> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/participants`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ participantIds }),
    });
    
    return this.handleResponse<{ conversation: any }>(response);
  }

  async removeParticipant(conversationId: string, participantId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/participants/${participantId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async leaveConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/leave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async addParticipantsToConversation(conversationId: string, data: { participantIds: string[] }): Promise<{ addedCount: number }> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/participants`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<{ addedCount: number }>(response);
  }

  async removeParticipantFromConversation(conversationId: string, participantId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/participants/${participantId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  // Discover endpoints
  async getDiscoverContent(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: 'users' | 'posts' | 'events' | 'locations' | 'videos' | 'all';
    sportsCategory?: string;
    location?: string;
    verified?: boolean;
    sortBy?: 'recent' | 'popular' | 'trending' | 'relevant';
  }): Promise<{ data: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/discover?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ data: any }>(response);
  }

  async getTrendingContent(params?: {
    limit?: number;
    timeframe?: 'day' | 'week' | 'month';
    category?: 'posts' | 'users' | 'events' | 'locations' | 'all';
  }): Promise<{ trending: any; timeframe: string; generated_at: string }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/discover/trending?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ trending: any; timeframe: string; generated_at: string }>(response);
  }

  async getRecommendations(params?: {
    limit?: number;
    type?: 'users' | 'posts' | 'events' | 'locations' | 'all';
  }): Promise<{ recommendations: any; user_preferences: any; generated_at: string }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/discover/recommendations?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ recommendations: any; user_preferences: any; generated_at: string }>(response);
  }

  async getDiscoverStats(): Promise<{ stats: any; generated_at: string }> {
    const response = await fetch(`${API_BASE_URL}/discover/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ stats: any; generated_at: string }>(response);
  }

  // Generic HTTP methods for additional endpoints
  async get<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(this.addCacheBuster(`${API_BASE_URL}${endpoint}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<T>(response);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  // Verification endpoints
  async createVerificationRequest(role: 'aspirant' | 'coach', notes?: string): Promise<{ request: any }> {
    const response = await fetch(`${API_BASE_URL}/verification/requests`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role, notes })
    });
    return this.handleResponse<{ request: any }>(response);
  }

  async uploadVerificationDocument(requestId: string, params: { fileUrl: string; fileName: string; documentType: string }): Promise<{ document: any }> {
    const response = await fetch(`${API_BASE_URL}/verification/requests/${requestId}/documents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params)
    });
    return this.handleResponse<{ document: any }>(response);
  }

  async getMyVerificationRequests(): Promise<{ requests: any[] }> {
    const response = await fetch(`${API_BASE_URL}/verification/my`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ requests: any[] }>(response);
  }

  async getPendingVerifications(): Promise<{ requests: any[] }> {
    const response = await fetch(`${API_BASE_URL}/verification/pending`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ requests: any[] }>(response);
  }

  async getApprovedVerifications(): Promise<{ requests: any[] }> {
    const response = await fetch(`${API_BASE_URL}/verification/approved`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ requests: any[] }>(response);
  }

  async getRejectedVerifications(): Promise<{ requests: any[] }> {
    const response = await fetch(`${API_BASE_URL}/verification/rejected`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ requests: any[] }>(response);
  }

  async reviewVerificationRequest(id: string, status: 'approved' | 'rejected', notes?: string): Promise<{ request: any }> {
    const response = await fetch(`${API_BASE_URL}/verification/requests/${id}/review`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, notes })
    });
    return this.handleResponse<{ request: any }>(response);
  }

  async deverifyRequest(id: string): Promise<{ request: any }> {
    const response = await fetch(`${API_BASE_URL}/verification/requests/${id}/deverify`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ request: any }>(response);
  }

  // Upload endpoints
  async uploadFile(file: File, folder: string = 'general', tags: string = ''): Promise<{ file: any }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('tags', tags);

    const response = await fetch(`${API_BASE_URL}/upload/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });

    return this.handleResponse<{ file: any }>(response);
  }

  async uploadMultipleFiles(files: File[], folder: string = 'general', tags: string = ''): Promise<{ files: any[] }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('folder', folder);
    formData.append('tags', tags);

    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });

    return this.handleResponse<{ files: any[] }>(response);
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });

    return this.handleResponse<{ avatarUrl: string }>(response);
  }

  async getMyUploads(params?: {
    page?: number;
    limit?: number;
    type?: string;
    folder?: string;
  }): Promise<{ uploads: any[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/upload/my-uploads?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ uploads: any[]; pagination: any }>(response);
  }

  async deleteUpload(uploadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/upload/${uploadId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<void>(response);
  }

  // User presence methods
  async updateUserPresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/presence`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    await this.handleResponse<void>(response);
  }

  async getOnlineUsers(): Promise<{ users: string[] }> {
    const response = await fetch(`${API_BASE_URL}/users/online`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ users: string[] }>(response);
  }

  async getUserPresence(userId: string): Promise<{ status: 'online' | 'away' | 'busy' | 'offline'; lastSeen?: string }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/presence`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ status: 'online' | 'away' | 'busy' | 'offline'; lastSeen?: string }>(response);
  }

  // Messaging actions
  async blockUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messaging/block`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    await this.handleResponse<void>(response);
  }

  async unblockUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messaging/unblock`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    await this.handleResponse<void>(response);
  }

  async reportUser(userId: string, reason: string, description?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messaging/report`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId, reason, description }),
    });

    await this.handleResponse<void>(response);
  }

  async clearConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/clear`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<void>(response);
  }

  async archiveConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/archive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<void>(response);
  }

  async unarchiveConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/unarchive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse<void>(response);
  }

  async getBlockedUsers(): Promise<{ users: any[] }> {
    const response = await fetch(`${API_BASE_URL}/messaging/blocked`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ users: any[] }>(response);
  }
}

export const apiService = new ApiService();
export default apiService;