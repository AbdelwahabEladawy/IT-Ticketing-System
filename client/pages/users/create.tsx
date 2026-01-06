import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';

export default function CreateUser() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    specializationId: ''
  });
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadSpecializations();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadSpecializations = async () => {
    try {
      const response = await api.get('/specializations');
      setSpecializations(response.data.specializations);
    } catch (error) {
      console.error('Failed to load specializations');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };

      if (formData.role === 'TECHNICIAN' || formData.role === 'IT_ADMIN') {
        if (!formData.specializationId) {
          setError('Specialization is required for technicians and IT admins');
          setLoading(false);
          return;
        }
        payload.specializationId = formData.specializationId;
      }

      await api.post('/users', payload);
      // Force page reload after redirect to show new technician
      router.push('/users').then(() => {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      });
    } catch (err: any) {
      console.error('Create user error:', err.response?.data);
      
      let errorMessage = 'Failed to create user';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        errorMessage = err.response.data.errors[0].msg || err.response.data.errors[0].message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New User</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, specializationId: '' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="USER">User</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="IT_ADMIN">IT Admin</option>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'IT_MANAGER') && (
                <>
                  <option value="IT_MANAGER">IT Manager</option>
                  {user?.role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">Super Admin</option>
                  )}
                </>
              )}
            </select>
          </div>

          {(formData.role === 'TECHNICIAN' || formData.role === 'IT_ADMIN') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <select
                value={formData.specializationId}
                onChange={(e) => setFormData({ ...formData, specializationId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">Select specialization</option>
                {specializations.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
