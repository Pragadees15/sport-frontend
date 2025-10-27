import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText,
  CheckCircle, 
  Clock, 
  Shield, 
  Award, 
  Star,
  AlertCircle,
  Eye,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { useAuthStore } from '../store/authStore';

interface UploadedItem {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export function VerificationPortal() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadedItem[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const roleForRequest = useMemo(() => {
    return (user?.role === 'aspirant' || user?.role === 'coach') ? user.role : 'aspirant';
  }, [user?.role]);

  const loadMy = async () => {
    try {
      const data = await apiService.getMyVerificationRequests();
      setMyRequests(data.requests || []);
    } catch (e) {
      setMyRequests([]);
    }
  };

  useEffect(() => {
    loadMy();
  }, []);

  const createRequest = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const { request } = await apiService.createVerificationRequest(roleForRequest as 'aspirant' | 'coach');
      setRequestId(request.id);
      toast.success('Verification request created');
      await loadMy();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create request');
    } finally {
      setIsCreating(false);
    }
  };

  const detectDocType = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('id')) return 'id';
    if (n.includes('license') || n.includes('lic')) return 'license';
    if (n.includes('cert')) return 'certificate';
    return 'other';
  };

  const onSelectFiles = async (files: FileList | null) => {
    if (!files || !requestId) {
      toast.error('Create a request first');
      return;
    }
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { file: uploaded } = await apiService.uploadFile(file, 'verification', 'verification');
        await apiService.uploadVerificationDocument(requestId, {
          fileUrl: uploaded?.cloudinary_url || uploaded?.url || uploaded?.cloudinaryUrl || '',
          fileName: uploaded?.filename || file.name,
          documentType: detectDocType(file.name)
        });
        setUploads(prev => [
          ...prev,
          {
            id: uploaded?.id || `${Date.now()}_${i}`,
            fileName: uploaded?.filename || file.name,
            fileUrl: uploaded?.cloudinary_url || uploaded?.url || uploaded?.cloudinaryUrl || '',
            documentType: detectDocType(file.name),
            status: 'pending'
          }
        ]);
      }
      toast.success('Document(s) uploaded');
      await loadMy();
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const activeRequest = useMemo(() => {
    return myRequests.find(r => r.id === requestId) || myRequests.find((r: any) => r.status === 'pending');
  }, [myRequests, requestId]);

  const isVerified = user?.is_verified || user?.isVerified;
  const verificationHistory = myRequests.filter((r: any) => r.status === 'approved');


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show different UI for verified users
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 relative overflow-hidden">
        {/* Enhanced background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8"
      >
          {/* Enhanced Verified User Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-6 sm:mb-8 shadow-2xl"
            >
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
              >
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </motion.div>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4"
            >
              🎉 Congratulations! You're Verified
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4"
            >
              Your <span className="font-semibold text-green-600 capitalize">{roleForRequest}</span> verification has been approved. 
              Enjoy your verified status and unlock exclusive features!
            </motion.p>
          </div>

          {/* Verified User Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium">Verification Status</p>
                  <p className="text-xl sm:text-2xl font-bold">Verified ✓</p>
                </div>
                <div className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-full">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">Verified Role</p>
                  <p className="text-xl sm:text-2xl font-bold capitalize">{roleForRequest}</p>
                </div>
                <div className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-full">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium">Verification Date</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {verificationHistory.length > 0 ? 
                      new Date(verificationHistory[0].reviewed_at || verificationHistory[0].created_at).toLocaleDateString() : 
                      'Recently'
                    }
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-white bg-opacity-20 rounded-full">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Verified User Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-6 sm:mb-8"
          >
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 sm:p-6 text-white">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Award className="h-6 w-6 sm:h-8 sm:w-8" />
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Verified User Benefits</h2>
                  <p className="text-xs sm:text-sm text-green-100">Unlock exclusive features and privileges</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">Verified Badge</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Display your verified status</p>
                </div>

                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">Enhanced Credibility</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Build trust with other users</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Verification History */}
          {verificationHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Verification History</h2>
                    <p className="text-blue-100">Your verification journey and achievements</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {verificationHistory.map((request: any, index: number) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">{request.role} Verification</h3>
                          <p className="text-sm text-gray-600">
                            Approved on {new Date(request.reviewed_at || request.created_at).toLocaleDateString()}
                          </p>
                          {request.notes && (
                            <p className="text-sm text-gray-500 mt-1">Notes: {request.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                          Approved
                        </span>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}


          {/* Action Buttons for Verified Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="text-center"
          >
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 border border-green-100">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">What's Next?</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto">
                You're all set! Your verified status gives you access to exclusive features and helps you build credibility in the community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button 
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-sm sm:text-base"
                  onClick={() => navigate('/dashboard/profile')}
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  View Your Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-sm sm:text-base"
                  onClick={() => navigate('/dashboard')}
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8"
      >
        {/* Enhanced Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 sm:mb-8 shadow-2xl"
          >
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
            </motion.div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4"
          >
            Verification Portal
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4"
          >
            Get verified as a <span className="font-semibold text-blue-600 capitalize">{roleForRequest}</span> by uploading your credentials and documents
          </motion.p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Current Role</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">{user?.role}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Requesting Role</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{roleForRequest}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {activeRequest?.status || 'Not Started'}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                {getStatusIcon(activeRequest?.status || 'not-started')}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <Upload className="h-8 w-8" />
                <div>
                  <h2 className="text-xl font-bold">Upload Documents</h2>
                  <p className="text-blue-100">Add your verification documents</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!activeRequest ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Create a verification request first</p>
                  <Button 
                    onClick={createRequest} 
                    loading={isCreating}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Request
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h3>
                    <p className="text-gray-600 mb-4">Drag and drop files here or click to select</p>
                    <input 
                      type="file" 
                      multiple 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      onChange={(e) => onSelectFiles(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Files
                    </label>
                    <p className="text-sm text-gray-500 mt-2">PDF, JPG, PNG up to 10MB each</p>
                  </div>

                  {uploads.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
                      {uploads.map(u => (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-8 w-8 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900">{u.fileName}</p>
                              <p className="text-sm text-gray-600 capitalize">{u.documentType}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(u.status || 'pending')}`}>
                              {u.status || 'pending'}
                            </span>
                            <button className="text-blue-600 hover:text-blue-800">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Uploading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Requests Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8" />
                <div>
                  <h2 className="text-xl font-bold">My Requests</h2>
                  <p className="text-green-100">Track your verification status</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {myRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No verification requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRequests.map((r: any) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 capitalize">{r.role} Verification</h3>
                          <p className="text-sm text-gray-600">
                            Submitted {new Date(r.created_at || r.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(r.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>

                      {Array.isArray(r.documents) && r.documents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Documents ({r.documents.length})</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {r.documents.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-900">{d.file_name}</span>
                                  <span className="text-xs text-gray-500 capitalize">({d.document_type})</span>
                                </div>
                                <a 
                                  href={d.file_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>View</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100"
        >
          <div className="text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help with Verification?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our verification process ensures the authenticity of all users. Upload clear, high-quality images of your documents for faster processing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Upload Documents</h4>
                <p className="text-sm text-gray-600">Submit your certificates, licenses, or ID documents</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Review</h4>
                <p className="text-sm text-gray-600">Our AI system analyzes your documents automatically</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Get Verified</h4>
                <p className="text-sm text-gray-600">Receive your verified status and unlock features</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}


