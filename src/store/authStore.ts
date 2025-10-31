import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  username: string;
  role: 'user' | 'coach' | 'fan' | 'aspirant' | 'administrator';
  sportsCategories?: string[];
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
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
  referralCode?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setAuthenticated: (authenticated: boolean) => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      // Use backend API route for consistent login
      const response = await apiService.login(email, password);
      
      // Also sign in with Supabase for client-side auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        localStorage.setItem('auth_token', data.session.access_token);
      }

      set({ user: response.user, isAuthenticated: true });
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      // Use backend API route for consistent registration
      const response = await apiService.register({
        email: data.email,
        password: data.password,
        name: data.name,
        username: data.username,
        role: data.role,
        sportsCategories: data.sportsCategories,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        location: data.location,
        bio: data.bio,
        accessibilityNeeds: data.accessibilityNeeds,
        emergencyContact: data.emergencyContact,
        sportRoles: data.sportRoles,
        referralCode: data.referralCode,
      });

      // After successful registration, sign in to get the session
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        throw new Error('Registration successful but login failed. Please try logging in manually.');
      }

      if (authData.session) {
        localStorage.setItem('auth_token', authData.session.access_token);
      }

      set({ user: response.user, isAuthenticated: true });
      toast.success('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('auth_token');
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if logout fails
      localStorage.removeItem('auth_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Store the access token for API calls
        if (session.access_token) {
          localStorage.setItem('auth_token', session.access_token);
        }
        
        // Fetch user profile from our database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Failed to fetch user profile:', profileError);
          set({ user: null, isAuthenticated: false });
          return;
        }

        // Check if we need to update the avatar URL from Google metadata
        // ONLY update if user has no avatar or still has a Google avatar (hasn't customized it)
        const googleAvatarUrl = session.user.user_metadata?.avatar_url;
        const currentAvatar = userProfile.avatar_url;
        
        const shouldUpdateAvatar = googleAvatarUrl && 
          googleAvatarUrl.includes('googleusercontent.com') &&
          (
            // User has no avatar yet
            !currentAvatar || 
            // Current avatar is still a Google avatar (hasn't been customized)
            (currentAvatar.includes('googleusercontent.com') && currentAvatar !== googleAvatarUrl)
          );
        
        if (shouldUpdateAvatar) {
          // Update the avatar URL in the database
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              avatar_url: googleAvatarUrl,
              last_login: new Date().toISOString()
            })
            .eq('id', session.user.id);

          if (!updateError) {
            userProfile.avatar_url = googleAvatarUrl;
            console.log('Updated avatar URL from Google metadata:', googleAvatarUrl);
          }
        } else {
          // Just update last login without touching the avatar
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', session.user.id);
        }

        set({ user: userProfile, isAuthenticated: true });
      } else {
        // Clear token if no session
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  setAuthenticated: (authenticated: boolean) => {
    set({ isAuthenticated: authenticated });
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null
    }));
  },
}));