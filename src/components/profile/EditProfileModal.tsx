import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Mail, Calendar, Save, Loader2 } from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
  user: UserType;
  onClose: () => void;
}

export function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const { updateUser } = useAuthStore();
  const { updateUserInStore } = useAppStore();
  const [formData, setFormData] = useState({
    fullName: user.fullName || user.name || '',
    username: user.username || '',
    bio: user.bio || '',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState(user.avatar_url || user.profileImage || '');
  const [isLoading, setIsLoading] = useState(false);

  // Optimized input change handler
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Optimized image change handler with better validation
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Enhanced validation
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Optimized form submission with better validation
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Enhanced validation
      if (!formData.fullName.trim()) {
        toast.error('Full name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.username.trim()) {
        toast.error('Username is required');
        setIsLoading(false);
        return;
      }

      if (formData.username.length < 3) {
        toast.error('Username must be at least 3 characters long');
        setIsLoading(false);
        return;
      }

      // Prepare update data
      const updateData: any = {
        name: formData.fullName.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
      };

      // Handle profile image upload if changed
      if (profileImage) {
        try {
          toast.loading('Uploading profile image...', { id: 'image-upload' });
          const uploadResult = await apiService.uploadFile(
            profileImage,
            'profiles',
            'profile,avatar'
          );
          updateData.avatar_url = uploadResult.file.url;
          toast.success('Profile image uploaded successfully!', { id: 'image-upload' });
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          toast.error('Failed to upload image. Saving profile without image.', { id: 'image-upload' });
          // Continue with profile update even if image upload fails
        }
      }

      // Update profile via API
      const updatedUser = await apiService.updateProfile(updateData);
      
      // Update user in auth store
      updateUser({
        ...user,
        name: updatedUser.name || formData.fullName,
        fullName: updatedUser.name || formData.fullName,
        username: updatedUser.username || formData.username,
        bio: updatedUser.bio || formData.bio,
        avatar_url: updatedUser.avatar_url || previewImage,
        profileImage: updatedUser.avatar_url || previewImage,
      });

      // Update user in app store if needed
      if (updateUserInStore) {
        updateUserInStore({
          ...user,
          name: updatedUser.name || formData.fullName,
          fullName: updatedUser.name || formData.fullName,
          username: updatedUser.username || formData.username,
          bio: updatedUser.bio || formData.bio,
          avatar_url: updatedUser.avatar_url || previewImage,
          profileImage: updatedUser.avatar_url || previewImage,
        });
      }

      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, profileImage, previewImage, user, updateUser, updateUserInStore, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="mobile-modal bg-white rounded-none md:rounded-xl lg:rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen md:max-h-[90vh] overflow-y-auto border-0 md:border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">Edit Profile</h2>
                  <p className="text-white/80 text-xs sm:text-sm truncate">Update your personal information</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-white/20 rounded-full flex-shrink-0 ml-2"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            {/* Enhanced Profile Image Section */}
            <div className="text-center">
              <div className="relative inline-block group">
                <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto">
                    <Avatar
                      src={previewImage}
                      alt="Profile"
                      name={user.name || user.fullName}
                      size="xl"
                      className="w-full h-full border-3 sm:border-4 border-white shadow-2xl"
                    />
                  </div>
                  <motion.label
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    htmlFor="profile-image"
                    className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 sm:p-2.5 md:p-3 rounded-full cursor-pointer transition-all duration-200 shadow-lg"
                  >
                    <Camera className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </motion.label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 font-medium px-4">Click the camera icon to change your profile picture</p>
            </div>

            {/* Enhanced Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-semibold text-gray-700">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Full Name</span>
                </label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-semibold text-gray-700">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Username</span>
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-semibold text-gray-700">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Bio</span>
              </label>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself, your interests, and what makes you unique..."
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 text-sm sm:text-base"
                  rows={4}
                  maxLength={200}
                />
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 text-[10px] sm:text-xs text-gray-400 bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                  {formData.bio.length}/200
                </div>
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4 pt-4 sm:pt-6 border-t border-gray-100">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  type="submit"
                  loading={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}