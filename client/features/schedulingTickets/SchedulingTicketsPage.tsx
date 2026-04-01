import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getCurrentUser, User } from '../../utils/auth';
import {
  createScheduledTask,
  deleteScheduledTask,
  listScheduledTasks,
  listSchedulingTargets,
  runScheduledTaskNow,
  setScheduledTaskActive,
  updateScheduledTask
} from './schedulingTickets.api';
import { ScheduleType, ScheduledTask, ScheduledTaskPayload, SchedulingTarget } from './types';

const ALLOWED_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN', 'SUPER_ADMIN']);
const DEFAULT_TIME = '09:00';
const DEFAULT_TIMEZONE = 'Africa/Cairo';

type TaskFilter = 'all' | 'active' | 'paused';

interface TaskFormState {
  title: string;
  description: string;
  scheduleType: ScheduleType;
  runDate: string;
  month: string;
  day: string;
  timeOfDay: string;
  timezone: string;
  targetUserId: string;
}

const getDateOffset = (daysFromNow: number) => {
  const now = new Date();
  now.setDate(now.getDate() + daysFromNow);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialFormState = (): TaskFormState => {
  const now = new Date();
  return {
    title: '',
    description: '',
    scheduleType: 'ONE_TIME',
    runDate: getDateOffset(1),
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
    timeOfDay: DEFAULT_TIME,
    timezone: DEFAULT_TIMEZONE,
    targetUserId: ''
  };
};

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

export default function SchedulingTicketsPage() {
  const { t, i18n } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [targets, setTargets] = useState<SchedulingTarget[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [form, setForm] = useState<TaskFormState>(getInitialFormState());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const locale = useMemo(
    () => (i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB'),
    [i18n.language]
  );

  const activeFilterValue = useMemo(() => {
    if (filter === 'active') return true;
    if (filter === 'paused') return false;
    return undefined;
  }, [filter]);

  const allowed = Boolean(currentUser && ALLOWED_ROLES.has(currentUser.role));

  const resetForm = () => {
    setForm(getInitialFormState());
    setEditingTaskId(null);
  };

  const loadTasks = async (nextFilter: TaskFilter = filter) => {
    const active =
      nextFilter === 'active' ? true : nextFilter === 'paused' ? false : undefined;
    const fetchedTasks = await listScheduledTasks(active);
    setTasks(fetchedTasks);
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (!user || !ALLOWED_ROLES.has(user.role)) {
        setRoleChecked(true);
        return;
      }

      const [fetchedTargets, fetchedTasks] = await Promise.all([
        listSchedulingTargets(),
        listScheduledTasks(activeFilterValue)
      ]);

      setTargets(fetchedTargets);
      setTasks(fetchedTasks);
      if (user.role !== 'SUPER_ADMIN') {
        setForm((prev) => ({ ...prev, targetUserId: user.id }));
      } else if (fetchedTargets.length > 0) {
        setForm((prev) => ({ ...prev, targetUserId: prev.targetUserId || fetchedTargets[0].id }));
      }
      setRoleChecked(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load scheduling tickets');
      setRoleChecked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    loadTasks(filter)
      .catch((err: any) => {
        setError(err?.response?.data?.error || 'Failed to load scheduling tickets');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(locale);
  };

  const parseFormPayload = (): ScheduledTaskPayload => {
    if (!form.title.trim()) {
      throw new Error('Title is required');
    }

    const payload: ScheduledTaskPayload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      scheduleType: form.scheduleType,
      timeOfDay: form.timeOfDay || DEFAULT_TIME,
      timezone: form.timezone.trim() || DEFAULT_TIMEZONE
    };

    if (form.scheduleType === 'ONE_TIME') {
      if (!form.runDate) {
        throw new Error('Run date is required for one-time schedule');
      }
      payload.runDate = form.runDate;
    } else {
      const month = Number(form.month);
      const day = Number(form.day);
      if (!Number.isInteger(month) || !Number.isInteger(day)) {
        throw new Error('Month and day are required for yearly schedule');
      }
      payload.month = month;
      payload.day = day;
    }

    if (isSuperAdmin) {
      if (!form.targetUserId) {
        throw new Error('Target user is required');
      }
      payload.targetUserId = form.targetUserId;
    }

    return payload;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      const payload = parseFormPayload();
      setSubmitting(true);

      if (editingTaskId) {
        await updateScheduledTask(editingTaskId, payload);
        setNotice('Scheduled task updated successfully');
      } else {
        await createScheduledTask(payload);
        setNotice('Scheduled task created successfully');
      }

      resetForm();
      await loadTasks(filter);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to save scheduled task';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (task: ScheduledTask) => {
    setError(null);
    setNotice(null);
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description || '',
      scheduleType: task.scheduleType,
      runDate: task.runDate || getDateOffset(1),
      month: String(task.month || 1),
      day: String(task.day || 1),
      timeOfDay: task.timeOfDay || DEFAULT_TIME,
      timezone: task.timezone || DEFAULT_TIMEZONE,
      targetUserId: task.targetUser.id
    });
  };

  const runTaskAction = async (
    taskId: string,
    action: () => Promise<void>,
    successMessage: string
  ) => {
    setBusyTaskId(taskId);
    setError(null);
    setNotice(null);

    try {
      await action();
      setNotice(successMessage);
      await loadTasks(filter);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Action failed');
    } finally {
      setBusyTaskId(null);
    }
  };

  const pageTitle = t('schedulingTickets.title', { defaultValue: 'Scheduling Tickets' });
  const pageSubtitle = t('schedulingTickets.subtitle', {
    defaultValue:
      'Create recurring or one-time tasks that automatically become tickets at the scheduled date and time.'
  });

  if (!roleChecked || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (!allowed) {
    return (
      <Layout>
        <div className="px-4 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
            {t('schedulingTickets.accessDenied', {
              defaultValue: 'You do not have access to this page.'
            })}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-600 mt-1">{pageSubtitle}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingTaskId
                ? t('schedulingTickets.editTitle', { defaultValue: 'Edit Scheduled Task' })
                : t('schedulingTickets.createTitle', { defaultValue: 'Create Scheduled Task' })}
            </h2>
            {editingTaskId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('schedulingTickets.cancelEdit', { defaultValue: 'Cancel Edit' })}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulingTickets.fields.title', { defaultValue: 'Title' })}
              </label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder={t('schedulingTickets.placeholders.title', {
                  defaultValue: 'Monthly firewall check'
                })}
                maxLength={200}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulingTickets.fields.description', { defaultValue: 'Description (optional)' })}
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                rows={3}
                placeholder={t('schedulingTickets.placeholders.description', {
                  defaultValue: 'This ticket is auto-created by schedule.'
                })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulingTickets.fields.scheduleType', { defaultValue: 'Schedule Type' })}
              </label>
              <select
                value={form.scheduleType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    scheduleType: event.target.value as ScheduleType
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ONE_TIME">
                  {t('schedulingTickets.types.oneTime', { defaultValue: 'One time' })}
                </option>
                <option value="YEARLY">
                  {t('schedulingTickets.types.yearly', { defaultValue: 'Yearly (recurring)' })}
                </option>
              </select>
            </div>

            {isSuperAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('schedulingTickets.fields.targetUser', { defaultValue: 'Target Engineer/Admin' })}
                </label>
                <select
                  value={form.targetUserId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, targetUserId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} ({target.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.scheduleType === 'ONE_TIME' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('schedulingTickets.fields.runDate', { defaultValue: 'Run Date' })}
                </label>
                <input
                  type="date"
                  value={form.runDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, runDate: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('schedulingTickets.fields.month', { defaultValue: 'Month' })}
                  </label>
                  <select
                    value={form.month}
                    onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('schedulingTickets.fields.day', { defaultValue: 'Day' })}
                  </label>
                  <select
                    value={form.day}
                    onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulingTickets.fields.timeOfDay', { defaultValue: 'Time' })}
              </label>
              <input
                type="time"
                value={form.timeOfDay}
                onChange={(event) => setForm((prev) => ({ ...prev, timeOfDay: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('schedulingTickets.fields.timezone', { defaultValue: 'Timezone' })}
              </label>
              <input
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Africa/Cairo"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting
                  ? t('schedulingTickets.saving', { defaultValue: 'Saving...' })
                  : editingTaskId
                    ? t('schedulingTickets.actions.update', { defaultValue: 'Update Task' })
                    : t('schedulingTickets.actions.create', { defaultValue: 'Create Task' })}
              </button>
              <span className="text-xs text-gray-500">
                {t('schedulingTickets.hints.defaultTime', {
                  defaultValue: 'Default time is 09:00 if not changed.'
                })}
              </span>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('schedulingTickets.listTitle', { defaultValue: 'Scheduled Tasks' })}
            </h2>
            <div className="inline-flex rounded-lg border border-gray-300 p-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('schedulingTickets.filters.all', { defaultValue: 'All' })}
              </button>
              <button
                type="button"
                onClick={() => setFilter('active')}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  filter === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('schedulingTickets.filters.active', { defaultValue: 'Active' })}
              </button>
              <button
                type="button"
                onClick={() => setFilter('paused')}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  filter === 'paused'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t('schedulingTickets.filters.paused', { defaultValue: 'Paused' })}
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              {t('schedulingTickets.none', { defaultValue: 'No scheduled tasks found for this filter.' })}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="rounded bg-gray-100 px-2 py-1">
                          {task.scheduleType === 'ONE_TIME'
                            ? t('schedulingTickets.types.oneTime', { defaultValue: 'One time' })
                            : t('schedulingTickets.types.yearly', {
                                defaultValue: 'Yearly (recurring)'
                              })}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-1">
                          {t('schedulingTickets.meta.nextRun', { defaultValue: 'Next run:' })}{' '}
                          {formatDateTime(task.nextRunAt)}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-1">
                          {t('schedulingTickets.meta.timezone', { defaultValue: 'Timezone:' })}{' '}
                          {task.timezone}
                        </span>
                        {task.scheduleType === 'ONE_TIME' && task.runDate && (
                          <span className="rounded bg-gray-100 px-2 py-1">
                            {t('schedulingTickets.meta.date', { defaultValue: 'Date:' })} {task.runDate}
                          </span>
                        )}
                        {task.scheduleType === 'YEARLY' &&
                          task.month &&
                          task.day && (
                            <span className="rounded bg-gray-100 px-2 py-1">
                              {t('schedulingTickets.meta.yearlyOn', { defaultValue: 'Every year on:' })}{' '}
                              {task.month}/{task.day}
                            </span>
                          )}
                        <span
                          className={`rounded px-2 py-1 font-semibold ${
                            task.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {task.isActive
                            ? t('schedulingTickets.status.active', { defaultValue: 'Active' })
                            : t('schedulingTickets.status.paused', { defaultValue: 'Paused' })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {t('schedulingTickets.meta.target', { defaultValue: 'Target:' })}{' '}
                        {task.targetUser.name} ({task.targetUser.role})
                      </div>
                      {task.latestRun && (
                        <div className="mt-1 text-xs text-gray-500">
                          {t('schedulingTickets.meta.lastRun', { defaultValue: 'Last run:' })}{' '}
                          {formatDateTime(task.latestRun.executedAt)} - {task.latestRun.status}
                          {task.latestRun.ticketId ? (
                            <>
                              {' '}
                              ({t('schedulingTickets.meta.ticketId', { defaultValue: 'ticket' })}:{' '}
                              {task.latestRun.ticketId})
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        disabled={busyTaskId === task.id}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {t('schedulingTickets.actions.edit', { defaultValue: 'Edit' })}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runTaskAction(
                            task.id,
                            () => setScheduledTaskActive(task.id, !task.isActive).then(() => undefined),
                            task.isActive ? 'Scheduled task paused' : 'Scheduled task activated'
                          )
                        }
                        disabled={busyTaskId === task.id}
                        className="rounded-lg border border-indigo-300 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                      >
                        {task.isActive
                          ? t('schedulingTickets.actions.pause', { defaultValue: 'Pause' })
                          : t('schedulingTickets.actions.activate', { defaultValue: 'Activate' })}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runTaskAction(
                            task.id,
                            () => runScheduledTaskNow(task.id).then(() => undefined),
                            'Scheduled task executed'
                          )
                        }
                        disabled={busyTaskId === task.id || !task.isActive}
                        className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {t('schedulingTickets.actions.runNow', { defaultValue: 'Run Now' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            t('schedulingTickets.confirmDelete', {
                              defaultValue: 'Delete this scheduled task?'
                            })
                          );
                          if (!confirmed) return;

                          runTaskAction(
                            task.id,
                            () => deleteScheduledTask(task.id).then(() => undefined),
                            'Scheduled task deleted'
                          );
                        }}
                        disabled={busyTaskId === task.id}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {t('schedulingTickets.actions.delete', { defaultValue: 'Delete' })}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
