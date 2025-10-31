import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Youtube, Image, Tag } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiService } from '../../services/api';
import { transformLivestreamFromAPI } from '../../utils/livestreamUtils';
import { UserDebugInfo } from '../debug/UserDebugInfo';
import { toast } from 'react-hot-toast';

interface CreateLivestreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateLivestreamModal: React.FC<CreateLivestreamModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { addLivestream } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    category: 'coco' as 'coco' | 'martial-arts' | 'calorie-fight',
    scheduledTime: '',
    isLive: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a livestream');
      return;
    }

    console.log('Current user:', user);
    console.log('User role:', user.role);
    
    if (user.role !== 'coach') {
      toast.error('Only coaches can create livestreams');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    if (!formData.youtubeUrl.trim()) {
      toast.error('YouTube URL is required');
      return;
    }

    // Validate YouTube URL format
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(formData.youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    if (formData.scheduledTime && new Date(formData.scheduledTime) < new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setIsLoading(true);

    try {
      const livestreamData = {
        title: formData.title,
        description: formData.description,
        youtubeUrl: formData.youtubeUrl,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        category: formData.category,
        scheduledTime: formData.scheduledTime || undefined,
        isLive: formData.isLive,
      };

      console.log('Sending livestream data:', livestreamData);
      const response = await apiService.createLivestream(livestreamData);
      console.log('API response:', response);
      
      // Transform API response to frontend format
      const newLivestream = transformLivestreamFromAPI(response.livestream);

      // Update local UI state immediately
      addLivestream(newLivestream);
      // Notify rest of app to refresh from server
      window.dispatchEvent(new CustomEvent('livestreamCreated', { detail: { id: newLivestream.id } }));
      toast.success('Livestream created successfully!');
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        youtubeUrl: '',
        thumbnailUrl: '',
        category: 'coco',
        scheduledTime: '',
        isLive: false,
      });
    } catch (error) {
      console.error('Error creating livestream:', error);
      console.error('Error details:', error);
      
      // Try to extract error message from response
      let errorMessage = 'Failed to create livestream. Please try again.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message as string;
      } else if (error && typeof error === 'object' && 'details' in error) {
        errorMessage = (error as any).details;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mobile-modal bg-white rounded-none md:rounded-xl shadow-xl w-full max-w-2xl max-h-screen md:max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Create Livestream</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2 min-h-[44px] min-w-[44px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <UserDebugInfo />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter livestream title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your livestream"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Youtube className="w-4 h-4 inline mr-1" />
              YouTube URL *
            </label>
            <Input
              type="url"
              value={formData.youtubeUrl}
              onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="w-4 h-4 inline mr-1" />
              Thumbnail URL (Optional)
            </label>
            <Input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => handleInputChange('thumbnailUrl', e.target.value)}
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="coco">Coco</option>
              <option value="martial-arts">Martial Arts</option>
              <option value="calorie-fight">Calorie Fight</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Scheduled Time (Optional)
            </label>
            <Input
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isLive"
              checked={formData.isLive}
              onChange={(e) => handleInputChange('isLive', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isLive" className="text-sm font-medium text-gray-700">
              Start live immediately
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Creating...' : 'Create Livestream'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};