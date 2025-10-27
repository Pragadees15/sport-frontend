import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, MoreHorizontal, Send, Volume2, X, Trash2 } from 'lucide-react';
import { Post, Comment } from '../../types';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { CommentCard } from './CommentCard';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { PostCardSkeleton, CommentSkeleton } from '../ui/Skeleton';

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuthStore();
  const { updatePostLikes, updatePostShares, addSharedPost, addNotification } = useAppStore();
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  // Memoized helper function to extract numeric count from various formats
  const getNumericCount = useCallback((count: any): number => {
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
  }, []);

  const [likesCount, setLikesCount] = useState(getNumericCount(post.likes || post.likes_count || 0));
  const [sharesCount, setSharesCount] = useState(getNumericCount(post.shares || post.shares_count || 0));
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(getNumericCount(post.comments || post.comments_count || 0));
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const postAuthor = post.user || post.author;
  const isOwner = user?.id === (post.userId || post.author_id);

  // Handle case where postAuthor is null
  if (!postAuthor) {
    console.error('PostCard: postAuthor is null for post:', post);
    return <PostCardSkeleton />;
  }

  // Load comments when comments section is shown
  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const response = await apiService.getPostComments(post.id, {
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'asc'
      });
      
      console.log('Raw comment data from API:', response.comments[0]); // Debug log
      
      // Map comments to ensure consistent structure
      const mappedComments = (response.comments || []).map(comment => ({
        ...comment,
        // Add convenience fields for consistency
        user: comment.author || comment.user,
        userId: comment.author_id,
        postId: comment.post_id,
        likesCount: getNumericCount(comment.likes_count),
        createdAt: comment.created_at,
        // Map replies if they exist
        replies: comment.replies?.map((reply: Comment) => ({
          ...reply,
          user: reply.author || reply.user,
          userId: reply.author_id,
          postId: reply.post_id,
          likesCount: getNumericCount(reply.likes_count),
          createdAt: reply.created_at
        })) || []
      }));
      
      console.log('Mapped comment data:', mappedComments[0]); // Debug log
      
      setComments(mappedComments);
    } catch (error) {
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = useCallback(async () => {
    if (!user) return;
    
    if (isLiking) {
      return; // Prevent multiple simultaneous requests
    }
    
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiking(true);
    // Optimistic update
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      // Call API to like/unlike post
      await apiService.likePost(post.id);
      
      // Update the post in the store
      updatePostLikes(post.id, newLikesCount, newIsLiked);
      
      // Add notification if liking (not unliking) and not own post
      if (newIsLiked && user.id !== (post.userId || post.author_id)) {
        addNotification({
          id: Date.now().toString(),
          userId: post.userId || post.author_id,
          type: 'like',
          message: `${user.name || user.fullName} liked your post`,
          isRead: false,
          createdAt: new Date().toISOString(),
          fromUser: user,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    } finally {
      setIsLiking(false);
    }
  }, [user, isLiking, isLiked, likesCount, post.id, post.userId, post.author_id, updatePostLikes, addNotification]);

  const handleShare = async () => {
    if (!user) return;
    
    if (isSharing) {
      return; // Prevent multiple simultaneous requests
    }
    
    const newSharesCount = sharesCount + 1;
    
    setIsSharing(true);
    // Optimistic update
    setSharesCount(newSharesCount);
    
    try {
      // Call API to share post
      await apiService.sharePost(post.id);
      
      // Update the post in the store
      updatePostShares(post.id, newSharesCount);
      
      // Add to user's shared posts
      addSharedPost(user.id, post.id);
      
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      const postAuthor = post.user || post.author;
      const shareText = `Check out this post by ${postAuthor.name || postAuthor.fullName}: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`;
      
      if (navigator.share) {
        navigator.share({
          title: `Post by ${postAuthor.name || postAuthor.fullName}`,
          text: shareText,
          url: shareUrl,
        }).then(() => {
          toast.success('Post shared successfully!');
        }).catch(() => {
          navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
            toast.success('Post link copied to clipboard!');
          });
        });
      } else {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
          toast.success('Post link copied to clipboard!');
        }).catch(() => {
          toast.success('Post shared!');
        });
      }
      
      // Add notification if not own post
      if (user.id !== (post.userId || post.author_id)) {
        addNotification({
          id: Date.now().toString(),
          userId: post.userId || post.author_id,
          type: 'comment',
          message: `${user.name || user.fullName} shared your post`,
          isRead: false,
          createdAt: new Date().toISOString(),
          fromUser: user,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setSharesCount(sharesCount);
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
    } finally {
      setIsSharing(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;
    
    setIsCommenting(true);
    
    try {
      const response = await apiService.createComment({
        postId: post.id,
        content: newComment,
        parentId: replyingTo || undefined
      });
      
      const newCommentData = {
        ...response.comment,
        // Add convenience fields
        postId: response.comment.post_id,
        userId: response.comment.author_id,
        user: response.comment.author,
        likesCount: getNumericCount(response.comment.likes_count),
        createdAt: response.comment.created_at
      };
      
      if (replyingTo) {
        // Handle reply - update the parent comment's replies
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newCommentData],
              replies_count: (comment.replies_count || 0) + 1
            };
          }
          return comment;
        }));
        setReplyingTo(null);
      } else {
        // Add new top-level comment
        setComments(prev => [...prev, newCommentData]);
        setCommentsCount(prev => prev + 1);
      }
      
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCommentUpdate = (updatedComment: Comment) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === updatedComment.id) {
        return updatedComment;
      }
      // Check replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === updatedComment.id ? updatedComment : reply
          )
        };
      }
      return comment;
    }));
  };

  const handleCommentDelete = (commentId: string) => {
    setComments(prev => {
      // Check if it's a top-level comment
      const isTopLevel = prev.some(comment => comment.id === commentId);
      if (isTopLevel) {
        setCommentsCount(prevCount => prevCount - 1);
        return prev.filter(comment => comment.id !== commentId);
      }
      
      // It's a reply, remove from parent's replies
      return prev.map(comment => ({
        ...comment,
        replies: comment.replies?.filter(reply => reply.id !== commentId) || [],
        replies_count: comment.replies?.some(reply => reply.id === commentId) 
          ? (comment.replies_count || 1) - 1 
          : comment.replies_count
      }));
    });
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    // Focus on comment input (you might want to scroll to it)
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiService.deletePost(post.id);
      toast.success('Post deleted successfully');
      onDelete?.(post.id);
    } catch (error) {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };
  const getVerificationBadge = () => {
    const isVerified = postAuthor.is_verified ?? postAuthor.isVerified;
    if (!isVerified) return null;

    const badgeColor = (postAuthor.role === 'admin' || postAuthor.role === 'administrator')
      ? 'text-orange-500'
      : (postAuthor.role === 'coach' ? 'text-violet-500' : (postAuthor.role === 'aspirant' ? 'text-blue-500' : 'text-blue-500'));

    return (
      <svg className={`w-4 h-4 ${badgeColor}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 sm:mb-6 hover:shadow-md transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Avatar
              src={postAuthor.avatar_url}
              fallbackSrc={postAuthor.profileImage}
              alt={postAuthor.fullName || postAuthor.name || 'User'}
              name={postAuthor.fullName || postAuthor.name}
              size="md"
              className="ring-2 ring-white shadow-sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{postAuthor.username || postAuthor.name || postAuthor.fullName}</h3>
              {getVerificationBadge()}
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 sm:mt-1">
              {post.sports_category && (
                <span className="text-[11px] sm:text-sm text-gray-500 capitalize bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full truncate max-w-[100px] sm:max-w-none">
                  {post.sports_category.replace('-', ' ')}
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-gray-400 truncate">
                {new Date(post.createdAt || post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20 min-w-[140px]"
            >
              {isOwner && (
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Post</span>
                    </>
                  )}
                </button>
              )}
              {!isOwner && (
                <>
                  <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    Report Post
                  </button>
                  <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    Hide Post
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4">
          <p className="text-gray-900 whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words">{post.content}</p>
        </div>
      )}

      {/* Voice Note */}
      {(post as any).audioUrl && (
        <div className="px-4 sm:px-6 pb-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-full shadow-sm">
                <Volume2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-2">Voice Note</p>
                <audio
                  src={(post as any).audioUrl}
                  controls
                  className="w-full h-10 rounded-lg"
                  style={{ maxWidth: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media */}
      {(post.mediaUrl || (post.media_urls && post.media_urls.length > 0)) && (
        <div className="relative">
          {(() => {
            // Get the media URL and type from either convenience fields or backend fields
            const mediaUrl = post.mediaUrl || (post.media_urls && post.media_urls[0]);
            const mediaType = post.mediaType || post.type;
            
            
            if (mediaType === 'video') {
              return (
                <div className="relative group">
                  <video
                    src={mediaUrl}
                    className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
                    controls
                    poster=""
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
              );
            } else if (mediaType === 'audio') {
              return (
                <div className="px-4 sm:px-6 pb-4">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 p-3 rounded-full shadow-sm">
                        <Volume2 className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Audio Content</p>
                        <audio
                          src={mediaUrl}
                          controls
                          className="w-full h-10 rounded-lg"
                          style={{ maxWidth: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Default to image if media type is not detected
              return (
                <div className="relative group overflow-hidden">
                  <img
                    src={mediaUrl}
                    alt="Post content"
                    className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-1.5 sm:space-x-2 transition-all duration-200 disabled:opacity-50 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl min-h-[44px] ${
                isLiked 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Heart className={`h-5 w-5 sm:h-5 sm:w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs sm:text-sm font-medium">{likesCount}</span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl min-h-[44px]"
            >
              <MessageCircle className="h-5 w-5 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">{commentsCount}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-500 hover:text-green-500 hover:bg-green-50 transition-all duration-200 disabled:opacity-50 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl min-h-[44px]"
            >
              <Share className="h-5 w-5 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm font-medium">{sharesCount}</span>
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="border-t border-gray-100 bg-gray-50/50"
        >
          <div className="p-4 sm:p-6">
            {/* Comment Form */}
            {user && (
              <form onSubmit={handleComment} className="mb-6">
                <div className="flex items-start space-x-3">
                  <Avatar
                    src={user.avatar_url}
                    fallbackSrc={user.profileImage}
                    alt={user.fullName || 'User'}
                    name={user.fullName}
                    size="sm"
                    className="ring-2 ring-white shadow-sm"
                  />
                  <div className="flex-1">
                    {replyingTo && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-200">
                        <span className="text-sm font-medium text-blue-700">
                          Replying to comment
                        </span>
                        <button
                           type="button"
                           onClick={() => setReplyingTo(null)}
                           className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-lg hover:bg-blue-100"
                         >
                           <X className="w-4 h-4" />
                         </button>
                      </div>
                    )}
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                      className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white transition-all duration-200"
                      rows={3}
                    />
                    <div className="flex justify-end mt-3">
                      {replyingTo && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100 mr-3 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newComment.trim()}
                        loading={isCommenting}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {replyingTo ? 'Reply' : 'Comment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
            
            {/* Comments Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-700">
                {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
              </h4>
            </div>
            
            {loadingComments ? (
              <div className="space-y-4">
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onUpdate={handleCommentUpdate}
                    onDelete={handleCommentDelete}
                    onReply={handleReply}
                  />
                ))}
                
                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}