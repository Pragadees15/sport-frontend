import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Shield, Star, Zap, Heart, ArrowRight, Target, Globe } from 'lucide-react';
import { SignupForm } from '../components/auth/SignupForm';
import { LoginForm } from '../components/auth/LoginForm';

type AuthStep = 'login' | 'signup';

export function AuthPage() {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');

  const renderStep = () => {
    try {
      switch (currentStep) {
        case 'signup':
          return <SignupForm onSignupSuccess={() => setCurrentStep('login')} />;
        default:
          return <LoginForm onLoginSuccess={() => {}} />;
      }
    } catch (error) {
      console.error('Error rendering auth step:', error);
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Form</h3>
          <p className="text-red-600 mb-4">Please refresh the page to try again.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
  };

  const features = [
    {
      icon: Trophy,
      title: "Verified Coaches",
      description: "Learn from certified professionals with verified credentials",
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    {
      icon: Users,
      title: "Global Community",
      description: "Connect with athletes and coaches worldwide",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your data is protected with enterprise-grade security",
      color: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Star,
      title: "Premium Content",
      description: "Access exclusive training materials and courses",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Stay updated with live streams and notifications",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      icon: Heart,
      title: "Supportive Environment",
      description: "Inclusive and welcoming community for all",
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Left Side - Branding */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left space-y-8"
            >
              <div className="space-y-6">
                {/* Logo/Brand */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center lg:justify-start space-x-3 mb-6"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">SportsFeed</span>
                </motion.div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Welcome to{' '}
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                    SportsFeed
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl">
                  The ultimate platform for athletes, coaches, and sports enthusiasts. 
                  Connect, learn, and grow together in a verified community.
                </p>

                {/* Trust indicators */}
                <div className="flex items-center justify-center lg:justify-start space-x-6 text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Secure</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">Global</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">Verified</span>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="group flex items-start space-x-2 sm:space-x-3 bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 hover:bg-white/80 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <div className={`p-1.5 sm:p-2 rounded-lg ${feature.bgColor} group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                      <feature.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${feature.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-0.5 sm:mb-1 truncate">{feature.title}</h3>
                      <p className="text-gray-600 text-[10px] sm:text-xs leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Side - Auth Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Auth Form Container */}
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 p-5 sm:p-6 md:p-8 relative overflow-hidden">
                {/* Step indicator */}
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentStep === 'login' ? 'bg-blue-600 shadow-lg shadow-blue-600/50' : 'bg-gray-300'
                    }`}></div>
                    <div className="w-8 h-0.5 bg-gray-300"></div>
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentStep === 'signup' ? 'bg-blue-600 shadow-lg shadow-blue-600/50' : 'bg-gray-300'
                    }`}></div>
                  </div>
                </div>

                <div className="min-h-[500px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>
                </div>
                
                {/* Toggle */}
                <div className="mt-8 text-center">
                  <div className="bg-gray-50 rounded-2xl p-4 inline-flex">
                    {currentStep === 'login' ? (
                      <p className="text-gray-600 text-sm">
                        Don't have an account?{' '}
                        <button
                          onClick={() => setCurrentStep('signup')}
                          className="text-blue-600 hover:text-blue-500 font-semibold transition-colors duration-200 inline-flex items-center space-x-1 hover:space-x-2"
                        >
                          <span>Sign up</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </p>
                    ) : (
                      <p className="text-gray-600 text-sm">
                        Already have an account?{' '}
                        <button
                          onClick={() => setCurrentStep('login')}
                          className="text-blue-600 hover:text-blue-500 font-semibold transition-colors duration-200 inline-flex items-center space-x-1 hover:space-x-2"
                        >
                          <span>Sign in</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}