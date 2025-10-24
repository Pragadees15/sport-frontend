import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, 
  UserX, 
  Flag, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  CheckCircle
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface MoreMenuDropdownProps {
  conversationId: string;
  otherUserId?: string;
  isGroup?: boolean;
  isBlocked?: boolean;
  isArchived?: boolean;
  onConversationUpdate?: () => void;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'default' | 'danger' | 'warning';
  disabled?: boolean;
}

export function MoreMenuDropdown({
  conversationId,
  otherUserId,
  isGroup = false,
  isBlocked = false,
  isArchived = false,
  onConversationUpdate,
  onClose
}: MoreMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleBlockUser = async () => {
    if (!otherUserId) return;
    
    setIsLoading(true);
    try {
      await apiService.blockUser(otherUserId);
      toast.success('User blocked successfully');
      onConversationUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!otherUserId) return;
    
    setIsLoading(true);
    try {
      await apiService.unblockUser(otherUserId);
      toast.success('User unblocked successfully');
      onConversationUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportUser = async () => {
    if (!otherUserId) return;
    
    const reason = prompt('Please provide a reason for reporting this user:');
    if (!reason) return;
    
    const description = prompt('Additional details (optional):') || undefined;
    
    setIsLoading(true);
    try {
      await apiService.reportUser(otherUserId, reason, description);
      toast.success('User reported successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to report user:', error);
      toast.error('Failed to report user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = async () => {
    const confirmed = window.confirm('Are you sure you want to clear all messages in this conversation? This action cannot be undone.');
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      await apiService.clearConversation(conversationId);
      toast.success('Conversation cleared successfully');
      onConversationUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      toast.error('Failed to clear conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveConversation = async () => {
    setIsLoading(true);
    try {
      await apiService.archiveConversation(conversationId);
      toast.success('Conversation archived successfully');
      onConversationUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      toast.error('Failed to archive conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchiveConversation = async () => {
    setIsLoading(true);
    try {
      await apiService.unarchiveConversation(conversationId);
      toast.success('Conversation unarchived successfully');
      onConversationUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
      toast.error('Failed to unarchive conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const blockMenuItem: MenuItem = {
    id: 'block',
    label: isBlocked ? 'Unblock User' : 'Block User',
    icon: isBlocked ? <CheckCircle className="h-4 w-4" /> : <UserX className="h-4 w-4" />,
    action: isBlocked ? handleUnblockUser : handleBlockUser,
    variant: (isBlocked ? 'default' : 'danger') as 'default' | 'danger',
    disabled: isLoading
  };

  const reportMenuItem: MenuItem = {
    id: 'report',
    label: 'Report User',
    icon: <Flag className="h-4 w-4" />,
    action: handleReportUser,
    variant: 'warning' as 'warning',
    disabled: isLoading
  };

  const clearMenuItem: MenuItem = {
    id: 'clear',
    label: 'Clear Messages',
    icon: <Trash2 className="h-4 w-4" />,
    action: handleClearConversation,
    variant: 'danger' as 'danger',
    disabled: isLoading
  };

  const archiveMenuItem: MenuItem = {
    id: 'archive',
    label: isArchived ? 'Unarchive' : 'Archive',
    icon: isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />,
    action: isArchived ? handleUnarchiveConversation : handleArchiveConversation,
    variant: 'default' as 'default',
    disabled: isLoading
  };

  const menuItems: MenuItem[] = [
    ...(otherUserId && !isGroup ? [blockMenuItem] : []),
    ...(otherUserId && !isGroup ? [reportMenuItem] : []),
    clearMenuItem,
    archiveMenuItem
  ];

  const getItemStyles = (variant: string) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-700';
      case 'warning':
        return 'text-orange-600 hover:bg-orange-50 hover:text-orange-700';
      default:
        return 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
        title="More options"
      >
        <MoreVertical className="h-5 w-5 text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200/50 backdrop-blur-lg z-50"
          >
            <div className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  disabled={item.disabled}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getItemStyles(item.variant)} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isLoading && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
