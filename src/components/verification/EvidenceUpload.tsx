import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  File, 
  CheckCircle, 
  X, 
  Eye, 
  Trash2,
  AlertCircle,
  FileText,
  Image,
  Shield,
  Award,
  Star,
  Info,
  Trophy
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { EvidenceDocument } from '../../types';

interface EvidenceUploadProps {
  onClose: () => void;
  sportRole?: any;
}

export function EvidenceUpload({ onClose, sportRole }: EvidenceUploadProps) {
  const { user, updateUser } = useAuthStore();
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    
    try {
      const newDocuments: EvidenceDocument[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} is not a supported file type. Please upload JPG, PNG, or PDF files.`);
          continue;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Please upload files smaller than 5MB.`);
          continue;
        }
        
        // TODO: Implement actual file upload to server
        // For now, create a temporary URL for preview
        const tempFileUrl = URL.createObjectURL(file);
        
        const document: EvidenceDocument = {
          id: Date.now().toString() + i,
          userId: user!.id,
          fileName: file.name,
          fileUrl: tempFileUrl,
          documentType: getDocumentType(file.name),
          sportRole: sportRole?.id || '',
          description: `Evidence for ${sportRole?.name || 'sport role'}`,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
          aiAnalysis: {
            confidence: 0,
            detectedText: '',
            suggestedAction: 'manual-review',
            analysisDate: new Date().toISOString(),
          }
        };
        
        newDocuments.push(document);
      }
      
      setUploadedFiles(prev => [...prev, ...newDocuments]);
      toast.success(`${newDocuments.length} file(s) uploaded successfully!`);
      
    } catch (error) {
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentType = (fileName: string): 'certificate' | 'license' | 'award' | 'competition-result' | 'training-record' | 'other' => {
    const name = fileName.toLowerCase();
    if (name.includes('certificate') || name.includes('cert')) return 'certificate';
    if (name.includes('license') || name.includes('lic')) return 'license';
    if (name.includes('award') || name.includes('trophy')) return 'award';
    if (name.includes('competition') || name.includes('result')) return 'competition-result';
    if (name.includes('training') || name.includes('record')) return 'training-record';
    return 'other';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const submitForVerification = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one evidence document.');
      return;
    }
    
    try {
      // Update user with evidence documents
      const updatedUser = {
        ...user!,
        evidenceDocuments: uploadedFiles,
        verificationStatus: 'pending' as const,
        isVerified: false,
      };
      
      updateUser(updatedUser);
      
      toast.success('Evidence submitted for verification! You will be notified once reviewed.');
      onClose();
      
    } catch (error) {
      toast.error('Failed to submit evidence. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'license':
        return <Shield className="h-5 w-5 text-green-500" />;
      case 'award':
        return <Star className="h-5 w-5 text-purple-500" />;
      case 'competition-result':
        return <Trophy className="h-5 w-5 text-orange-500" />;
      case 'training-record':
        return <FileText className="h-5 w-5 text-indigo-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-6 w-6 text-blue-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getUploadProgress = () => {
    const total = uploadedFiles.length;
    const completed = uploadedFiles.filter(f => f.status === 'approved').length;
    const pending = uploadedFiles.filter(f => f.status === 'pending').length;
    const rejected = uploadedFiles.filter(f => f.status === 'rejected').length;
    
    return { total, completed, pending, rejected };
  };

  const progress = getUploadProgress();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Upload Evidence Documents</h2>
                <p className="text-blue-100">Submit your credentials for verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
              title="Close evidence upload"
              aria-label="Close evidence upload"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Sport Role Requirements */}
        {sportRole && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Verification Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">Role</p>
                    <p className="text-blue-700">{sportRole.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">Description</p>
                    <p className="text-blue-700 text-sm">{sportRole.description}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium text-blue-800 mb-2">Required Evidence Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {sportRole.evidenceTypes.map((type: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Stats */}
        {uploadedFiles.length > 0 && (
          <div className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{progress.total}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{progress.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{progress.rejected}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <motion.div
              animate={{ scale: dragActive ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {dragActive ? 'Drop files here' : 'Upload Evidence Documents'}
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Supported formats: JPG, PNG, PDF (Max 5MB each)
            </p>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </>
              )}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Select files to upload"
            />
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6" />
                  <div>
                    <h3 className="text-lg font-bold">Uploaded Documents</h3>
                    <p className="text-green-100">{uploadedFiles.length} file(s) uploaded</p>
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getFileIcon(file.fileName)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{file.fileName}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600 flex items-center">
                                {getDocumentTypeIcon(file.documentType)}
                                <span className="ml-1 capitalize">{file.documentType.replace('-', ' ')}</span>
                              </span>
                              <span className="text-sm text-gray-500">{file.description}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(file.status)}`}>
                                {file.status}
                              </span>
                              {file.aiAnalysis && (
                                <span className="text-xs text-gray-500">
                                  AI Confidence: {Math.round(file.aiAnalysis.confidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(file.fileUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded-full"
                            title="View file"
                            aria-label="View file"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-full"
                            title="Remove file"
                            aria-label="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {file.aiAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2 text-blue-600" />
                            AI Analysis
                          </h5>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Detected Text:</strong> {file.aiAnalysis.detectedText}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              <strong>Suggested Action:</strong> {file.aiAnalysis.suggestedAction}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Confidence:</span>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${file.aiAnalysis.confidence * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(file.aiAnalysis.confidence * 100)}%</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex space-x-4">
            <Button
              onClick={submitForVerification}
              disabled={uploadedFiles.length === 0}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Verification
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Help Section */}
        <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-t">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium mb-1">Important Note</p>
              <p className="text-sm text-yellow-700">
                Your documents will be reviewed by our verification team or AI system. 
                You'll receive a notification once the review is complete. Ensure all documents are clear and authentic.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
