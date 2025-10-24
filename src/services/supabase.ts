import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to get the current session
export const getCurrentSession = () => {
  return supabase.auth.getSession();
};

// Helper function to get the current user
export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

// Helper function to sign out
export const signOut = () => {
  return supabase.auth.signOut();
};