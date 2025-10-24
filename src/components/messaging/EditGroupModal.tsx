import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Camera, Trash2, AlertTriangle, Settings, UserPlus, Crown, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import toast from 'react-hot-toast';

interface Participant {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
    is_verified: boolean;
  };
  role: string;
  joined_at: string;
}

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    name?: string;
    description?: string;
    participants: Participant[];
  };
  onGroupUpdate: () => void;
  onGroupDelete?: () => void;
}

export function EditGroupModal({ isOpen, onClose, conversation, onGroupUpdate, onGroupDelete }: EditGroupModalProps) {
  const { user } = useAuthStore();
  const { getUserFollowers, getUserFollowing } = useAppStore();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [groupName, setGroupName] = useState(conversation.name || '');
  const [groupDescription, setGroupDescription] = useState(conversation.description || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFollowers, setShowFollowers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!user) return null;

  // Check if user is admin of the group
  const userParticipant = conversation.participants.find(p => p.user.id === user.id);
  const isAdmin = userParticipant?.role === 'admin';
  
  console.log('EditGroupModal - User admin check:', {
    userId: user.id,
    userParticipant,
    isAdmin,
    allParticipants: conversation.participants.map(p => ({ id: p.user.id, name: p.user.name, role: p.role }))
  });
  
  if (!isAdmin) {
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
          className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-6 text-lg">
              Only group admins can edit group settings.
            </p>
            <Button onClick={onClose} className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl">
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

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
  const currentParticipantIds = conversation.participants.map(p => p.user.id);

  const filteredUsers = availableUsers.filter(u =>
    !currentParticipantIds.includes(u.id) && (
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setGroupPhotoPreview(previewUrl);
    }
  };

  const removePhoto = () => {
    setGroupPhoto(null);
    if (groupPhotoPreview) {
      URL.revokeObjectURL(groupPhotoPreview);
      setGroupPhotoPreview(null);
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating group:', { conversationId: conversation.id, groupName, groupDescription });
      
      // Update group details
      await apiService.updateConversation(conversation.id, {
        name: groupName,
        description: groupDescription
      });

      // Add new participants if any
      if (selectedUsers.length > 0) {
        console.log('Adding participants:', selectedUsers);
        await apiService.addParticipantsToConversation(conversation.id, {
          participantIds: selectedUsers
        });
      }

      // Upload group photo if selected
      if (groupPhoto) {
        console.log('Uploading group photo');
        const response = await apiService.uploadFile(groupPhoto, 'group-photos', 'group-photo');
        if (response.file?.url) {
          console.log('Photo uploaded, updating conversation with URL:', response.file.url);
          // Update conversation with photo URL
          await apiService.updateConversation(conversation.id, {
            photo_url: response.file.url
          });
        }
      }

      toast.success('Group updated successfully!');
      onGroupUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error(`Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (participantId === user.id) {
      toast.error('You cannot remove yourself from the group');
      return;
    }

    try {
      console.log('Removing participant:', { conversationId: conversation.id, participantId });
      await apiService.removeParticipantFromConversation(conversation.id, participantId);
      toast.success('Participant removed successfully');
      onGroupUpdate();
    } catch (error) {
      console.error('Failed to remove participant:', error);
      toast.error(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setDeleteLoading(true);
      console.log('Deleting group:', conversation.id);
      await apiService.deleteConversation(conversation.id);
      toast.success('Group deleted successfully');
      onClose();
      if (onGroupDelete) {
        onGroupDelete();
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error(`Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
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
        className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-gray-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Edit Group
              </h2>
              <p className="text-sm text-gray-600">Manage group settings and members</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 group"
              title="Delete Group"
            >
              <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 max-h-[calc(85vh-140px)] overflow-y-auto">
          {/* Group Photo Section */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                {groupPhotoPreview ? (
                  <img
                    src={groupPhotoPreview}
                    alt="Group preview"
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-lg">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-2 cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg group-hover:scale-110">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Group Photo</h3>
                <p className="text-gray-600 mb-3">Click the camera icon to add or change the group photo</p>
                {groupPhotoPreview && (
                  <button
                    onClick={removePhoto}
                    className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group Details Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              Group Details
            </h3>
            <div className="space-y-6">
              <Input
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                required
                className="bg-gray-50/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description..."
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-200"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Current Members Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Current Members ({conversation.participants.length})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {conversation.participants.map((participant) => (
                <motion.div 
                  key={participant.user.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200/50 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={participant.user.avatar_url}
                      alt={participant.user.name}
                      name={participant.user.name}
                      size="md"
                      className="ring-2 ring-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">{participant.user.name}</p>
                        {participant.role === 'admin' && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {participant.user.is_verified && (
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            participant.user.role === 'coach' ? 'bg-violet-500' : 'bg-blue-500'
                          }`}>
                            <Shield className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{participant.role}</p>
                    </div>
                  </div>
                  {participant.user.id !== user.id && (
                    <button
                      onClick={() => removeParticipant(participant.user.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                    >
                      <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Add Members Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-green-600" />
              Add Members
            </h3>
            
            <div className="flex space-x-3 mb-6">
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

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              />
            </div>

            {selectedUsers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl mb-6 border border-blue-200/50"
              >
                <p className="text-sm text-blue-700 font-semibold">
                  {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
              </motion.div>
            )}

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
              onClick={handleUpdateGroup} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                'Update Group'
              )}
            </Button>
          </div>
        </div>

      </motion.div>

      {/* Modern Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Group</h3>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
              
              <div className="mb-8">
                <p className="text-gray-700 mb-4 text-center">
                  Are you sure you want to delete <strong>"{conversation.name || 'this group'}"</strong>?
                </p>
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/50 rounded-xl p-4">
                  <p className="text-sm text-red-800 font-semibold mb-2">
                    ⚠️ Warning: This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• All messages in this group</li>
                    <li>• All group settings and photos</li>
                    <li>• All participant data</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-white/80 hover:bg-white border-gray-200 rounded-xl font-semibold"
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteGroup}
                  disabled={deleteLoading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl font-semibold"
                >
                  {deleteLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    'Yes, Delete Group'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
