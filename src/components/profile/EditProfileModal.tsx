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
        // In a real app, you would upload the image to a storage service
        // For now, we'll use a placeholder URL
        updateData.avatar_url = previewImage;
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                  <p className="text-white/80 text-sm">Update your personal information</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Enhanced Profile Image Section */}
            <div className="text-center">
              <div className="relative inline-block group">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative">
                  <Avatar
                    src={previewImage}
                    alt="Profile"
                    name={user.name || user.fullName}
                    size="xl"
                    className="h-32 w-32 border-4 border-white shadow-2xl"
                  />
                  <motion.label
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    htmlFor="profile-image"
                    className="absolute bottom-2 right-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-full cursor-pointer transition-all duration-200 shadow-lg"
                  >
                    <Camera className="h-5 w-5" />
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
              <p className="text-sm text-gray-500 mt-3 font-medium">Click the camera icon to change your profile picture</p>
            </div>

            {/* Enhanced Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4" />
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

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                  <Mail className="h-4 w-4" />
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

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                <Calendar className="h-4 w-4" />
                <span>Bio</span>
              </label>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself, your interests, and what makes you unique..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                  rows={4}
                  maxLength={200}
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded-full">
                  {formData.bio.length}/200
                </div>
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex space-x-4 pt-6 border-t border-gray-100">
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