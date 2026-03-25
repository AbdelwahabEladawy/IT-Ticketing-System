import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  slaDeadline: string;
  slaStatus: string;
  createdAt: string;
  assignedTo?: { name: string } | null;
  specialization?: { name: string };
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED' | 'CLOSED' | 'PENDING'>('ALL');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const currentUser = await getCurrentUser();
      setUserRole(currentUser?.role ?? null);
    };
    loadRole();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboard(response.data.dashboard);
    } catch (error) {
      console.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      OPEN: 'bg-gray-100 text-gray-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSLAStatusColor = (slaStatus: string) => {
    const colors: { [key: string]: string } = {
      OK: 'text-green-600',
      WARNING: 'text-yellow-600',
      URGENT: 'text-orange-600',
      OVERDUE: 'text-red-600'
    };
    return colors[slaStatus] || 'text-gray-600';
  };

  const summaryCards = dashboard?.stats
    ? [
        {
          key: 'ALL',
          label: 'Total Tickets',
          value: dashboard.stats.total ?? dashboard.stats.totalTickets ?? 0
        },
        {
          key: 'OPEN',
          label: 'Open',
          value: dashboard.stats.open ?? 0
        },
        {
          key: 'RESOLVED',
          label: 'Resolved',
          value: dashboard.stats.resolved ?? 0
        },
        {
          key: 'CLOSED',
          label: 'Closed',
          value: dashboard.stats.closed ?? 0
        }
      ]
    : [];

  const filteredTickets = (dashboard?.tickets || []).filter((ticket: Ticket) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') {
      // "pending" should include only:
      // - assigned: status = ASSIGNED
      // - unassigned: status = OPEN AND no technician assigned yet (assignedTo is null)
      return ticket.status === 'ASSIGNED' || (ticket.status === 'OPEN' && !ticket.assignedTo);
    }
    return ticket.status === activeFilter;
  });

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {dashboard?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...summaryCards,
              ...(userRole === 'SUPER_ADMIN'
                ? [
                    {
                      key: 'PENDING',
                      label: 'Pending',
                      value: (dashboard?.tickets || []).filter(
                        (t: Ticket) =>
                          t.status === 'ASSIGNED' || (t.status === 'OPEN' && !t.assignedTo)
                      ).length
                    }
                  ]
                : [])].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveFilter(card.key as any)}
                className={`text-left rounded-xl shadow-lg p-6 border transition-all ${
                  activeFilter === card.key
                    ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50'
                    : 'bg-white border-gray-200 hover:shadow-xl'
                }`}
              >
                <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">{card.label}</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{card.value}</div>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h2 className="text-xl font-semibold text-gray-900">Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Anydesk Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SLA</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket: Ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-500">{ticket.description.substring(0, 50)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-indigo-600">
                        {ticket.anydeskNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getSLAStatusColor(ticket.slaStatus)}`}>
                        {ticket.slaStatus}
                      </div>
                      {ticket.slaDeadline && (
                        <div className="text-xs text-gray-500">
                          {format(new Date(ticket.slaDeadline), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.assignedTo?.name || (ticket.specialization?.name ? `Team: ${ticket.specialization.name}` : 'Unassigned')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.createdAt && format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No tickets found for {activeFilter === 'ALL' ? 'the selected view' : activeFilter}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
