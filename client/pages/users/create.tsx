import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';

export default function CreateUser() {
  const { t } = useTranslation();
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
          setError(t('users.specRequiredEngineers'));
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
      
      let errorMessage = t('users.createFailed');
      
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('users.createTitle')}</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('users.fullName')}
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
              {t('login.email')}
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
              {t('users.password')}
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
              {t('users.role')}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, specializationId: '' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="USER">{t('roles.USER')}</option>
              <option value="TECHNICIAN">{t('roles.TECHNICIAN')}</option>
              <option value="IT_ADMIN">{t('roles.IT_ADMIN')}</option>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'IT_MANAGER') && (
                <>
                  <option value="IT_MANAGER">{t('roles.IT_MANAGER')}</option>
                  {user?.role === 'SUPER_ADMIN' && (
                    <>
                      <option value="SUPER_ADMIN">{t('roles.SUPER_ADMIN')}</option>
                      <option value="SOFTWARE_ENGINEER">{t('roles.SOFTWARE_ENGINEER')}</option>
                    </>
                  )}
                </>
              )}
            </select>
          </div>

          {(formData.role === 'TECHNICIAN' || formData.role === 'IT_ADMIN') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('users.colSpecialization')}
              </label>
              <select
                value={formData.specializationId}
                onChange={(e) => setFormData({ ...formData, specializationId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">{t('users.selectSpecialization')}</option>
                {specializations.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? t('users.creating') : t('users.createUser')}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('users.cancel')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
