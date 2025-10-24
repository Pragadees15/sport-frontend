import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  X, 
  FileText, 
  Search, 
  Eye, 
  Download, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Clock3
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export function ExpertDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const { user } = useAuthStore();
  const [approved, setApproved] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'aspirant' | 'coach'>('all');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [pendingData, approvedData, rejectedData] = await Promise.all([
        apiService.getPendingVerifications(),
        apiService.getApprovedVerifications(),
        apiService.getRejectedVerifications()
      ]);
      
      console.log('Pending verification data:', pendingData);
      console.log('Sample pending request:', pendingData.requests?.[0]);
      
      setRequests(pendingData.requests || []);
      setApproved(approvedData.requests || []);
      setRejected(rejectedData.requests || []);
    } catch (error) {
      console.error('Error fetching verification data:', error);
      toast.error('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: string, status: 'approved' | 'rejected', comments?: string) => {
    try {
      await apiService.reviewVerificationRequest(requestId, status, comments);
      
      // Move request from pending to appropriate list
      const request = requests.find(r => r.id === requestId);
      if (request) {
        const updatedRequest = { ...request, status, reviewed_at: new Date().toISOString() };
        
        if (status === 'approved') {
          setApproved(prev => [updatedRequest, ...prev]);
        } else {
          setRejected(prev => [updatedRequest, ...prev]);
        }
        
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
      
      toast.success(`Request ${status} successfully`);
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRequests.length === 0) return;
    
    try {
      const promises = selectedRequests.map(id => 
        apiService.reviewVerificationRequest(id, action === 'approve' ? 'approved' : 'rejected')
      );
      
      await Promise.all(promises);
      
      // Move all selected requests
      const selectedRequestObjects = requests.filter(r => selectedRequests.includes(r.id));
      const updatedRequests = selectedRequestObjects.map(r => ({
        ...r, 
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString()
      }));
      
      if (action === 'approve') {
        setApproved(prev => [...updatedRequests, ...prev]);
      } else {
        setRejected(prev => [...updatedRequests, ...prev]);
      }
      
      setRequests(prev => prev.filter(r => !selectedRequests.includes(r.id)));
      setSelectedRequests([]);
      
      toast.success(`${selectedRequests.length} requests ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} requests`);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(req => req.role === roleFilter);
    }
    
    return filtered;
  }, [requests, searchTerm, roleFilter]);

  const pendingCount = requests.length;
  const approvedCount = approved.length;
  const rejectedCount = rejected.length;
  const totalCount = pendingCount + approvedCount + rejectedCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Expert Dashboard</h1>
                <p className="mt-2 text-gray-600">Review and verify user documents</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllData}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                <p className="text-sm text-gray-600">Total Requests</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock3 className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'pending', label: 'Pending', count: pendingCount, icon: Clock3 },
                { id: 'approved', label: 'Approved', count: approvedCount, icon: CheckCircle2 },
                { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search and Filters */}
          {activeTab === 'pending' && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="aspirant">Aspirant</option>
                    <option value="coach">Coach</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedRequests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between"
                >
                  <span className="text-sm text-blue-700">
                    {selectedRequests.length} request{selectedRequests.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleBulkAction('approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('reject')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject All
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRequests([])}
                    >
                      Clear
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Content Area */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'pending' && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No pending verification requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRequests.map((req) => (
                        <motion.div
                          key={req.id}
                          layout
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                              <input
                                type="checkbox"
                                checked={selectedRequests.includes(req.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRequests(prev => [...prev, req.id]);
                                  } else {
                                    setSelectedRequests(prev => prev.filter(id => id !== req.id));
                                  }
                                }}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <Avatar
                                src={req.user?.avatar_url}
                                alt={req.user?.name || 'User'}
                                size="md"
                                name={req.user?.name}
                                userId={req.user?.id}
                              />
                              {/* Debug info - remove in production */}
                              {process.env.NODE_ENV === 'development' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Debug: {req.user?.avatar_url ? 'Has avatar' : 'No avatar'} | 
                                  User: {JSON.stringify(req.user, null, 2)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {req.user?.name || req.user?.email}
                                  </h3>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    req.role === 'aspirant' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {req.role}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Submitted {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Unknown date'}
                                </p>
                                
                                {/* Documents */}
                                {Array.isArray(req.documents) && req.documents.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Documents</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {req.documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center space-x-3">
                                            <FileText className="h-5 w-5 text-gray-500" />
                                            <div>
                                              <div className="text-sm font-medium text-gray-900">{doc.file_name}</div>
                                              <div className="text-xs text-gray-600 capitalize">{doc.document_type}</div>
                                            </div>
                                          </div>
                                          <div className="flex space-x-2">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setShowDocumentModal(doc)}
                                              className="text-blue-600 hover:text-blue-700"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                            <a
                                              href={doc.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 hover:text-blue-700"
                                            >
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {(user?.role === 'admin' || user?.role === 'administrator' || (user?.role === 'coach' && req.role === 'aspirant')) && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleReview(req.id, 'approved')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReview(req.id, 'rejected')}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'approved' && (
                <motion.div
                  key="approved"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {approved.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No approved users yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {approved.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <Avatar
                              src={req.user?.avatar_url}
                              alt={req.user?.name || 'User'}
                              size="md"
                              name={req.user?.name}
                              userId={req.user?.id}
                            />
                            <div>
                              <h3 className="font-medium text-gray-900">{req.user?.name || req.user?.email}</h3>
                              <p className="text-sm text-gray-600">
                                Role: {req.role} • Approved {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                          {(user?.role === 'admin' || user?.role === 'administrator') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiService.deverifyRequest(req.id);
                                  setApproved(prev => prev.filter(r => r.id !== req.id));
                                  setRequests(prev => [{ ...req, status: 'pending' }, ...prev]);
                                  toast.success('User de-verified and request reset');
                                } catch (e) {
                                  toast.error('Failed to de-verify');
                                }
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              De-verify
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'rejected' && (
                <motion.div
                  key="rejected"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {rejected.length === 0 ? (
                    <div className="text-center py-12">
                      <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No rejected users yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rejected.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <Avatar
                              src={req.user?.avatar_url}
                              alt={req.user?.name || 'User'}
                              size="md"
                              name={req.user?.name}
                              userId={req.user?.id}
                            />
                            <div>
                              <h3 className="font-medium text-gray-900">{req.user?.name || req.user?.email}</h3>
                              <p className="text-sm text-gray-600">
                                Role: {req.role} • Rejected {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{showDocumentModal.file_name}</h3>
              <button
                onClick={() => setShowDocumentModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <iframe
                src={showDocumentModal.file_url}
                className="w-full h-96 border-0"
                title={showDocumentModal.file_name}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}