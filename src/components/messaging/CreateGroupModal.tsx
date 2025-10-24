import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; memberIds: string[] }) => Promise<void>;
}

export function CreateGroupModal({ isOpen, onClose, onCreateGroup }: CreateGroupModalProps) {
  const { user } = useAuthStore();
  const { getUserFollowers, getUserFollowing } = useAppStore();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFollowers, setShowFollowers] = useState(true);

  if (!user) return null;

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [fRes, gRes] = await Promise.all([
          apiService.getUserFollowers(user.id, { page: 1, limit: 50 }),
          apiService.getUserFollowing(user.id, { page: 1, limit: 50 })
        ]);
        if (isMounted) {
          setFollowers(fRes.followers || []);
          setFollowing(gRes.following || []);
        }
      } catch (e) {
        // fallback to store-based lists if API fails
        if (isMounted) {
          setFollowers(getUserFollowers(user.id) || []);
          setFollowing(getUserFollowing(user.id) || []);
        }
      }
    };
    if (isOpen) fetchData();
    return () => { isMounted = false; };
  }, [isOpen, user?.id]);
  const availableUsers = showFollowers ? followers : following;

  const filteredUsers = availableUsers.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      await onCreateGroup({
        name: groupName,
        memberIds: selectedUsers
      });
      toast.success(`Group "${groupName}" created with ${selectedUsers.length} members!`);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-green-50/50 to-blue-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Group</h2>
              <p className="text-sm text-gray-600">Start a new group conversation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Name Section */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/50 shadow-sm">
            <Input
              label="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              required
              className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* User Selection Tabs */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFollowers(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                showFollowers
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setShowFollowers(false)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !showFollowers
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Following ({following.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Selected Users Indicator */}
          {selectedUsers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50"
            >
              <p className="text-sm text-blue-700 font-semibold">
                {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
              </p>
            </motion.div>
          )}

          {/* User List */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            <AnimatePresence>
              {filteredUsers.map((targetUser, index) => (
                <motion.div
                  key={targetUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleUserSelection(targetUser.id)}
                  className={`flex items-center space-x-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedUsers.includes(targetUser.id)
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(targetUser.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <Avatar
                    src={targetUser.avatar_url}
                    alt={targetUser.name || 'User'}
                    name={targetUser.name}
                    size="md"
                    className="ring-2 ring-white shadow-sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-gray-900">{targetUser.name}</p>
                      {targetUser.is_verified && (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          targetUser.role === 'coach' ? 'bg-violet-500' : 'bg-blue-500'
                        }`}>
                          <Shield className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    {targetUser.username && (
                      <p className="text-sm text-gray-600">@{targetUser.username}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Modern Footer */}
        <div className="p-6 pt-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-t border-gray-200/50">
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 bg-white/80 hover:bg-white border-gray-200 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl font-semibold"
            >
              Create Group
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
