import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Video } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface UploadVideoModalProps {
  onClose: () => void;
}

export function UploadVideoModal({ onClose }: UploadVideoModalProps) {
  const { user } = useAuthStore();
  const { addVideo } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: user?.sportsCategory || 'martial-arts',
    difficulty: 'beginner',
    type: 'free',
    tokenCost: 0,
    tags: '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !videoFile || !thumbnailFile) {
      toast.error('Please fill in all required fields and select files');
      return;
    }

    setIsUploading(true);

    try {
      // Upload files to Cloudinary first
      const [thumbnailResult, videoResult] = await Promise.all([
        apiService.uploadFile(thumbnailFile, 'videos/thumbnails', 'video,thumbnail'),
        apiService.uploadFile(videoFile, 'videos', 'video,content')
      ]);
      
      // Get video duration from the uploaded video
      const videoElement = document.createElement('video');
      videoElement.src = videoResult.file.url;
      const duration = await new Promise<number>((resolve) => {
        videoElement.onloadedmetadata = () => {
          resolve(Math.round(videoElement.duration));
        };
        videoElement.onerror = () => resolve(0);
      });

      const videoData = {
        title: formData.title,
        description: formData.description,
        thumbnailUrl: thumbnailResult.file.url,
        videoUrl: videoResult.file.url,
        duration,
        category: formData.category,
        difficulty: formData.difficulty,
        type: formData.type,
        tokenCost: formData.type === 'premium' ? formData.tokenCost : 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      const response = await apiService.createVideo(videoData);
      
      // Add to local store for immediate UI update
      const newVideo = {
        id: response.video.id,
        title: response.video.title,
        description: response.video.description,
        thumbnailUrl: response.video.thumbnail_url,
        videoUrl: response.video.video_url,
        duration: response.video.duration,
        coachId: response.video.coach_id,
        coach: user,
        category: response.video.category,
        difficulty: response.video.difficulty,
        type: response.video.type,
        tokenCost: response.video.token_cost,
        views: response.video.views_count,
        likes: response.video.likes_count,
        isLiked: false,
        tags: response.video.tags,
        createdAt: response.video.created_at,
      };

      addVideo(newVideo);
      toast.success('Video uploaded successfully!');
      onClose();
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="mobile-modal bg-white rounded-none md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen md:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-none md:rounded-t-2xl">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Upload Video</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 ml-2 min-h-[44px] min-w-[44px]"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <Input
              label="Video Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter video title"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your video content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Video File
              </label>
              <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="video-upload"
                  required
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Video className="h-10 w-10 text-gray-400 group-hover:text-blue-500 mx-auto mb-3 transition-colors" />
                  <p className="text-sm text-gray-600 font-medium">
                    {videoFile ? videoFile.name : 'Click to upload video'}
                  </p>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Thumbnail
              </label>
              <div className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-6 text-center transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="thumbnail-upload"
                  required
                />
                <label htmlFor="thumbnail-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 text-gray-400 group-hover:text-purple-500 mx-auto mb-3 transition-colors" />
                  <p className="text-sm text-gray-600 font-medium">
                    {thumbnailFile ? thumbnailFile.name : 'Click to upload thumbnail'}
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="coco">Coco</option>
                <option value="martial-arts">Martial Arts</option>
                <option value="calorie-fight">Calorie Fight</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="free"
                    checked={formData.type === 'free'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  Free
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="premium"
                    checked={formData.type === 'premium'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  Premium
                </label>
              </div>
            </div>

            {formData.type === 'premium' && (
              <Input
                label="Token Cost"
                type="number"
                value={formData.tokenCost}
                onChange={(e) => handleInputChange('tokenCost', parseInt(e.target.value) || 0)}
                placeholder="Enter token cost"
                min="1"
                required
              />
            )}
          </div>

          {/* Tags */}
          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="e.g., warm-up, basics, flexibility"
          />

          {/* Submit */}
          <div className="flex space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isUploading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
            >
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}