import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { GoogleAuthButton } from './GoogleAuthButton';
import toast from 'react-hot-toast';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

type LoginFormData = yup.InferType<typeof schema>;

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });


  const onSubmit = useCallback(async (data: LoginFormData) => {
    console.log('Login attempt with:', data.email);
    try {
      await login(data.email, data.password);
      console.log('Login successful');
      toast.success('Welcome back!');
      onLoginSuccess();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials. Please try again.');
    }
  }, [login, onLoginSuccess]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl mb-2 sm:mb-4 shadow-lg"
        >
          <Zap className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
        </motion.div>
        
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 px-2">Welcome Back</h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg px-4">Sign in to continue your journey</p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onSubmit={handleFormSubmit}
        className="space-y-6"
      >
        {/* Email Field */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 px-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="email"
              {...register('email')}
              placeholder="Enter your email"
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          {errors.email && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs sm:text-sm flex items-center space-x-1 px-1"
            >
              <span>⚠</span>
              <span>{errors.email.message}</span>
            </motion.p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 px-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter your password"
              className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors min-h-[44px]"
            >
              {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
          {errors.password && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs sm:text-sm flex items-center space-x-1 px-1"
            >
              <span>⚠</span>
              <span>{errors.password.message}</span>
            </motion.p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
          <label className="flex items-center space-x-1.5 sm:space-x-2 min-h-[44px]">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-gray-700 whitespace-nowrap">Remember me</span>
          </label>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-500 font-medium transition-colors whitespace-nowrap min-h-[44px] px-2"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            type="submit"
            loading={isLoading}
            variant="gradient"
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </motion.div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google Auth */}
        <GoogleAuthButton mode="login" />

        {/* Additional Info */}
        <div className="text-center space-y-2">
          <p className="text-gray-600 text-xs sm:text-sm px-2">
            By signing in, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.form>
    </motion.div>
  );
}