import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Clock, 
  Eye, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  File,
  Shield,
  Award,
  Star
} from 'lucide-react';
import { Button } from '../ui/Button';
import { VerificationDocument } from '../../types';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  onUploadComplete: () => void;
  isVerified?: boolean;
}

export function DocumentUpload({ onUploadComplete, isVerified = false }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState<'certificate' | 'id' | 'license' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, documentType: 'certificate' | 'id' | 'license') => {
    setUploading(true);
    
    try {
      // TODO: Implement actual file upload API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newDocument: VerificationDocument = {
        id: Date.now().toString(),
        userId: '1',
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        documentType,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
      };
      
      setDocuments(prev => [...prev, newDocument]);
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

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
      const file = e.dataTransfer.files[0];
      const documentType = detectDocumentType(file.name);
      handleFileUpload(file, documentType);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const documentType = detectDocumentType(file.name);
      handleFileUpload(file, documentType);
    }
  };

  const detectDocumentType = (fileName: string): 'certificate' | 'id' | 'license' => {
    const name = fileName.toLowerCase();
    if (name.includes('id') || name.includes('passport') || name.includes('driver')) return 'id';
    if (name.includes('license') || name.includes('lic')) return 'license';
    return 'certificate';
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
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

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="h-6 w-6 text-blue-500" />;
      case 'id':
        return <Shield className="h-6 w-6 text-green-500" />;
      case 'license':
        return <Star className="h-6 w-6 text-purple-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getDocumentTypeInfo = (type: string) => {
    switch (type) {
      case 'certificate':
        return {
          title: 'Certificate',
          description: 'Professional certificates, diplomas, or awards',
          color: 'blue',
          icon: Award
        };
      case 'id':
        return {
          title: 'ID Document',
          description: 'Government-issued ID, passport, or driver\'s license',
          color: 'green',
          icon: Shield
        };
      case 'license':
        return {
          title: 'License',
          description: 'Professional licenses or permits',
          color: 'purple',
          icon: Star
        };
      default:
        return {
          title: 'Document',
          description: 'Other supporting documents',
          color: 'gray',
          icon: File
        };
    }
  };

  const handleDownloadCertificates = () => {
    // Generate a comprehensive certificate with all verified documents
    const certificateData = {
      userName: 'Verified User', // This would come from props in a real implementation
      documents: documents.filter(doc => doc.status === 'approved'),
      verificationDate: new Date().toLocaleDateString(),
      verifiedBy: 'Sport Platform Verification System'
    };

    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Certificate</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .certificate { border: 3px solid #10b981; padding: 40px; text-align: center; }
          .header { color: #10b981; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
          .content { font-size: 18px; margin: 20px 0; }
          .documents { margin: 20px 0; text-align: left; }
          .document-item { margin: 10px 0; padding: 10px; background: #f0f9ff; border-radius: 5px; }
          .signature { margin-top: 40px; }
          .date { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">🏆 VERIFICATION CERTIFICATE</div>
          <div class="content">
            This certifies that<br>
            <strong>${certificateData.userName}</strong><br>
            has been verified with the following documents:
          </div>
          <div class="documents">
            ${certificateData.documents.map(doc => `
              <div class="document-item">
                <strong>${doc.documentType.toUpperCase()}:</strong> ${doc.fileName}
              </div>
            `).join('')}
          </div>
          <div class="signature">
            <div>Verified by: ${certificateData.verifiedBy}</div>
            <div class="date">Date: ${certificateData.verificationDate}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-certificate-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Certificate downloaded successfully!');
  };

  const handleViewDocuments = () => {
    // Open a modal or navigate to a documents view
    if (documents.length > 0) {
      // Create a simple documents viewer
      const documentsHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Your Verified Documents</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .document { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
            .document-header { font-weight: bold; color: #10b981; margin-bottom: 10px; }
            .document-info { color: #666; }
          </style>
        </head>
        <body>
          <h1>Your Verified Documents</h1>
          ${documents.map(doc => `
            <div class="document">
              <div class="document-header">${doc.documentType.toUpperCase()}</div>
              <div class="document-info">
                <strong>File:</strong> ${doc.fileName}<br>
                <strong>Status:</strong> ${doc.status}<br>
                <strong>Uploaded:</strong> ${new Date(doc.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          `).join('')}
        </body>
        </html>
      `;

      const blob = new Blob([documentsHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } else {
      toast('No documents available to view.', { icon: 'ℹ️' });
    }
  };

  // Show different UI for verified users
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto p-6"
        >
          {/* Verified User Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-6 shadow-lg"
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              🎉 You're Already Verified!
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Your documents have been verified and approved. You can manage your verified documents here.
            </motion.p>
          </div>

          {/* Verified User Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8"
          >
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <Award className="h-8 w-8" />
                <div>
                  <h3 className="text-2xl font-bold">Verified Document Management</h3>
                  <p className="text-green-100">Manage your verified documents and certificates</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Verified Status</h4>
                  <p className="text-sm text-gray-600">All your documents have been verified and approved</p>
                </div>

                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure Storage</h4>
                  <p className="text-sm text-gray-600">Your documents are securely stored and encrypted</p>
                </div>

                <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Easy Access</h4>
                  <p className="text-sm text-gray-600">Download and share your verified documents anytime</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons for Verified Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 border border-green-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Document Management</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Your documents are verified and secure. You can download certificates or update your information.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  onClick={handleDownloadCertificates}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Certificates
                </Button>
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={handleViewDocuments}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto p-6"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6"
          >
            <Shield className="h-10 w-10 text-white" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Document Verification
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Upload your certificates and documents for expert verification
          </motion.p>
        </div>

        {/* Document Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {['certificate', 'id', 'license'].map((type) => {
            const typeInfo = getDocumentTypeInfo(type);
            const IconComponent = typeInfo.icon;
            const isSelected = selectedType === type;
            
            return (
              <motion.div
                key={type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedType(type as any)}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`h-8 w-8 ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{typeInfo.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{typeInfo.description}</p>
                  <div className="text-xs text-gray-500">
                    PDF, JPG, PNG up to 10MB
                  </div>
                </div>
                
                <input
                  type="file"
                  id={type}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, type as 'certificate' | 'id' | 'license');
                    }
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center space-x-3">
              <Upload className="h-8 w-8" />
              <div>
                <h3 className="text-xl font-bold">Upload Documents</h3>
                <p className="text-blue-100">Drag and drop files or click to select</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {dragActive ? 'Drop files here' : 'Upload your documents'}
              </h4>
              <p className="text-gray-600 mb-6">
                Drag and drop files here, or click to browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {uploading ? (
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
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-4">
                Supported formats: PDF, JPG, PNG (Max 10MB each)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8"
          >
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">Uploaded Documents</h3>
                  <p className="text-green-100">{documents.length} document(s) uploaded</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      {getDocumentIcon(doc.documentType)}
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-sm text-gray-600 capitalize">{doc.documentType}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        <span className="capitalize">{doc.status}</span>
                      </div>
                      
                      <button
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Verification Progress</h3>
              <p className="text-sm text-gray-600">
                {documents.length}/3 documents uploaded
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= documents.length
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step <= documents.length ? <CheckCircle2 className="h-4 w-4" /> : step}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {documents.length === 0 && "Upload at least one document to get started"}
              {documents.length > 0 && documents.length < 3 && "Upload more documents for better verification"}
              {documents.length >= 3 && "Ready to submit for verification"}
            </div>
            
            <Button
              onClick={onUploadComplete}
              disabled={documents.length === 0 || uploading}
              loading={uploading}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100"
        >
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Verification Guidelines</h4>
            <p className="text-gray-600 mb-4">
              Ensure your documents are clear, readable, and authentic for faster processing
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <File className="h-4 w-4 text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">Clear Images</p>
                <p className="text-gray-600">High resolution, well-lit photos</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">Authentic Documents</p>
                <p className="text-gray-600">Official, unmodified documents</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="h-4 w-4 text-purple-600" />
                </div>
                <p className="font-medium text-gray-900">Complete Information</p>
                <p className="text-gray-600">All required fields visible</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}