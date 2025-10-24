import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { apiService } from '../../services/api';
import { Button } from '../ui/Button';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function IntegrationTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Health Check', status: 'pending', message: 'Checking backend server...' },
    { name: 'API Connection', status: 'pending', message: 'Testing API endpoints...' },
    { name: 'Environment Variables', status: 'pending', message: 'Validating configuration...' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })));

    try {
      // Test 1: Backend Health Check
      updateTest(0, { status: 'pending', message: 'Connecting to backend...' });
      
      try {
        const healthResponse = await apiService.healthCheck();
        updateTest(0, {
          status: 'success',
          message: `Backend is healthy (${healthResponse.status})`,
          details: healthResponse
        });
      } catch (error) {
        updateTest(0, {
          status: 'error',
          message: `Backend health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }

      // Test 2: API Connection
      updateTest(1, { status: 'pending', message: 'Testing API endpoints...' });
      
      try {
        // Test a simple API call that doesn't require authentication
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok || response.status === 404) {
          updateTest(1, {
            status: 'success',
            message: 'API endpoints are accessible',
            details: { status: response.status, url: response.url }
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        updateTest(1, {
          status: 'error',
          message: `API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }

      // Test 3: Environment Variables
      updateTest(2, { status: 'pending', message: 'Checking configuration...' });
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const socketUrl = import.meta.env.VITE_SOCKET_URL;
      
      if (apiUrl && socketUrl) {
        updateTest(2, {
          status: 'success',
          message: 'Environment variables are configured',
          details: { apiUrl, socketUrl }
        });
      } else {
        updateTest(2, {
          status: 'error',
          message: 'Missing environment variables',
          details: { apiUrl, socketUrl }
        });
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const allTestsPassed = tests.every(test => test.status === 'success');
  const hasErrors = tests.some(test => test.status === 'error');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Backend Integration Test</h2>
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              'Run Tests'
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(test.status)}
                <h3 className="font-semibold text-gray-900">{test.name}</h3>
              </div>
              <p className="text-gray-700 mb-2">{test.message}</p>
              {test.details && (
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">View Details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg border">
          {allTestsPassed ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">✅ All tests passed! Backend integration is working correctly.</span>
            </div>
          ) : hasErrors ? (
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">❌ Some tests failed. Please check the backend configuration.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-blue-700">
              <Loader className="w-5 h-5 animate-spin" />
              <span className="font-semibold">🔄 Running tests...</span>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Backend URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</p>
          <p><strong>Socket URL:</strong> {import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}</p>
        </div>
      </div>
    </div>
  );
}