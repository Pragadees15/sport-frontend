import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService as api } from '../../services/api';

interface MigrationStatus {
  migrationNeeded: boolean;
  currentState: {
    userCategories: string[];
    postCategories: string[];
    sportsCategories: string[];
  };
  allowedCategories: string[];
  issues: {
    hasUnwantedUserCategories: boolean;
    hasUnwantedPostCategories: boolean;
    hasUnwantedSportsCategories: boolean;
  };
}

interface MigrationResult {
  success: boolean;
  message: string;
  userCategories: any[];
  postCategories: any[];
  sportsCategories: string[];
}

export const MigrationPanel: React.FC = () => {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const checkMigrationStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/migration/sports-categories/status');
      setStatus(response.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to check migration status');
      console.error('Migration status check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!window.confirm('Are you sure you want to run the sports categories migration? This will update all existing user data.')) {
      return;
    }

    try {
      setMigrating(true);
      const response = await api.post('/migration/sports-categories');
      setResult(response.data);
      toast.success('Migration completed successfully!');
      // Refresh status after migration
      await checkMigrationStatus();
    } catch (error: any) {
      toast.error(error.message || 'Migration failed');
      console.error('Migration failed:', error);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Sports Categories Migration</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Checking migration status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Sports Categories Migration</h2>
      
      {status && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${
            status.migrationNeeded 
              ? 'bg-yellow-50 border border-yellow-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <h3 className={`font-medium ${
              status.migrationNeeded ? 'text-yellow-800' : 'text-green-800'
            }`}>
              {status.migrationNeeded ? '⚠️ Migration Needed' : '✅ Migration Complete'}
            </h3>
            <p className={`text-sm mt-1 ${
              status.migrationNeeded ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {status.migrationNeeded 
                ? 'The database contains sports categories that need to be updated.'
                : 'All sports categories are properly configured.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Allowed Categories</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {status.allowedCategories.map(cat => (
                  <li key={cat} className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {cat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Current User Categories</h4>
              <ul className="text-sm space-y-1">
                {status.currentState.userCategories.map(cat => (
                  <li key={cat} className={`flex items-center ${
                    status.allowedCategories.includes(cat) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      status.allowedCategories.includes(cat) ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {cat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Current Sports Categories</h4>
              <ul className="text-sm space-y-1">
                {status.currentState.sportsCategories.map(cat => (
                  <li key={cat} className={`flex items-center ${
                    status.allowedCategories.includes(cat) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      status.allowedCategories.includes(cat) ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {cat}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {status.migrationNeeded && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Migration Actions</h4>
              <ul className="text-sm text-blue-800 space-y-1 mb-4">
                {status.issues.hasUnwantedUserCategories && (
                  <li>• Update user sports categories to allowed values</li>
                )}
                {status.issues.hasUnwantedPostCategories && (
                  <li>• Update post sports categories to allowed values</li>
                )}
                {status.issues.hasUnwantedSportsCategories && (
                  <li>• Remove unwanted sports categories from database</li>
                )}
                <li>• Update database constraints to enforce new categories</li>
              </ul>
              
              <button
                onClick={runMigration}
                disabled={migrating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {migrating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Migration...
                  </>
                ) : (
                  'Run Migration'
                )}
              </button>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Migration Results</h4>
              <p className="text-sm text-green-800 mb-2">{result.message}</p>
              <div className="text-xs text-green-700">
                <p>Updated sports categories: {result.sportsCategories?.join(', ')}</p>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={checkMigrationStatus}
              disabled={loading || migrating}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};