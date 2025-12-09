import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { ME } from '../../lib/graphql/queries';

export default function Profile() {
  const { data, loading, error } = useQuery(ME);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (data?.me) {
      setFormData({
        name: data.me.name || '',
        email: data.me.email || '',
      });
    }
  }, [data]);

  if (loading) {
    return (
      <div className="page">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error loading profile</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Profile</h1>

      <div className="max-w-2xl">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Information</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium muted mb-2">
                  Name
                </label>
                <div className="input-field bg-gray-50 dark:bg-slate-900">
                  {formData.name || 'Not set'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium muted mb-2">
                  Email
                </label>
                <div className="input-field bg-gray-50 dark:bg-slate-900">
                  {formData.email || 'Not set'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium muted mb-2">
                  Role
                </label>
                <div className="input-field bg-gray-50 dark:bg-slate-900">
                  {data?.me?.role || 'user'}
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Contact your administrator to update your profile information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
