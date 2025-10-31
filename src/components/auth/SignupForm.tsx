import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Trophy, Heart, ArrowRight, ArrowLeft, CheckCircle, Star, Gift } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { GoogleAuthButton } from './GoogleAuthButton';
import { sportRoles } from '../../data/sportRoles';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password is required'),
  username: yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
  name: yup.string().required('Full name is required'),
  role: yup.string().oneOf(['user', 'coach', 'fan', 'aspirant', 'administrator']).required('Role is required'),
  sportsCategory: yup.string().required('Sports category is required'),
  gender: yup.string().oneOf(['male', 'female', 'other', 'prefer-not-to-say']).required('Gender is required'),
  dateOfBirth: yup.date().max(new Date(), 'Date of birth cannot be in the future').required('Date of birth is required'),
  location: yup.string().max(100, 'Location must be less than 100 characters').optional(),
  bio: yup.string().max(500, 'Bio must be less than 500 characters').optional(),
  accessibilityNeeds: yup.array().of(yup.string()).optional(),
  emergencyContact: yup.object({
    name: yup.string().required('Emergency contact name is required'),
    phone: yup.string().required('Emergency contact phone is required'),
    relationship: yup.string().required('Emergency contact relationship is required')
  }).required('Emergency contact is required'),
  sportRoles: yup.array().of(yup.string()).optional(),
});

type SignupFormData = yup.InferType<typeof schema>;

interface SignupFormProps {
  onSignupSuccess: () => void;
}

type SignupStep = 'role' | 'details' | 'preferences' | 'emergency' | 'account';

