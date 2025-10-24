import React from 'react';
import { useAuthStore } from '../../store/authStore';

export const UserDebugInfo: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Debug Info:</strong> User is not authenticated
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <strong>Debug Info:</strong> User is authenticated but user data is null
      </div>
    );
  }

  return (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
      <strong>Debug Info:</strong>
      <ul className="mt-2 text-sm">
        <li><strong>User ID:</strong> {user.id}</li>
        <li><strong>Email:</strong> {user.email}</li>
        <li><strong>Name:</strong> {user.name}</li>
        <li><strong>Role:</strong> {user.role}</li>
        <li><strong>Is Coach:</strong> {user.role === 'coach' ? 'Yes' : 'No'}</li>
        <li><strong>Is Verified:</strong> {user.is_verified ? 'Yes' : 'No'}</li>
        <li><strong>Is Banned:</strong> {user.is_banned ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
};
