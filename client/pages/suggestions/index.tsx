import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { connectTicketMessages, disconnectTicketMessages } from '../../utils/ticketMessages';

interface SuggestionRow {
  id: string;
  title: string;
  description: string;
  status: 'UNSEEN' | 'SEEN';
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
}

export default function SuggestionsInbox() {
  const { t, i18n } = useTranslation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get('/suggestions');
      setSuggestions(res.data.suggestions || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || t('suggestions.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUserRole(u?.role ?? null);
      setRoleChecked(true);
    });
  }, []);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onPayload = (payload: any) => {
      if (payload?.type === 'notification_created') {
        load();
      }
    };
    connectTicketMessages(onPayload);
    return () => disconnectTicketMessages(onPayload);
  }, []);

  const handleMarkSeen = async (id: string) => {
    setMarking(true);
    try {
      await api.patch(`/suggestions/${id}/seen`);
      await load();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status: 'SEEN' } : prev));
    } catch (e: any) {
      setError(e?.response?.data?.error || t('suggestions.updateFailed'));
    } finally {
      setMarking(false);
    }
  };

  if (roleChecked && userRole && userRole !== 'SUPER_ADMIN' && userRole !== 'SOFTWARE_ENGINEER') {
    return (
      <Layout>
        <div className="px-4 py-12 text-center text-gray-600">{t('suggestions.accessDenied')}</div>
      </Layout>
    );
  }

  if (!roleChecked) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (loading && suggestions.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('suggestions.title')}</h1>
        <p className="text-gray-600 mb-6">{t('suggestions.subtitle')}</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className={`text-left bg-white rounded-xl shadow border p-5 hover:shadow-md transition-shadow ${
                s.status === 'UNSEEN' ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <h2 className="font-semibold text-gray-900">{s.title}</h2>
                <span
                  className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                    s.status === 'UNSEEN' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {s.status === 'UNSEEN' ? t('suggestions.unseen') : t('suggestions.seen')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{s.description}</p>
              <p className="text-xs text-gray-400 mt-3">
                {t('suggestions.from')} {s.createdBy.name} ·{' '}
                {format(new Date(s.createdAt), 'MMM d, yyyy HH:mm', {
                  locale: i18n.language?.startsWith('ar') ? ar : undefined
                })}
              </p>
            </button>
          ))}
        </div>

        {suggestions.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
            {t('suggestions.none')}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900">{selected.title}</h2>
            <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</div>
            <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">{t('suggestions.user')}:</span> {selected.createdBy.name} ({selected.createdBy.email})
              </p>
              <p>
                <span className="font-medium">{t('suggestions.created')}:</span>{' '}
                {format(new Date(selected.createdAt), 'MMM d, yyyy HH:mm', {
                  locale: i18n.language?.startsWith('ar') ? ar : undefined
                })}
              </p>
              <p>
                <span className="font-medium">{t('suggestions.status')}:</span>{' '}
                {selected.status === 'UNSEEN' ? t('suggestions.unseen') : t('suggestions.seen')}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('suggestions.close')}
              </button>
              {selected.status === 'UNSEEN' && (
                <button
                  type="button"
                  disabled={marking}
                  onClick={async () => {
                    await handleMarkSeen(selected.id);
                    setSelected((prev) => (prev ? { ...prev, status: 'SEEN' } : null));
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {marking ? t('suggestions.updating') : t('suggestions.markSeen')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
