import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  issueType?: string;
  problemType: string;
  slaDeadline: string;
  slaStatus: string;
  assignedTo?: { id: string; name: string };
  createdBy?: { name: string };
  specialization?: { name: string };
}

export default function TicketDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadUser();
      loadTechnicians();
      loadSpecializations();
    }
  }, [id]);

  const loadTicket = async () => {
    try {
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data.ticket);
    } catch (error) {
      console.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get('/users/technicians');
      console.log('Technicians loaded:', response.data.technicians);
      setTechnicians(response.data.technicians || []);
    } catch (error) {
      console.error('Failed to load technicians:', error);
      setTechnicians([]);
    }
  };

  const loadSpecializations = async () => {
    try {
      const response = await api.get('/specializations');
      setSpecializations(response.data.specializations);
    } catch (error) {
      console.error('Failed to load specializations');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(newStatus);
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus });
      await loadTicket();
    } catch (error) {
      console.error('Failed to update status');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleAssign = async (specializationId: string) => {
    try {
      await api.post(`/tickets/${id}/assign`, { specializationId });
      loadTicket();
    } catch (error) {
      console.error('Failed to assign ticket');
    }
  };

  const handleReassign = async (specializationId: string, technicianId?: string) => {
    try {
      // For CUSTOM tickets: use specializationId only
      // For other tickets: use technicianId
      if (ticket?.problemType === 'CUSTOM') {
        await api.post(`/tickets/${id}/reassign`, { specializationId });
      } else {
        if (!technicianId) {
          console.error('Technician ID required for non-custom tickets');
          return;
        }
        await api.post(`/tickets/${id}/reassign`, { technicianId });
      }
      loadTicket();
    } catch (error) {
      console.error('Failed to reassign ticket');
    }
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

  if (!ticket) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Ticket not found</p>
        </div>
      </Layout>
    );
  }

  // Technician can update tickets assigned to them
  // IT Admin can update tickets assigned to IT Admin team
  const canUpdateStatus = 
    (user?.role === 'TECHNICIAN' && ticket.assignedTo?.id === user.id) ||
    (user?.role === 'IT_ADMIN' && ticket.specialization?.name === 'IT Admin');
  // IT Admin can assign CUSTOM tickets to teams (even if already assigned to a team, they can reassign)
  const canAssign = user?.role === 'IT_ADMIN' && ticket.problemType === 'CUSTOM';
  const canReassign = user?.role === 'IT_MANAGER' || user?.role === 'IT_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800 mb-4 font-medium transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200">
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">Description</h2>
            <p className="text-gray-700 leading-relaxed">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <p className="text-lg font-semibold text-gray-900">{ticket.status}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Anydesk Number</h3>
              <p className="text-lg font-semibold text-indigo-600">{ticket.anydeskNumber || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Problem Type</h3>
              <p className="text-lg font-semibold text-gray-900">{ticket.problemType}</p>
            </div>
            {ticket.issueType && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Issue Type</h3>
                <p className="text-lg font-semibold text-indigo-600">{ticket.issueType}</p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Specialization</h3>
              <p className="text-lg font-semibold text-gray-900">{ticket.specialization?.name || 'Not specified'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned Technician</h3>
              <p className="text-lg font-semibold text-gray-900">{ticket.assignedTo?.name || 'Unassigned'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">SLA Status</h3>
              <p className={`text-lg font-semibold ${ticket.slaStatus === 'OVERDUE' ? 'text-red-600' : 'text-gray-900'}`}>
                {ticket.slaStatus}
              </p>
              {ticket.slaDeadline && (
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(ticket.slaDeadline), 'MMM dd, yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>

          {canUpdateStatus && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Update Status</h3>
              <div className="flex space-x-2">
                {['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusLoading !== null}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {statusLoading === status ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      status
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canAssign && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Assign to Team</h3>
              {specializations.length === 0 ? (
                <p className="text-gray-500">No specializations available</p>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  defaultValue=""
                >
                  <option value="">Select team (specialization)</option>
                  {specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name} {spec.description ? `- ${spec.description}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {canReassign && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {ticket.problemType === 'CUSTOM' ? 'Reassign to Team' : 'Reassign Ticket'}
              </h3>
              {ticket.problemType === 'CUSTOM' ? (
                // For CUSTOM tickets: Show specialization selection
                specializations.length === 0 ? (
                  <p className="text-gray-500">No specializations available</p>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleReassign(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    defaultValue=""
                  >
                    <option value="">Select team (specialization)</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name} {spec.description ? `- ${spec.description}` : ''}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                // For non-CUSTOM tickets: Show technician selection (existing behavior)
                technicians.length === 0 ? (
                  <p className="text-gray-500">No technicians available</p>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleReassign('', e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    defaultValue=""
                  >
                    <option value="">Select technician</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} - {tech.specialization?.name || 'No specialization'} ({tech.status || 'N/A'})
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
