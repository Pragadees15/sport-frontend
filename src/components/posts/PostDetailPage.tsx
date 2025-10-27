import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { PostCard } from './PostCard';
import { apiService } from '../../services/api';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the existing API to get a single post
      if (!id) {
        setError('Post ID is required');
        return;
      }
      const response = await apiService.getPost(id);
      
      if (response.post) {
        // Transform the post data to match the expected format
        const transformedPost = {
          ...response.post,
          // Add convenience fields for media
          mediaUrl: response.post.media_urls && response.post.media_urls.length > 0 ? response.post.media_urls[0] : undefined,
          mediaType: response.post.media_urls && response.post.media_urls.length > 0 ? 
            (() => {
              const url = response.post.media_urls[0];
              const extension = url.split('.').pop()?.toLowerCase();
              if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) return 'video';
              if (['mp3', 'wav', 'ogg', 'webm'].includes(extension || '')) return 'audio';
              return 'image';
            })() : undefined,
          // Add convenience fields for user data
          user: response.post.author,
          userId: response.post.author_id,
          // Add convenience fields for counts
          likes: response.post.likes,
          shares: response.post.shares,
          comments: response.post.comments_count || 0,
          // Add convenience fields for dates
          createdAt: response.post.created_at,
        };
        
        setPost(transformedPost);
      } else {
        setError('Post not found');
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Navigate back to the previous page or home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard/home');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin mx-auto mb-3 sm:mb-4 text-blue-600" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">Loading post...</h2>
          <p className="text-sm sm:text-base text-gray-600">Please wait while we fetch the post details.</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Post Not Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            {error || 'The post you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <button
              onClick={handleBack}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Go Back</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/home')}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            <button
              onClick={handleBack}
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">Post</h1>
            <div className="w-16 sm:w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <PostCard 
            post={post} 
            onDelete={() => {
              // If the post is deleted, redirect to home
              navigate('/dashboard/home');
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
