import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Search,
  Shield,
  File,
  SortAsc,
  SortDesc,
  AlertTriangle,
  CheckCircle2,
  XCircle as XCircleIcon,
  User,
  Calendar,
  FileText,
  Award,
  Users
} from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { EvidenceDocument, User as UserType } from '../../types';

interface VerificationDashboardProps {
  onClose: () => void;
}

interface PendingVerification {
  id: string;
  user: UserType;
  evidenceDocuments: EvidenceDocument[];
  submittedAt: string;
  sportRole: any;
}

export function VerificationDashboard({ onClose }: VerificationDashboardProps) {
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const [filter, setFilter] = useState<'all' | 'ai-approved' | 'ai-rejected' | 'manual-review'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // TODO: Fetch pending verifications from API
    const fetchPendingVerifications = async () => {
      try {
        // Replace with actual API call
        // const data = await apiService.getPendingVerifications();
        // setPendingVerifications(data.verifications || []);
        setPendingVerifications([]);
      } catch (error) {
        console.error('Error fetching pending verifications:', error);
        setPendingVerifications([]);
      }
    };

    fetchPendingVerifications();
  }, []);

  const filteredVerifications = pendingVerifications.filter(verification => {
    const matchesSearch = (verification.user.fullName || verification.user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    
    const aiSuggestions = verification.evidenceDocuments.map(doc => doc.aiAnalysis?.suggestedAction);
    const hasApproved = aiSuggestions.includes('approve');
    const hasRejected = aiSuggestions.includes('reject');
    const hasManualReview = aiSuggestions.includes('manual-review');
    
    switch (filter) {
      case 'ai-approved':
        return matchesSearch && hasApproved && !hasRejected && !hasManualReview;
      case 'ai-rejected':
        return matchesSearch && hasRejected;
      case 'manual-review':
        return matchesSearch && hasManualReview;
      default:
        return matchesSearch;
    }
  });

  const handleApprove = async (verificationId: string) => {
    try {
      // TODO: Implement API call to approve verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPendingVerifications(prev => 
        prev.filter(v => v.id !== verificationId)
      );
      
      toast.success('Verification approved successfully!');
      setSelectedVerification(null);
      
    } catch (error) {
      toast.error('Failed to approve verification. Please try again.');
    }
  };

  const handleReject = async (verificationId: string) => {
    try {
      // TODO: Implement API call to reject verification
    await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPendingVerifications(prev => 
        prev.filter(v => v.id !== verificationId)
      );
      
      toast.success('Verification rejected.');
      setSelectedVerification(null);
      
    } catch (error) {
      toast.error('Failed to reject verification. Please try again.');
    }
  };

  const getOverallAISuggestion = (verification: PendingVerification) => {
    const suggestions = verification.evidenceDocuments.map(doc => doc.aiAnalysis?.suggestedAction);
    
    if (suggestions.includes('reject')) return 'reject';
    if (suggestions.includes('manual-review')) return 'manual-review';
    if (suggestions.every(s => s === 'approve')) return 'approve';
    return 'manual-review';
  };

  const getSuggestionColor = (suggestion: string) => {
    switch (suggestion) {
      case 'approve':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manual-review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approve':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'reject':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'manual-review':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFilterStats = () => {
    const total = pendingVerifications.length;
    const aiApproved = pendingVerifications.filter(v => {
      const suggestions = v.evidenceDocuments.map(doc => doc.aiAnalysis?.suggestedAction);
      return suggestions.includes('approve') && !suggestions.includes('reject') && !suggestions.includes('manual-review');
    }).length;
    const aiRejected = pendingVerifications.filter(v => {
      const suggestions = v.evidenceDocuments.map(doc => doc.aiAnalysis?.suggestedAction);
      return suggestions.includes('reject');
    }).length;
    const manualReview = pendingVerifications.filter(v => {
      const suggestions = v.evidenceDocuments.map(doc => doc.aiAnalysis?.suggestedAction);
      return suggestions.includes('manual-review');
    }).length;

    return { total, aiApproved, aiRejected, manualReview };
  };

  const stats = getFilterStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Verification Dashboard</h2>
                <p className="text-blue-100">Review and manage verification requests</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
              title="Close verification dashboard"
              aria-label="Close verification dashboard"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-4 shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg p-4 shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.aiApproved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg p-4 shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.aiRejected}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg p-4 shadow-sm border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Manual Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.manualReview}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b bg-white">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'ai-approved', label: 'AI Approved', count: stats.aiApproved },
                { id: 'ai-rejected', label: 'AI Rejected', count: stats.aiRejected },
                { id: 'manual-review', label: 'Manual Review', count: stats.manualReview }
              ].map((filterOption) => (
                <button
                  key={filterOption.id}
                  onClick={() => setFilter(filterOption.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === filterOption.id
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  {filterOption.label} ({filterOption.count})
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Verification List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredVerifications.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No pending verifications</h3>
              <p className="text-gray-600">All verification requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVerifications.map((verification, index) => {
                const aiSuggestion = getOverallAISuggestion(verification);
                
                return (
                  <motion.div
                    key={verification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedVerification(verification)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img
                            src={verification.user.profileImage || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400'}
                            alt={verification.user.fullName}
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{verification.user.fullName}</h3>
                          <p className="text-sm text-gray-600">{verification.user.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              <Award className="h-4 w-4 inline mr-1" />
                              {verification.sportRole.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              <FileText className="h-4 w-4 inline mr-1" />
                              {verification.evidenceDocuments.length} documents
                            </span>
                            <span className="text-sm text-gray-500">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {new Date(verification.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSuggestionColor(aiSuggestion)}`}>
                            {getStatusIcon(aiSuggestion)}
                            <span className="ml-2 capitalize">{aiSuggestion.replace('-', ' ')}</span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={() => setSelectedVerification(verification)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Verification Detail Modal */}
        {selectedVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedVerification.user.profileImage || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400'}
                      alt={selectedVerification.user.fullName}
                      className="h-16 w-16 rounded-full object-cover border-2 border-white"
                    />
                    <div>
                      <h3 className="text-2xl font-bold">{selectedVerification.user.fullName}</h3>
                      <p className="text-blue-100">{selectedVerification.user.email}</p>
                      <p className="text-blue-200 text-sm">
                        Applying for: {selectedVerification.sportRole.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVerification(null)}
                    className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                    title="Close verification details"
                    aria-label="Close verification details"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {/* Evidence Documents */}
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                    <FileText className="h-6 w-6 mr-2" />
                    Evidence Documents ({selectedVerification.evidenceDocuments.length})
                  </h4>
                  
                  {selectedVerification.evidenceDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100 rounded-full">
                            <File className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{doc.fileName}</p>
                            <p className="text-sm text-gray-600">{doc.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSuggestionColor(doc.aiAnalysis?.suggestedAction || 'manual-review')}`}>
                            {getStatusIcon(doc.aiAnalysis?.suggestedAction || 'manual-review')}
                            <span className="ml-2 capitalize">{doc.aiAnalysis?.suggestedAction || 'pending'}</span>
                          </span>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                      
                      {doc.aiAnalysis && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h5 className="font-medium text-gray-900 mb-2">AI Analysis</h5>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Detected Text:</strong> {doc.aiAnalysis.detectedText}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              <strong>Confidence:</strong> {Math.round(doc.aiAnalysis.confidence * 100)}%
                            </p>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${doc.aiAnalysis.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="bg-gray-50 p-6 border-t">
                <div className="flex space-x-4">
                  <Button
                    onClick={() => handleApprove(selectedVerification.id)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Verification
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedVerification.id)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Verification
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
