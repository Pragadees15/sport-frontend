import React, { forwardRef, memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  success?: boolean;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, success, icon, showPasswordToggle, className = '', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type;

    return (
      <div className="w-full space-y-2">
        {label && (
          <motion.label 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </motion.label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-gray-400">
                {icon}
              </div>
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full px-4 py-3 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 text-base ${
              icon ? 'pl-10' : ''
            } ${
              showPasswordToggle ? 'pr-12' : ''
            } ${
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                : success
                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                : isFocused
                ? 'border-blue-500 bg-white focus:ring-blue-500 focus:border-blue-500'
                : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-blue-500'
            } ${className}`}
            {...props}
          />
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
          
          {success && !error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-1 text-red-600 text-sm"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.div>
        )}
        
        {helperText && !error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </motion.p>
        )}
      </div>
    );
  }
));