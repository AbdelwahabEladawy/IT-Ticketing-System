import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';
import { connectTicketMessages, disconnectTicketMessages } from '../../utils/ticketMessages';
import { formatTicketStatusLabel as formatStatus } from '../../utils/ticketStatusLabel';
import { capitalizeFirstLetter } from '../../utils/text';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  slaDeadline: string;
  slaStatus: string;
  assignedTo?: { name: string };
  createdBy?: { name: string; email?: string };
  specialization?: { name: string };
}
const TICKETS_PAGE_SIZE = 10;

export default function Tickets() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) setSessionUserId(u?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTickets = async (opts?: { silent?: boolean }) => {
    try {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      const response = await api.get('/tickets');
      setTickets(response.data.tickets);
    } catch (err: any) {
      console.error('Failed to load tickets');
      setError(err?.response?.data?.error || t('tickets.loadFailed'));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const loadTicketsRef = useRef(loadTickets);
  loadTicketsRef.current = loadTickets;

  const scheduleTicketsReload = () => {
    if (typeof window === 'undefined') return;
    if (reloadTimerRef.current) return;

    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null;
      void loadTicketsRef.current({ silent: true });
    }, 300);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onFocus = () => {
      void loadTicketsRef.current({ silent: true });
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadTicketsRef.current({ silent: true });
      }
    }, 8000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const shouldReloadTicketsFromWs = (payload: any) => {
    if (!payload) return false;
    if (payload.type === 'ticket_list_updated') return true;
    if (payload.ticketId) return true;
    if (payload.type === 'notification_created') return true;
    return false;
  };

  useEffect(() => {
    if (!sessionUserId) return;

    const onPayload = (payload: any) => {
      if (!shouldReloadTicketsFromWs(payload)) return;
      scheduleTicketsReload();
    };

    connectTicketMessages(onPayload);

    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      disconnectTicketMessages(onPayload);
    };
  }, [sessionUserId]);

  const formatTicketStatusLabel = (status: string) => formatStatus(status, t);
  const openTicketDetails = (ticketId: string) => {
    void router.push(`/tickets/${ticketId}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      OPEN: 'bg-gray-100 text-gray-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      USER_ACTION_NEEDED: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const trimDescription = (text: string | null | undefined, maxLength = 50) => {
    const value = text?.trim() || '';
    return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
  };

  const totalPages = Math.max(1, Math.ceil(tickets.length / TICKETS_PAGE_SIZE));
  const pageStart = (currentPage - 1) * TICKETS_PAGE_SIZE;
  const paginatedTickets = tickets.slice(pageStart, pageStart + TICKETS_PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('tickets.title')}</h1>
          <button
            onClick={() => router.push('/tickets/create')}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            {t('tickets.createTicket')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-full w-full table-auto divide-y divide-gray-200 text-start">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colTitle')}</th>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colStatus')}</th>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colAnydesk')}</th>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colCustomer')}</th>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colEngineer')}</th>
                  <th className="px-4 sm:px-6 py-4 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">{t('tickets.colActions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicketDetails(ticket.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTicketDetails(ticket.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 max-w-xs sm:max-w-md align-top">
                      <div className="text-sm font-medium text-gray-900 break-words">{capitalizeFirstLetter(ticket.title)}</div>
                      <div className="text-sm text-gray-500 break-words line-clamp-2">{trimDescription(ticket.description)}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {formatTicketStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                      <span className="text-sm font-medium text-indigo-600">
                        {ticket.anydeskNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.createdBy?.name || 'N/A'}
                      </div>
                      {ticket.createdBy?.email && (
                        <div className="text-xs text-gray-500">{ticket.createdBy.email}</div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      {ticket.assignedTo?.name ||
                        (ticket.specialization?.name
                          ? `${t('dashboard.teamPrefix')}: ${ticket.specialization.name}`
                          : t('dashboard.unassigned'))}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm align-top">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openTicketDetails(ticket.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {t('tickets.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">{t('tickets.none')}</div>
            )}
            {tickets.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {t('common.pageIndicator', {
                    defaultValue: 'Page {{current}} of {{total}}',
                    current: currentPage,
                    total: totalPages
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.previous', { defaultValue: 'Previous' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.next', { defaultValue: 'Next' })}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
