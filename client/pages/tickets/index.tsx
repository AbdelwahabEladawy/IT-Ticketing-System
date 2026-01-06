import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  slaDeadline: string;
  slaStatus: string;
  assignedTo?: { name: string };
  createdBy?: { name: string };
  specialization?: { name: string };
}

export default function Tickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Failed to load tickets');
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <button
            onClick={() => router.push('/tickets/create')}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Create Ticket
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Anydesk Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SLA</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`font-medium ${ticket.slaStatus === 'OVERDUE' ? 'text-red-600' : 'text-gray-900'}`}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">No tickets found</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
