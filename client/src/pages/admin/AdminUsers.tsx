import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Search, Filter, UserCheck, UserX, Plus, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: string;
  status: string;
  referralCode: string;
  createdAt: string;
}

interface Application {
  id: string;
  affiliateId: string;
  affiliateEmail: string;
  affiliateName: string;
  offerId: string;
  offerName: string;
  status: string;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'applications'>('users');
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'affiliate'
  });

  useEffect(() => {
    loadUsers();
    loadApplications();
  }, [filters]);

  async function loadUsers() {
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/admin/users?${params}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications() {
    try {
      const response = await api.get('/api/admin/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  }

  async function updateUserStatus(userId: string, status: string) {
    try {
      await api.put(`/api/admin/users/${userId}/status`, { status });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  }

  async function handleApplication(applicationId: string, status: 'approved' | 'rejected') {
    try {
      await api.put(`/api/admin/applications/${applicationId}`, { status });
      loadApplications();
    } catch (error) {
      console.error('Failed to update application:', error);
    }
  }

  async function createUser() {
    try {
      await api.post('/api/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'affiliate' });
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600">View and manage affiliates and advertisers</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'applications'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Applications ({applications.length})
          </button>
        </nav>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="input w-auto"
            >
              <option value="">All Roles</option>
              <option value="affiliate">Affiliate</option>
              <option value="advertiser">Advertiser</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input w-auto"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Users table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.company && <p className="text-xs text-gray-400">{user.company}</p>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-info' :
                        user.role === 'advertiser' ? 'badge-gray' : 'badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        user.status === 'active' ? 'badge-success' :
                        user.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="text-gray-600">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {user.status !== 'active' && (
                          <button
                            onClick={() => updateUserStatus(user.id, 'active')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Activate"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {user.status !== 'suspended' && user.role !== 'admin' && (
                          <button
                            onClick={() => updateUserStatus(user.id, 'suspended')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Suspend"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'applications' && (
        <>
          {applications.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{app.affiliateName}</p>
                    <p className="text-sm text-gray-500">{app.affiliateEmail}</p>
                    <p className="text-sm mt-1">
                      Wants to run: <span className="font-medium">{app.offerName}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Applied: {format(new Date(app.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplication(app.id, 'approved')}
                      className="btn btn-success"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApplication(app.id, 'rejected')}
                      className="btn btn-danger"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input"
                >
                  <option value="affiliate">Affiliate</option>
                  <option value="advertiser">Advertiser</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={createUser} className="btn btn-primary flex-1">
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