export function SignupForm({ onSignupSuccess }: SignupFormProps) {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<'user' | 'coach' | 'fan' | 'aspirant' | 'administrator'>('user');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say'>('prefer-not-to-say');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  const [preferredAccommodations, setPreferredAccommodations] = useState<string[]>([]);
  const [selectedSportRole, setSelectedSportRole] = useState<string>('');
  const [sportInterests, setSportInterests] = useState<string[]>([]);
  const [selectedSportsCategory, setSelectedSportsCategory] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
    relationship: ''
  });
  const { register: registerUser, isLoading } = useAuthStore();
  
  // Get referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      toast.success('Referral code applied! You\'ll get bonus tokens on signup.');
    }
  }, [searchParams]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { role: 'user' },
  });

  // Sync selectedSportsCategory with form
  useEffect(() => {
    setValue('sportsCategory', selectedSportsCategory);
  }, [selectedSportsCategory, setValue]);

  // Sync emergencyContact with form
  useEffect(() => {
    setValue('emergencyContact', emergencyContact);
  }, [emergencyContact, setValue]);


  const onSubmit = async (data: SignupFormData) => {
    try {
      const selectedRoleData = sportRoles.find(r => r.id === selectedSportRole);
      
      const registrationData = {
        ...data,
        dateOfBirth: data.dateOfBirth?.toISOString().split('T')[0], // Convert Date to string
        sportsCategories: [selectedSportsCategory],
        accessibilityNeeds,
        emergencyContact,
        sportRoles: selectedSportRole ? [selectedSportRole] : [],
        sportInterests,
        isProfessional: selectedRoleData?.isProfessional || false,
        verificationStatus: selectedRoleData?.requiresEvidence ? 'pending' : 'approved',
        referralCode: referralCode || undefined, // Include referral code if provided
      };
      
      await registerUser(registrationData);
      
      if (referralCode) {
        toast.success('🎉 Registration successful! You\'ve earned bonus tokens from the referral!');
      } else if (selectedRoleData?.requiresEvidence) {
        toast.success('Registration successful! Please upload your evidence documents for verification.');
      } else {
        toast.success('Registration successful! Your account is ready to use.');
      }
      
      onSignupSuccess();
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    }
  };

  const handleRoleSelect = (role: 'user' | 'coach' | 'fan' | 'aspirant' | 'administrator') => {
    setSelectedRole(role);
    setValue('role', role);
    // Reset sport role and interests when changing roles
    setSelectedSportRole('');
    setSportInterests([]);
  };

  const nextStep = () => {
    const steps: SignupStep[] = ['role', 'details', 'preferences', 'emergency', 'account'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: SignupStep[] = ['role', 'details', 'preferences', 'emergency', 'account'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'role': return 'Choose Your Role';
      case 'details': return 'Personal Details';
      case 'preferences': return 'Preferences & Accessibility';
      case 'emergency': return 'Emergency Contact';
      case 'account': return 'Create Account';
      default: return 'Sign Up';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'role': return 'Tell us about yourself to personalize your experience';
      case 'details': return 'Let us know more about you';
      case 'preferences': return 'Help us make SportsFeed accessible for everyone';
      case 'emergency': return 'Provide emergency contact information for safety';
      case 'account': return 'Create your secure account';
      default: return '';
    }
  };

  const roleOptions = [
    {
      id: 'user',
      title: 'Athlete',
      description: 'Follow coaches and track your progress',
      icon: User,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'coach',
      title: 'Coach',
      description: 'Share knowledge and mentor athletes',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    },
    {
      id: 'fan',
      title: 'Fan',
      description: 'Support and follow your favorite sports',
      icon: Heart,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    {
      id: 'aspirant',
      title: 'Aspirant',
      description: 'Aspiring athlete or professional',
      icon: Trophy,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl mb-2 sm:mb-4 shadow-lg"
        >
          <Star className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </motion.div>
        
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 px-4">{getStepTitle()}</h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg px-4">{getStepDescription()}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto px-4">
        {['role', 'details', 'preferences', 'emergency', 'account'].map((step, index) => (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
              currentStep === step 
                ? 'bg-blue-600 text-white shadow-lg' 
                : ['role', 'details', 'preferences', 'emergency', 'account'].indexOf(currentStep) > index
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {['role', 'details', 'preferences', 'emergency', 'account'].indexOf(currentStep) > index ? (
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < 4 && (
              <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-all duration-300 ${
                ['role', 'details', 'preferences', 'emergency', 'account'].indexOf(currentStep) > index
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'role' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {roleOptions.map((option) => (
                  <motion.div
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect(option.id as any)}
                    className={`p-4 sm:p-6 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedRole === option.id
                        ? `border-blue-500 bg-blue-50 shadow-md`
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center flex-shrink-0`}>
                        <option.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{option.title}</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">{option.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'details' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    {...register('name')}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base bg-white border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {errors.name && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm"
                    >
                      {errors.name.message}
                    </motion.p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    {...register('username')}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {errors.username && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm"
                    >
                      {errors.username.message}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {errors.dateOfBirth && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.dateOfBirth.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Location (Optional)</label>
                <input
                  {...register('location')}
                  placeholder="Enter your location"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {errors.location && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.location.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Bio (Optional)</label>
                <textarea
                  {...register('bio')}
                  placeholder="Tell us about yourself"
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                />
                {errors.bio && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.bio.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Primary Sport</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'coco', label: 'Coco' },
                    { value: 'martial-arts', label: 'Martial Arts' },
                    { value: 'calorie-fight', label: 'Calorie Fight' }
                  ].map((category) => (
                    <label key={category.value} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="sportsCategory"
                        value={category.value}
                        checked={selectedSportsCategory === category.value}
                        onChange={(e) => setSelectedSportsCategory(e.target.value)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-gray-700 text-sm font-medium">{category.label}</span>
                    </label>
                  ))}
                </div>
                {errors.sportsCategory && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.sportsCategory.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Gender Identity</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
                  ].map((option) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedGender(option.value as any);
                        setValue('gender', option.value as any);
                      }}
                      className={`p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        selectedGender === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
                {errors.gender && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.gender.message}
                  </motion.p>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preferences' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Accessibility Needs (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Wheelchair accessible',
                    'Visual impairment support',
                    'Hearing impairment support',
                    'Mobility assistance',
                    'Cognitive support',
                    'Sensory-friendly environment',
                    'Sign language interpreter',
                    'Assistive technology'
                  ].map((need) => (
                    <label key={need} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accessibilityNeeds.includes(need)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAccessibilityNeeds([...accessibilityNeeds, need]);
                          } else {
                            setAccessibilityNeeds(accessibilityNeeds.filter(n => n !== need));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-gray-700 text-sm">{need}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Preferred Accommodations (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Quiet spaces',
                    'Flexible scheduling',
                    'Modified equipment',
                    'Personal assistant',
                    'Transportation assistance',
                    'Dietary accommodations',
                    'Extended time for activities',
                    'One-on-one instruction'
                  ].map((accommodation) => (
                    <label key={accommodation} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferredAccommodations.includes(accommodation)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferredAccommodations([...preferredAccommodations, accommodation]);
                          } else {
                            setPreferredAccommodations(preferredAccommodations.filter(a => a !== accommodation));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-gray-700 text-sm">{accommodation}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'emergency' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Emergency Contact Information</h3>
                <p className="text-gray-600 text-sm">This information is required for safety purposes and will be kept confidential.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                  <input
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
                    placeholder="Full name of emergency contact"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {errors.emergencyContact?.name && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm"
                    >
                      {errors.emergencyContact.name.message}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    value={emergencyContact.phone}
                    onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
                    placeholder="Phone number"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {errors.emergencyContact?.phone && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm"
                    >
                      {errors.emergencyContact.phone.message}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <select
                  value={emergencyContact.relationship}
                  onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="">Select relationship</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse/Partner</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
                {errors.emergencyContact?.relationship && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.emergencyContact.relationship.message}
                  </motion.p>
                )}
              </div>
            </div>
          )}

          {currentStep === 'account' && (
            <div className="space-y-6">
              {/* Referral Code Display */}
              {referralCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900">Referral Code Applied</p>
                      <p className="text-xs text-green-700">Code: <span className="font-mono font-bold">{referralCode}</span></p>
                      <p className="text-xs text-green-600 mt-1">You'll receive 50 bonus tokens on signup! 🎉</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Referral Code Input (if not from URL) */}
              {!referralCode && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Referral Code (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter referral code"
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-mono"
                    />
                    <Gift className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Have a referral code? Enter it to get 50 bonus tokens!</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {errors.confirmPassword && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm"
                  >
                    {errors.confirmPassword.message}
                  </motion.p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <GoogleAuthButton mode="signup" />

              <p className="text-gray-600 text-sm text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500 underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <motion.button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 'role'}
          className={`flex items-center space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-200 ${
            currentStep === 'role'
              ? 'opacity-50 cursor-not-allowed text-gray-400'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </motion.button>

        {currentStep === 'account' ? (
          <motion.button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="flex items-center space-x-1 sm:space-x-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Creating Account...</span>
                <span className="sm:hidden">Creating...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Create</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={nextStep}
            className="flex items-center space-x-1 sm:space-x-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <span>Next</span>
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </motion.button>
        )}
      </div>

      <input type="hidden" {...register('role')} />
      <input type="hidden" {...register('gender')} />
    </motion.div>
  );
}