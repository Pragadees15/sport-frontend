
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height, 
  animation = 'pulse' 
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 rounded';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: ''
  };
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded'
  };

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '40px' : '200px')
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="space-y-2">
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} />
          </div>
        </div>
        <Skeleton width={24} height={24} />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="space-y-2">
          <Skeleton width="100%" height={16} />
          <Skeleton width="80%" height={16} />
          <Skeleton width="60%" height={16} />
        </div>
      </div>

      {/* Media placeholder */}
      <Skeleton width="100%" height={256} />

      {/* Actions */}
      <div className="px-4 sm:px-6 py-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <Skeleton width={60} height={32} />
          <Skeleton width={80} height={32} />
          <Skeleton width={60} height={32} />
        </div>
      </div>
    </div>
  );
}

// Comment Skeleton
export function CommentSkeleton() {
  return (
    <div className="flex items-start space-x-3 py-2">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1">
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Skeleton width={80} height={14} />
              <Skeleton variant="circular" width={16} height={16} />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton width="100%" height={14} />
            <Skeleton width="70%" height={14} />
          </div>
          <div className="flex items-center space-x-4 mt-3">
            <Skeleton width={60} height={20} />
            <Skeleton width={40} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
