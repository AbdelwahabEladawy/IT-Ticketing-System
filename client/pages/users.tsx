import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getCurrentUser } from '../utils/auth';

export default function Users() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadUsers();
  }, []);

  // Reload when component becomes visible (after navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUsers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadUser = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/technicians');
      console.log('Loaded technicians:', response.data.technicians);
      const technicians = response.data.technicians || [];
      console.log(`Total technicians loaded: ${technicians.length}`);
      setUsers(technicians);
    } catch (error) {
      console.error('Failed to load technicians:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await api.patch(`/users/${userId}/status`, { status });
      // Update local state immediately for better UX
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status } : user
      ));
      // Reload to ensure consistency
      loadUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update technician status. Please try again.');
      // Reload to revert any optimistic updates
      loadUsers();
    }
  };

  const canChangeStatus = currentUser?.role === 'IT_MANAGER' || currentUser?.role === 'IT_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

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
          <h1 className="text-3xl font-bold text-gray-900">Technicians</h1>
          {(currentUser?.role === 'IT_MANAGER' || currentUser?.role === 'SUPER_ADMIN') && (
            <button
              onClick={() => router.push('/users/create')}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Add Technician
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Active Tickets</th>
                  {canChangeStatus && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Change Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={canChangeStatus ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                      No technicians found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {user.specialization?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                          user.status === 'BUSY' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{user._count?.assignedTickets || 0} active</span>
                      </td>
                      {canChangeStatus && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.status || 'AVAILABLE'}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              handleStatusChange(user.id, newStatus);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white hover:bg-gray-50 cursor-pointer font-medium"
                          >
                            <option value="AVAILABLE">Available</option>
                            <option value="BUSY">Busy</option>
                            <option value="OFFLINE">Offline</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
