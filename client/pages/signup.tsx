import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../utils/api';
import { persistAuthSession } from '../utils/auth';

const ALLOWED_SIGNUP_DOMAINS = [
  'globalenergy-eg.net',
  'globalenergy-eg.com',
  'fadensa.com'
] as const;

const SIGNUP_DOMAIN_ERROR =
  'Signup is only allowed for @globalenergy-eg.net, @globalenergy-eg.com, or @fadensa.com email addresses.';

function getEmailDomain(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at === -1) return '';
  return trimmed.slice(at + 1).toLowerCase();
}

function isAllowedSignupEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  return (ALLOWED_SIGNUP_DOMAINS as readonly string[]).includes(domain);
}

function formatSignupError(err: unknown): string {
  const ax = err as {
    response?: { data?: { error?: string; errors?: Array<{ msg?: string; message?: string }> } };
    message?: string;
  };
  const data = ax.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }
  const list = data?.errors;
  if (Array.isArray(list) && list.length > 0) {
    const parts = list
      .map((e) => (typeof e?.msg === 'string' ? e.msg : e?.message))
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    if (parts.length > 0) return parts.join(' ');
  }
  if (typeof ax.message === 'string' && ax.message) {
    return ax.message;
  }
  return 'Signup failed';
}

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isAllowedSignupEmail(formData.email)) {
      setError(SIGNUP_DOMAIN_ERROR);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email.trim(),
        password: formData.password
      });
      persistAuthSession(response.data.token, response.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(formatSignupError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Sign up to get started</p>
          <p className="mt-2 text-xs text-gray-500">
            Use your company email: @globalenergy-eg.net, @globalenergy-eg.com, or @fadensa.com
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="you@globalenergy-eg.com"
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
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
