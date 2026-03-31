import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function SendSuggestionModal({ open, onClose, onSubmitted }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError(t('sendSuggestion.requiredFields'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/suggestions', { title: title.trim(), description: description.trim() });
      setTitle('');
      setDescription('');
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || t('sendSuggestion.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('sendSuggestion.title')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('sendSuggestion.hint')}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('sendSuggestion.titleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('sendSuggestion.titlePlaceholder')}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('sendSuggestion.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t('sendSuggestion.descriptionPlaceholder')}
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('sendSuggestion.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
            >
              {loading ? t('sendSuggestion.sending') : t('sendSuggestion.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
