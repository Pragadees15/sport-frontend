import { useState } from 'react';
import { motion } from 'framer-motion';
import { Reply, Trash2 } from 'lucide-react';
import { Comment } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface CommentCardProps {
  comment: Comment;
  onUpdate?: (updatedComment: Comment) => void;
  onDelete?: (commentId: string) => void;
  onReply?: (parentId: string) => void;
}

export function CommentCard({ comment, onUpdate, onDelete, onReply }: CommentCardProps) {
  const { user } = useAuthStore();
  // Editing disabled
  const [isLoading, setIsLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  // Helper function to extract numeric count from various formats
  const getNumericCount = (count: any): number => {
    if (typeof count === 'number') return count;
    if (typeof count === 'object' && count !== null) {
      if (Array.isArray(count)) {
        return count.length;
      }
      if (count.count !== undefined) {
        return count.count;
      }
    }
    return 0;
  };

  const author = comment.author || comment.user;
  console.log('CommentCard - comment data:', comment); // Debug log
  console.log('CommentCard - author data:', author); // Debug log
  const isOwner = user?.id === comment.author_id;
  const repliesCount = getNumericCount(comment.replies_count) || ((comment as any).replies?.length || 0);
  const hasReplies = repliesCount > 0;

  // Editing disabled per requirements

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsLoading(true);
    try {
      await apiService.deleteComment(comment.id);
      onDelete?.(comment.id);
      toast.success('Comment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = () => {
    onReply?.(comment.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-start space-x-3 py-2"
    >
      <div className="relative">
        <Avatar
          src={author?.avatar_url}
          alt={author?.name || 'User'}
          name={author?.name}
          size="sm"
          className="ring-2 ring-white shadow-sm"
        />
        {/* Online indicator */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-gray-900">
                {author?.name}
              </span>
              {(author?.is_verified || (author as any)?.isVerified) && (
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${(
                    author?.role === 'admin' || author?.role === 'administrator'
                  ) ? 'bg-orange-500' : (author?.role === 'coach' ? 'bg-violet-500' : (author?.role === 'aspirant' ? 'bg-blue-500' : 'bg-blue-500'))}`}
                >
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              {comment.is_edited && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">edited</span>
              )}
            </div>
            
            {isOwner && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-800 leading-relaxed">{comment.content}</p>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
            
            <button
              onClick={handleReply}
              className="flex items-center space-x-1 hover:text-blue-500 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
              disabled={!user}
            >
              <Reply className="h-3 w-3" />
              <span className="font-medium">Reply</span>
            </button>
          </div>
          
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-blue-500 hover:text-blue-600 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 text-xs font-medium"
            >
              {showReplies ? 'Hide' : 'Show'} {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        
        {/* Replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mt-4 pl-6 border-l-2 border-gray-200 space-y-3"
          >
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onReply={onReply}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}