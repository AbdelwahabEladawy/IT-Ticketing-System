import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import {
  getSavedLoginCredentials,
  persistAuthSession,
  saveLoginCredentials,
} from '../utils/auth';
import Image from 'next/image';
import logoG from "../public/assets/logoG.png"
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const savedCredentials = getSavedLoginCredentials();
    if (!savedCredentials) return;

    setEmail(savedCredentials.email);
    setPassword(savedCredentials.password);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      persistAuthSession(response.data.token, response.data.user);
      saveLoginCredentials({ email, password });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-500 relative overflow-hidden">

      {/* Background Effects — logical positions for RTL/LTR */}
      <div className="absolute w-72 h-72 bg-white/20 rounded-full blur-3xl top-10 start-10" aria-hidden />
      <div className="absolute w-72 h-72 bg-blue-300/20 rounded-full blur-3xl bottom-10 end-10" aria-hidden />

      {/* FORM */}
      <div className="w-full max-w-xl bg-gradient-to-br from-indigo-300 via-blue-200 to-blue-400 rounded-3xl shadow-2xl p-8 animate-slideUp relative z-10 text-start">
        <div className="absolute top-4 end-4 z-20">
          {/* <LanguageSwitcher /> */}
        </div>

        {/* Logo + Title */}
        <div className="flex flex-col gap-2 justify-center items-start ">
          <h1 className="text-2xl text-black font-bold flex flex-wrap items-center gap-3  justify-center ">
            <Image
              src={logoG}
              alt="logo"
              className="w-10 h-10 rounded-2xl object-contain shrink-0 "
              priority
            />
            <span className=''>Global Energy</span>
          </h1>
          <h2 className="ms-4 font-bold text-black/80 text-2xl leading-snug  text-center">
            {t('login.brandSubtitle')}
          </h2>
        </div>

        <div className="mt-6">
          <p className="text-gray-600 text-md font-semibold font-serif">
            {t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mt-4 mb-2 p-3 bg-red-50 border-s-4 border-red-500 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">

          {/* Email */}
          <div>
            <label className="text-sm text-gray-600 block">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir={isRTL ? 'rtl' : 'ltr'}
              className="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="you@globalenergy-eg.net"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600 block">{t('login.password')}</label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir={isRTL ? 'rtl' : 'ltr'}
                className="w-full px-4 py-2 pe-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-white/40"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium shadow-lg hover:scale-[1.02] hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? t('login.signingIn') : t('login.submit')}
            </button>
          </div>

        </form>

        <p className="mt-12 text-center bg-blue-400/90 text-gray-800 rounded-xl font-bold py-2 px-3 text-md">
          GEC Software Development  <span className='text-sm text-gray-700 '>GEC-SOFT@2026</span>
        </p>
      </div>

      {/* Animations */}
      <style jsx>{`
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

    </div>
  );
}
