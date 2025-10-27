import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Shield, Trophy, Heart, CheckCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface ProfileData {
  role?: 'user' | 'coach' | 'fan' | 'aspirant' | 'administrator';
  bio?: string;
  location?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  sportsCategory: string;
  phone?: string;
}

const SPORTS_CATEGORIES = [
  'Coco',
  'Martial Arts', 
  'Calorie Fight'
];

const ROLE_OPTIONS = [
  {
    id: 'user',
    name: 'User',
    description: 'Follow coaches and interact with the community',
    icon: User,
    color: 'blue'
  },
  {
    id: 'coach',
    name: 'Coach',
    description: 'Create content and teach others',
    icon: Shield,
    color: 'purple'
  },
  {
    id: 'fan',
    name: 'Fan',
    description: 'Support and follow sports activities',
    icon: Heart,
    color: 'green'
  },
  {
    id: 'aspirant',
    name: 'Aspirant',
    description: 'Aspiring athlete or player',
    icon: Trophy,
    color: 'orange'
  },
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Platform administrator with full access',
    icon: Shield,
    color: 'red'
  }
];

export function ProfileCompletion() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    sportsCategory: '',
    bio: '',
    location: '',
    dateOfBirth: '',
    gender: undefined,
    phone: ''
  });

  const handleRoleSelect = (role: ProfileData['role']) => {
    setProfileData(prev => ({ ...prev, role }));
  };

  const handleSportSelect = (sport: string) => {
    setProfileData(prev => ({
      ...prev,
      sportsCategory: sport
    }));
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !profileData.role) {
      toast.error('Please select a role');
      return;
    }
    if (currentStep === 2 && !profileData.sportsCategory) {
      toast.error('Please select a sport category');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (!profileData.role) {
      toast.error('Please select a role');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        role: profileData.role,
        bio: profileData.bio || undefined,
        location: profileData.location || undefined,
        date_of_birth: profileData.dateOfBirth || undefined,
        gender: profileData.gender || undefined,
        sports_categories: [profileData.sportsCategory],
        phone: profileData.phone || undefined
      };

      const updatedUser = await apiService.updateProfile(updateData);

      // Update user in auth store
      setUser(updatedUser);

      toast.success('Profile completed successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error('Failed to complete profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4"
        >
          Choose Your Role
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm sm:text-base md:text-lg text-gray-600"
        >
          Select the role that best describes you in our community
        </motion.p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {ROLE_OPTIONS.map((roleOption, index) => {
          const IconComponent = roleOption.icon;
          const isSelected = profileData.role === roleOption.id;
          const colorClasses = {
            blue: isSelected ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' : 'border-gray-300 hover:border-blue-300 hover:shadow-md',
            purple: isSelected ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100' : 'border-gray-300 hover:border-purple-300 hover:shadow-md',
            green: isSelected ? 'border-green-500 bg-green-50 shadow-lg shadow-green-100' : 'border-gray-300 hover:border-green-300 hover:shadow-md',
            orange: isSelected ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100' : 'border-gray-300 hover:border-orange-300 hover:shadow-md',
            red: isSelected ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100' : 'border-gray-300 hover:border-red-300 hover:shadow-md'
          };
          const iconColorClasses = {
            blue: 'text-blue-600',
            purple: 'text-purple-600',
            green: 'text-green-600',
            orange: 'text-orange-600',
            red: 'text-red-600'
          };
          
          return (
            <motion.div
              key={roleOption.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRoleSelect(roleOption.id as ProfileData['role'])}
              className={`p-4 sm:p-6 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 ${
                colorClasses[roleOption.color as keyof typeof colorClasses]
              }`}
            >
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className={`p-2 sm:p-3 rounded-lg ${
                  isSelected ? 'bg-white shadow-md' : 'bg-gray-50'
                }`}>
                  <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    iconColorClasses[roleOption.color as keyof typeof iconColorClasses]
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-1 sm:mb-2">{roleOption.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{roleOption.description}</p>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-blue-600 font-medium"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Selected
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4"
        >
          Sports Interests
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm sm:text-base md:text-lg text-gray-600"
        >
          Select your primary sport to personalize your experience
        </motion.p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {SPORTS_CATEGORIES.map((sport, index) => (
          <motion.button
            key={sport}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSportSelect(sport)}
            className={`p-4 sm:p-6 border-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
              profileData.sportsCategory === sport
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md text-gray-700 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
              <span className="text-base sm:text-lg font-semibold">{sport}</span>
              {profileData.sportsCategory === sport && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
      
      {profileData.sportsCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-center space-x-2 text-blue-700">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base font-medium">
              Selected: {profileData.sportsCategory}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4"
        >
          Complete Your Profile
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm sm:text-base md:text-lg text-gray-600"
        >
          Add some additional information to complete your profile (optional)
        </motion.p>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us about yourself, your sports background, and what you're looking to achieve..."
            rows={4}
            className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
          />
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, Country"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Your phone number"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              value={profileData.gender || ''}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </motion.div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Enhanced Progress indicator */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 md:p-8 text-white">
            <div className="text-center mb-6 sm:mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4"
              >
                <User className="h-6 w-6 sm:h-8 sm:w-8" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Complete Your Profile</h1>
              <p className="text-sm sm:text-base text-blue-100">Let's set up your account to get the best experience</p>
            </div>
            
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              {[1, 2, 3].map((step) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + step * 0.1 }}
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300 ${
                    step <= currentStep
                      ? 'bg-white text-blue-600 border-white shadow-lg'
                      : 'bg-transparent text-white/60 border-white/40'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold">{step}</span>
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2 sm:h-3">
              <motion.div
                className="bg-white h-2 sm:h-3 rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 3) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
            
            <div className="flex justify-between mt-2 text-xs sm:text-sm text-blue-100">
              <span className="text-center flex-1">Role</span>
              <span className="text-center flex-1">Sports</span>
              <span className="text-center flex-1">Details</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* Step content with enhanced animations */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </motion.div>

            {/* Enhanced Navigation buttons */}
            <motion.div 
              className="flex justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                onClick={handleBack}
                disabled={currentStep === 1}
                whileHover={{ scale: currentStep === 1 ? 1 : 1.02 }}
                whileTap={{ scale: currentStep === 1 ? 1 : 0.98 }}
                className={`px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all duration-200 ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-md hover:shadow-lg'
                }`}
              >
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <span>←</span>
                  <span className="hidden sm:inline">Back</span>
                </span>
              </motion.button>
              
              {currentStep < 3 ? (
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center space-x-1 sm:space-x-2">
                    <span>Next</span>
                    <span>→</span>
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center space-x-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden sm:inline">Completing...</span>
                        <span className="sm:hidden">Wait...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Complete Profile</span>
                        <span className="sm:hidden">Complete</span>
                      </>
                    )}
                  </span>
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}