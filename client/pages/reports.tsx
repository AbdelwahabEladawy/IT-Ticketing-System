import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';

type ReportType = 'department' | 'engineer';
type DateField = 'createdAt' | 'updatedAt';
type DateRange = 'CUSTOM' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';

interface ReportRow {
  id: string | null;
  name: string;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
}

interface SummaryState {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface EngineerOption {
  id: string;
  name: string;
}

interface AchievementUserOption {
  id: string;
  name: string;
}

interface AchievementRow {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  userId: string;
  userName: string;
}

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'IT_ADMIN']);
const ACHIEVEMENT_USER_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN', 'SUPER_ADMIN']);

const parseNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [roleChecked, setRoleChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>('department');
  const [departmentId, setDepartmentId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [dateField, setDateField] = useState<DateField>('createdAt');
  const [range, setRange] = useState<DateRange>('MONTHLY');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [engineers, setEngineers] = useState<EngineerOption[]>([]);
  const [achievementUsers, setAchievementUsers] = useState<AchievementUserOption[]>([]);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<SummaryState>({
    totalTickets: 0,
    openTickets: 0,
    closedTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [achievementExportLoading, setAchievementExportLoading] = useState(false);
  const [achievementViewLoading, setAchievementViewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achievementExportError, setAchievementExportError] = useState<string | null>(null);
  const [achievementViewError, setAchievementViewError] = useState<string | null>(null);
  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [achievementRows, setAchievementRows] = useState<AchievementRow[]>([]);

  const [achievementUserId, setAchievementUserId] = useState('');
  const [achievementDateFrom, setAchievementDateFrom] = useState('');
  const [achievementDateTo, setAchievementDateTo] = useState('');

  const buildQueryParams = () => {
    const params: Record<string, string> = {
      dateField
    };

    if (departmentId) {
      params.departmentId = departmentId;
    }

    if (engineerId) {
      params.engineerId = engineerId;
    }

    if (range !== 'CUSTOM') {
      params.range = range;
    } else {
      if (dateFrom) {
        params.dateFrom = dateFrom;
      }
      if (dateTo) {
        params.dateTo = dateTo;
      }
    }

    return params;
  };

  const buildAchievementExportParams = () => {
    const params: Record<string, string> = {};

    if (achievementUserId) {
      params.userId = achievementUserId;
    }

    if (achievementDateFrom) {
      params.dateFrom = achievementDateFrom;
    }

    if (achievementDateTo) {
      params.dateTo = achievementDateTo;
    }

    return params;
  };

  const downloadBlobResponse = (response: any, fallbackFileName: string) => {
    const contentType =
      response.headers['content-type'] ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([response.data], { type: contentType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dispositionHeader = response.headers['content-disposition'] as string | undefined;
    const fileNameMatch = dispositionHeader?.match(/filename="?([^"]+)"?/i);
    const fileName = fileNameMatch?.[1] || fallbackFileName;

    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const getBlobErrorMessage = async (err: any, fallbackMessage: string) => {
    const responseData = err?.response?.data;

    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        if (typeof parsed?.error === 'string' && parsed.error.trim()) {
          return parsed.error;
        }
      } catch {
        return fallbackMessage;
      }
    }

    return err?.response?.data?.error || fallbackMessage;
  };

  const getAchievementDateRangeError = () => {
    if (
      achievementDateFrom &&
      achievementDateTo &&
      achievementDateFrom > achievementDateTo
    ) {
      return t('reports.achievementDateRangeInvalid', {
        defaultValue: 'Start date cannot be after end date.'
      });
    }

    return null;
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;

        const canAccess = Boolean(currentUser?.role && ALLOWED_ROLES.has(currentUser.role));
        setCurrentUserRole(currentUser?.role ?? null);
        setRoleChecked(true);

        if (!canAccess) {
          setHasAccess(false);
          void router.replace('/dashboard');
          return;
        }

        setHasAccess(true);

        const [departmentsResponse, engineersResponse, usersResponse] = await Promise.all([
          api.get('/specializations'),
          api.get('/users/technicians'),
          api.get('/users')
        ]);
        if (cancelled) return;

        const departmentRows = Array.isArray(departmentsResponse.data?.specializations)
          ? departmentsResponse.data.specializations
          : [];
        const engineerRows = Array.isArray(engineersResponse.data?.technicians)
          ? engineersResponse.data.technicians
          : [];
        const userRows = Array.isArray(usersResponse.data?.users) ? usersResponse.data.users : [];

        setDepartments(
          departmentRows.map((item: any) => ({
            id: item.id,
            name: item.name
          }))
        );
        setEngineers(
          engineerRows.map((item: any) => ({
            id: item.id,
            name: item.name
          }))
        );
        setAchievementUsers(
          userRows
            .filter((item: any) => ACHIEVEMENT_USER_ROLES.has(item.role))
            .map((item: any) => ({
              id: item.id,
              name: item.name
            }))
            .sort((a: AchievementUserOption, b: AchievementUserOption) =>
              a.name.localeCompare(b.name)
            )
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.error ||
            t('reports.filtersLoadFailed', { defaultValue: 'Failed to load report filters' })
        );
      } finally {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;

    const loadReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = buildQueryParams();
        const reportEndpoint =
          reportType === 'engineer' ? '/reports/engineer' : '/reports/department';

        const [reportResponse, summaryResponse] = await Promise.all([
          api.get(reportEndpoint, { params }),
          api.get('/reports/summary', { params })
        ]);
        if (cancelled) return;

        const reportRows = Array.isArray(reportResponse.data?.rows)
          ? reportResponse.data.rows
          : [];

        setRows(
          reportRows.map((row: any) => ({
            id: row.id ?? null,
            name: row.name || '-',
            totalTickets: parseNumber(row.totalTickets),
            openTickets: parseNumber(row.openTickets),
            closedTickets: parseNumber(row.closedTickets)
          }))
        );
        setSummary({
          totalTickets: parseNumber(summaryResponse.data?.totalTickets),
          openTickets: parseNumber(summaryResponse.data?.openTickets),
          closedTickets: parseNumber(summaryResponse.data?.closedTickets)
        });
      } catch (err: any) {
        if (cancelled) return;
        setRows([]);
        setSummary({ totalTickets: 0, openTickets: 0, closedTickets: 0 });
        setError(
          err?.response?.data?.error ||
            t('reports.loadFailed', { defaultValue: 'Failed to load reports' })
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, reportType, departmentId, engineerId, dateField, range, dateFrom, dateTo, t]);

  const handleRangeChange = (value: DateRange) => {
    setRange(value);
    if (value !== 'CUSTOM') {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleResetFilters = () => {
    setReportType('department');
    setDepartmentId('');
    setEngineerId('');
    setDateField('createdAt');
    setRange('MONTHLY');
    setDateFrom('');
    setDateTo('');
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setError(null);

      const response = await api.get('/reports/export', {
        params: {
          ...buildQueryParams(),
          reportType
        },
        responseType: 'blob'
      });

      downloadBlobResponse(response, `report-${reportType}.xlsx`);
    } catch (err: any) {
      setError(
        await getBlobErrorMessage(
          err,
          t('reports.exportFailed', { defaultValue: 'Failed to export report' })
        )
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleAchievementExport = async () => {
    const dateRangeError = getAchievementDateRangeError();
    if (dateRangeError) {
      setAchievementExportError(dateRangeError);
      return;
    }

    try {
      setAchievementExportLoading(true);
      setAchievementExportError(null);

      const response = await api.get('/reports/achievements/export', {
        params: buildAchievementExportParams(),
        responseType: 'blob'
      });

      downloadBlobResponse(response, 'achievements-report.xlsx');
    } catch (err: any) {
      setAchievementExportError(
        await getBlobErrorMessage(
          err,
          t('reports.achievementExportFailed', {
            defaultValue: 'Failed to export achievements'
          })
        )
      );
    } finally {
      setAchievementExportLoading(false);
    }
  };

  const handleViewAchievements = async () => {
    const dateRangeError = getAchievementDateRangeError();
    if (!achievementUserId) {
      setAchievementViewError(
        t('reports.achievementUserRequired', {
          defaultValue: 'Please select an engineer first.'
        })
      );
      return;
    }

    if (dateRangeError) {
      setAchievementViewError(dateRangeError);
      return;
    }

    try {
      setAchievementViewLoading(true);
      setAchievementViewError(null);

      const response = await api.get('/reports/achievements', {
        params: buildAchievementExportParams()
      });

      const rows = Array.isArray(response.data?.achievements)
        ? response.data.achievements
        : [];

      setAchievementRows(rows);
      setAchievementModalOpen(true);
    } catch (err: any) {
      setAchievementViewError(
        err?.response?.data?.error ||
          t('reports.achievementViewFailed', {
            defaultValue: 'Failed to load achievements'
          })
      );
    } finally {
      setAchievementViewLoading(false);
    }
  };

  const titleByType = useMemo(
    () =>
      reportType === 'engineer'
        ? t('reports.byEngineer', { defaultValue: 'By Engineer' })
        : t('reports.byDepartment', { defaultValue: 'By Department' }),
    [reportType, t]
  );

  const selectedAchievementUserName = useMemo(() => {
    return (
      achievementUsers.find((user) => user.id === achievementUserId)?.name ||
      t('reports.selectedEngineer', { defaultValue: 'Selected engineer' })
    );
  }, [achievementUserId, achievementUsers, t]);

  if (!roleChecked || !hasAccess) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (filtersLoading) {
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
      <div className="px-4 py-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('reports.title', { defaultValue: 'Reports' })}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('reports.subtitle', {
                defaultValue: 'Analyze ticket volume and resolution performance.'
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading || loading}
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportLoading
              ? t('reports.exporting', { defaultValue: 'Exporting...' })
              : t('reports.export', { defaultValue: 'Export' })}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.reportType', { defaultValue: 'Report Type' })}
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="department">
                  {t('reports.byDepartment', { defaultValue: 'By Department' })}
                </option>
                <option value="engineer">
                  {t('reports.byEngineer', { defaultValue: 'By Engineer' })}
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.department', { defaultValue: 'Department' })}
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">{t('reports.allDepartments', { defaultValue: 'All departments' })}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.engineer', { defaultValue: 'Engineer' })}
              </label>
              <select
                value={engineerId}
                onChange={(e) => setEngineerId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">{t('reports.allEngineers', { defaultValue: 'All engineers' })}</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.dateField', { defaultValue: 'Date Field' })}
              </label>
              <select
                value={dateField}
                onChange={(e) => setDateField(e.target.value as DateField)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="createdAt">
                  {t('reports.createdDate', { defaultValue: 'Created date' })}
                </option>
                <option value="updatedAt">
                  {t('reports.updatedDate', { defaultValue: 'Updated date' })}
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.range', { defaultValue: 'Range' })}
              </label>
              <select
                value={range}
                onChange={(e) => handleRangeChange(e.target.value as DateRange)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="WEEKLY">{t('reports.weekly', { defaultValue: 'Weekly' })}</option>
                <option value="MONTHLY">{t('reports.monthly', { defaultValue: 'Monthly' })}</option>
                <option value="QUARTERLY">{t('reports.quarterly', { defaultValue: 'Quarterly' })}</option>
                <option value="SEMI_ANNUAL">
                  {t('reports.semiAnnual', { defaultValue: 'Semi-Annual' })}
                </option>
                <option value="YEARLY">{t('reports.yearly', { defaultValue: 'Yearly' })}</option>
                <option value="CUSTOM">{t('reports.custom', { defaultValue: 'Custom' })}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 xl:col-span-1">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('reports.startDate', { defaultValue: 'Start Date' })}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  disabled={range !== 'CUSTOM'}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('reports.endDate', { defaultValue: 'End Date' })}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  disabled={range !== 'CUSTOM'}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              {t('reports.resetFilters', { defaultValue: 'Reset Filters' })}
            </button>
            <span className="text-xs text-gray-500">
              {t('reports.filtersApplied', {
                defaultValue:
                  'Filters update results automatically. Use Export to download the same view.'
              })}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('reports.achievementsExportTitle', {
                  defaultValue: 'Achievements Export'
                })}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('reports.achievementsExportSubtitle', {
                  defaultValue:
                    'Download achievements for one user or all eligible users within an optional date range.'
                })}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {currentUserRole === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={handleViewAchievements}
                  disabled={achievementViewLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {achievementViewLoading
                    ? t('reports.loadingAchievements', { defaultValue: 'Loading...' })
                    : t('reports.viewAchievements', { defaultValue: 'View Achievements' })}
                </button>
              )}
              <button
                type="button"
                onClick={handleAchievementExport}
                disabled={achievementExportLoading}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {achievementExportLoading
                  ? t('reports.exporting', { defaultValue: 'Exporting...' })
                  : t('reports.exportAchievements', { defaultValue: 'Export Achievements' })}
              </button>
            </div>
          </div>

          {achievementExportError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {achievementExportError}
            </div>
          )}

          {achievementViewError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {achievementViewError}
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.achievementUser', { defaultValue: 'User' })}
              </label>
              <select
                value={achievementUserId}
                onChange={(e) => setAchievementUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">
                  {t('reports.allAchievementUsers', {
                    defaultValue: 'All eligible users'
                  })}
                </option>
                {achievementUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.achievementStartDate', { defaultValue: 'Start Date' })}
              </label>
              <input
                type="date"
                value={achievementDateFrom}
                onChange={(e) => setAchievementDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('reports.achievementEndDate', { defaultValue: 'End Date' })}
              </label>
              <input
                type="date"
                value={achievementDateTo}
                onChange={(e) => setAchievementDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <p className="text-sm font-medium text-gray-600">
              {t('reports.totalTickets', { defaultValue: 'Total Tickets' })}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalTickets}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <p className="text-sm font-medium text-gray-600">
              {t('reports.openTickets', { defaultValue: 'Open Tickets' })}
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{summary.openTickets}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <p className="text-sm font-medium text-gray-600">
              {t('reports.closedTickets', { defaultValue: 'Closed Tickets' })}
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.closedTickets}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{titleByType}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-start">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {t('reports.name', { defaultValue: 'Name' })}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {t('reports.total', { defaultValue: 'Total' })}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {t('reports.open', { defaultValue: 'Open' })}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold uppercase tracking-wider text-gray-700">
                    {t('reports.closed', { defaultValue: 'Closed' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      {t('common.loading', { defaultValue: 'Loading...' })}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      {t('reports.empty', { defaultValue: 'No report data found for the selected filters.' })}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id || row.name}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.totalTickets}</td>
                      <td className="px-6 py-4 text-sm text-amber-700">{row.openTickets}</td>
                      <td className="px-6 py-4 text-sm text-emerald-700">{row.closedTickets}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {achievementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {t('reports.achievementModalTitle', {
                      defaultValue: 'Achievements'
                    })}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedAchievementUserName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAchievementModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('reports.close', { defaultValue: 'Close' })}
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {achievementRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                  {t('reports.achievementEmpty', {
                    defaultValue: 'No achievements were found for the selected engineer and date range.'
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {achievementRows.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-base font-semibold text-gray-900">
                          {achievement.title}
                        </h3>
                        <span className="text-xs font-medium text-gray-400">
                          {format(new Date(achievement.createdAt), 'MMM d, yyyy HH:mm', {
                            locale: i18n.language?.startsWith('ar') ? ar : undefined
                          })}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {achievement.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
