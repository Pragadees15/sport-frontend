import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, User, Shield, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { getValidAvatarUrl } from '../utils/avatarUtils';
import toast from 'react-hot-toast';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, setAuthenticated } = useAuthStore();
  const [authStep, setAuthStep] = useState<'validating' | 'creating' | 'updating' | 'success' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setAuthStep('validating');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setErrorMessage('Authentication failed. Please try again.');
          setAuthStep('error');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (data.session) {
          const { user } = data.session;
          
          setAuthStep('creating');
          // Persist access token for authenticated API calls
          try {
            localStorage.setItem('auth_token', data.session.access_token);
          } catch (_) {
            // Ignore storage errors (private mode, etc.)
          }
          
          // Check if user profile exists in our database
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          let isNewUser = false;

          if (profileError && profileError.code === 'PGRST116') {
            // User doesn't exist - the trigger should have created it automatically
            // Wait a moment and try to fetch the user profile again
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: retryUserProfile, error: retryError } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();
              
            if (retryError) {
              console.error('User profile still not found after retry:', retryError);
              setErrorMessage('Failed to create user profile. Please try again.');
              setAuthStep('error');
              setTimeout(() => navigate('/auth'), 3000);
              return;
            }
            
            // Update the user profile with Google metadata
            const googleAvatarUrl = getValidAvatarUrl(user.user_metadata?.avatar_url);
            if (googleAvatarUrl) {
              await supabase
                .from('users')
                .update({ 
                  avatar_url: googleAvatarUrl,
                  name: user.user_metadata?.full_name || retryUserProfile.name
                })
                .eq('id', user.id);
            }
            
            isNewUser = true;
          } else if (profileError) {
            console.error('Error fetching user profile:', profileError);
            setErrorMessage('Failed to fetch user profile. Please try again.');
            setAuthStep('error');
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          setAuthStep('updating');
          // Update last login and avatar URL for existing users
          const updateData: any = { last_login: new Date().toISOString() };
          
          const googleAvatarUrl = getValidAvatarUrl(user.user_metadata?.avatar_url);
          
          // Update avatar URL if user has a valid Google avatar and it's different from stored one
          if (googleAvatarUrl && 
              (!userProfile?.avatar_url || userProfile.avatar_url !== googleAvatarUrl)) {
            updateData.avatar_url = googleAvatarUrl;
            console.log('Updating user avatar URL:', googleAvatarUrl);
          }
          
          // Only update if there's something to update
          if (Object.keys(updateData).length > 1) { // More than just last_login
            await supabase
              .from('users')
              .update(updateData)
              .eq('id', user.id);
          }

          // Set user in auth store
          const currentUserProfile = isNewUser ? 
            (await supabase.from('users').select('*').eq('id', user.id).single()).data : 
            userProfile;
            
          const finalUser = currentUserProfile ? {
            ...currentUserProfile,
            // Always use the latest valid Google avatar URL if available
            avatar_url: googleAvatarUrl || currentUserProfile.avatar_url
          } : {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            avatar_url: googleAvatarUrl
          };
          setUser(finalUser);
          setAuthenticated(true);

          setAuthStep('success');
          toast.success(isNewUser ? 'Welcome to SportsFeed!' : 'Welcome back!');
          
          // Redirect users without roles to profile completion, others to dashboard
          setTimeout(() => {
            if (isNewUser || !finalUser.role) {
              navigate('/profile-completion');
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        } else {
          setErrorMessage('No active session found. Please sign in again.');
          setAuthStep('error');
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setErrorMessage('Authentication failed. Please try again.');
        setAuthStep('error');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, setUser, setAuthenticated]);

  const getStepContent = () => {
    switch (authStep) {
      case 'validating':
        return {
          icon: Shield,
          title: 'Validating Session',
          description: 'Verifying your authentication credentials',
          color: 'blue',
          bgColor: 'from-blue-500 to-blue-600'
        };
      case 'creating':
        return {
          icon: User,
          title: 'Setting Up Profile',
          description: 'Creating your personalized experience',
          color: 'purple',
          bgColor: 'from-purple-500 to-purple-600'
        };
      case 'updating':
        return {
          icon: Sparkles,
          title: 'Finalizing Setup',
          description: 'Updating your account information',
          color: 'green',
          bgColor: 'from-green-500 to-green-600'
        };
      case 'success':
        return {
          icon: CheckCircle,
          title: 'Welcome!',
          description: 'Authentication completed successfully',
          color: 'green',
          bgColor: 'from-green-500 to-green-600'
        };
      case 'error':
        return {
          icon: AlertCircle,
          title: 'Authentication Error',
          description: errorMessage,
          color: 'red',
          bgColor: 'from-red-500 to-red-600'
        };
      default:
        return {
          icon: Loader2,
          title: 'Loading...',
          description: 'Please wait',
          color: 'blue',
          bgColor: 'from-blue-500 to-blue-600'
        };
    }
  };

  const stepContent = getStepContent();
  const IconComponent = stepContent.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-gray-200"
      >
        <div className="relative mb-8">
          <motion.div 
            className={`w-20 h-20 bg-gradient-to-r ${stepContent.bgColor} rounded-full flex items-center justify-center mx-auto shadow-lg`}
            animate={{ 
              scale: authStep === 'success' ? [1, 1.1, 1] : 1,
              rotate: authStep === 'validating' || authStep === 'creating' || authStep === 'updating' ? 360 : 0
            }}
            transition={{ 
              scale: { duration: 0.5 },
              rotate: { duration: 2, repeat: authStep === 'validating' || authStep === 'creating' || authStep === 'updating' ? Infinity : 0, ease: "linear" }
            }}
          >
            <IconComponent className="h-8 w-8 text-white" />
          </motion.div>
          
          {authStep === 'success' && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="h-3 w-3 text-white" />
            </motion.div>
          )}
        </div>
        
        <motion.h2 
          className="text-3xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {stepContent.title}
        </motion.h2>
        
        <motion.p 
          className="text-gray-600 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {stepContent.description}
        </motion.p>
        
        {authStep !== 'error' && authStep !== 'success' && (
          <div className="space-y-3">
            <motion.div 
              className="flex items-center justify-center space-x-2 text-sm text-gray-500"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className={`w-2 h-2 bg-${stepContent.color}-500 rounded-full animate-pulse`}></div>
              <span>Processing authentication</span>
            </motion.div>
            <motion.div 
              className="flex items-center justify-center space-x-2 text-sm text-gray-500"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className={`w-2 h-2 bg-${stepContent.color}-500 rounded-full animate-pulse`} style={{ animationDelay: '0.5s' }}></div>
              <span>Setting up your account</span>
            </motion.div>
            <motion.div 
              className="flex items-center justify-center space-x-2 text-sm text-gray-500"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className={`w-2 h-2 bg-${stepContent.color}-500 rounded-full animate-pulse`} style={{ animationDelay: '1s' }}></div>
              <span>Preparing your dashboard</span>
            </motion.div>
          </div>
        )}

        {authStep === 'error' && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Return to Sign In
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}