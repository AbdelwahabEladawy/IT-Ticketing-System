import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ChevronDown, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';

interface Achievement {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const ALLOWED_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN', 'SUPER_ADMIN']);

export default function AchievementsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [roleChecked, setRoleChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openAchievementId, setOpenAchievementId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);

  const getDateRangeError = () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return t('achievements.dateRangeInvalid', {
        defaultValue: 'Start date cannot be after end date.'
      });
    }

    return null;
  };

  const buildAchievementQueryParams = () => {
    const params: Record<string, string> = {};

    if (dateFrom) {
      params.dateFrom = dateFrom;
    }

    if (dateTo) {
      params.dateTo = dateTo;
    }

    return params;
  };

  const loadAchievements = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      const response = await api.get('/achievements/me', {
        params: buildAchievementQueryParams()
      });
      setAchievements(Array.isArray(response.data?.achievements) ? response.data.achievements : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          t('achievements.loadFailed', { defaultValue: 'Failed to load achievements' })
      );
      setAchievements([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) {
          return;
        }

        const canAccess = Boolean(currentUser?.role && ALLOWED_ROLES.has(currentUser.role));
        setRoleChecked(true);

        if (!canAccess) {
          setHasAccess(false);
          void router.replace('/dashboard');
          return;
        }

        setHasAccess(true);
      } finally {
        if (!cancelled) {
          setRoleChecked(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    const dateRangeError = getDateRangeError();
    if (dateRangeError) {
      setError(dateRangeError);
      setLoading(false);
      return;
    }

    void loadAchievements();
  }, [hasAccess, dateFrom, dateTo, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setSuccess(null);
      setError(
        t('achievements.requiredFields', {
          defaultValue: 'Title and description are required'
        })
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (editingAchievementId) {
        await api.patch(`/achievements/${editingAchievementId}`, {
          title,
          description
        });
      } else {
        await api.post('/achievements', {
          title,
          description
        });
      }

      setTitle('');
      setDescription('');
      setFormOpen(false);
      setEditingAchievementId(null);
      setSuccess(
        editingAchievementId
          ? t('achievements.updateSuccess', {
              defaultValue: 'Achievement updated successfully'
            })
          : t('achievements.createSuccess', {
              defaultValue: 'Achievement saved successfully'
            })
      );
      await loadAchievements({ silent: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          (editingAchievementId
            ? t('achievements.updateFailed', { defaultValue: 'Failed to update achievement' })
            : t('achievements.createFailed', { defaultValue: 'Failed to save achievement' }))
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setError(null);
  };

  const openCreateModal = () => {
    setEditingAchievementId(null);
    setTitle('');
    setDescription('');
    setError(null);
    setSuccess(null);
    setFormOpen(true);
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievementId(achievement.id);
    setTitle(achievement.title);
    setDescription(achievement.description);
    setError(null);
    setSuccess(null);
    setFormOpen(true);
    setOpenAchievementId(achievement.id);
  };

  const handleDeleteAchievement = async (achievement: Achievement) => {
    if (!confirm(t('achievements.deleteConfirm', {
      defaultValue: 'Delete this achievement?'
    }))) {
      return;
    }

    try {
      setDeletingId(achievement.id);
      setError(null);
      setSuccess(null);

      await api.delete(`/achievements/${achievement.id}`);

      if (openAchievementId === achievement.id) {
        setOpenAchievementId(null);
      }

      if (editingAchievementId === achievement.id) {
        setEditingAchievementId(null);
        setFormOpen(false);
      }

      setSuccess(
        t('achievements.deleteSuccess', {
          defaultValue: 'Achievement deleted successfully'
        })
      );
      await loadAchievements({ silent: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          t('achievements.deleteFailed', { defaultValue: 'Failed to delete achievement' })
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!roleChecked || !hasAccess) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('achievements.title', { defaultValue: 'Achievements' })}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('achievements.subtitle', {
              defaultValue: 'Track the work and milestones you want to keep on record.'
            })}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-lg md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('achievements.filterStartDate', { defaultValue: 'Start Date' })}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('achievements.filterEndDate', { defaultValue: 'End Date' })}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              {t('achievements.resetFilters', { defaultValue: 'Reset Filters' })}
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-indigo-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('achievements.addButton', { defaultValue: 'Add Achievement' })}
            </button>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('achievements.listTitle', { defaultValue: 'My Achievements' })}
              </h2>
              <p className="text-sm text-gray-500">
                {t('achievements.filterHint', {
                  defaultValue: 'Use the date range above to view achievements from a specific period.'
                })}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-gray-500">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : achievements.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              {dateFrom || dateTo
                ? t('achievements.filteredEmpty', {
                    defaultValue: 'No achievements found for the selected date range.'
                  })
                : t('achievements.empty', { defaultValue: 'No achievements yet.' })}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {achievements.map((achievement) => {
                const isOpen = openAchievementId === achievement.id;

                return (
                  <div key={achievement.id} className="bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenAchievementId((current) =>
                          current === achievement.id ? null : achievement.id
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{achievement.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 px-6 py-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {achievement.description}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditAchievement(achievement)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                          >
                            {t('achievements.edit', { defaultValue: 'Edit' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAchievement(achievement)}
                            disabled={deletingId === achievement.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === achievement.id
                              ? t('achievements.deleting', { defaultValue: 'Deleting...' })
                              : t('achievements.delete', { defaultValue: 'Delete' })}
                          </button>
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                          {t('achievements.createdAt', { defaultValue: 'Created' })}:{' '}
                          {format(new Date(achievement.createdAt), 'MMM d, yyyy HH:mm', {
                            locale: i18n.language?.startsWith('ar') ? ar : undefined
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingAchievementId
                    ? t('achievements.editTitle', { defaultValue: 'Edit Achievement' })
                    : t('achievements.addTitle', { defaultValue: 'Add Achievement' })}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingAchievementId(null);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('achievements.formTitle', { defaultValue: 'Title' })}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t('achievements.formTitlePlaceholder', {
                    defaultValue: 'Enter achievement title'
                  })}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('achievements.formDescription', { defaultValue: 'Description' })}
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={t('achievements.formDescriptionPlaceholder', {
                    defaultValue: 'Describe the achievement'
                  })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingAchievementId(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? t('achievements.submitting', { defaultValue: 'Submitting...' })
                    : editingAchievementId
                      ? t('achievements.saveChanges', { defaultValue: 'Save Changes' })
                      : t('achievements.submit', { defaultValue: 'Submit' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
