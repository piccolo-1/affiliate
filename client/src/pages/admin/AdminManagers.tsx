import { useState, useEffect } from 'react';
import { Plus, Search, Phone, MessageCircle, Users, Trash2, X, Check } from 'lucide-react';
import api from '../../lib/api';

interface Manager {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  skype?: string;
  telegram?: string;
  status: string;
  createdAt: string;
  affiliateCount: number;
}

interface Affiliate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  status: string;
  managerId?: string;
}

export default function AdminManagers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    skype: '',
    telegram: ''
  });

  useEffect(() => {
    fetchManagers();
    fetchAffiliates();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/admin/managers');
      setManagers(response.data.managers);
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliates = async () => {
    try {
      const response = await api.get('/admin/users?role=affiliate');
      setAffiliates(response.data.users);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/managers', formData);
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        company: '',
        phone: '',
        skype: '',
        telegram: ''
      });
      fetchManagers();
    } catch (error) {
      console.error('Error creating manager:', error);
    }
  };

  const handleAssignAffiliate = async (affiliateId: string, managerId: string | null) => {
    try {
      await api.put(`/admin/users/${affiliateId}/manager`, { managerId });
      fetchAffiliates();
      fetchManagers();
    } catch (error) {
      console.error('Error assigning affiliate:', error);
    }
  };

  const handleDeleteManager = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this manager?')) return;
    try {
      await api.delete(`/admin/managers/${managerId}`);
      fetchManagers();
    } catch (error) {
      console.error('Error deleting manager:', error);
    }
  };

  const filteredManagers = managers.filter(manager =>
    manager.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getManagerAffiliates = (managerId: string) => {
    return affiliates.filter(a => a.managerId === managerId);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Managers</h1>
          <p className="text-gray-500 mt-1">Manage your team and their assigned affiliates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Manager
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search managers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Managers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredManagers.map(manager => (
          <div key={manager.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  {manager.firstName[0]}{manager.lastName[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {manager.firstName} {manager.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{manager.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSelectedManager(manager);
                    setShowAssignModal(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="Manage Affiliates"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteManager(manager.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete Manager"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {manager.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{manager.phone}</span>
                  </div>
                )}
                {manager.skype && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{manager.skype}</span>
                  </div>
                )}
                {manager.telegram && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <span>@{manager.telegram.replace('@', '')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Assigned Affiliates</span>
                <span className="badge badge-info">{manager.affiliateCount}</span>
              </div>
              {getManagerAffiliates(manager.id).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {getManagerAffiliates(manager.id).slice(0, 3).map(aff => (
                    <span key={aff.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {aff.firstName} {aff.lastName}
                    </span>
                  ))}
                  {getManagerAffiliates(manager.id).length > 3 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      +{getManagerAffiliates(manager.id).length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredManagers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No managers found</h3>
          <p className="text-gray-500 mt-1">Create your first manager to get started</p>
        </div>
      )}

      {/* Create Manager Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Manager</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company (Optional)</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skype</label>
                  <input
                    type="text"
                    value={formData.skype}
                    onChange={(e) => setFormData({ ...formData, skype: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label>
                <input
                  type="text"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  placeholder="@username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Affiliates Modal */}
      {showAssignModal && selectedManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Manage Affiliates</h2>
                <p className="text-sm text-gray-500">
                  Assign affiliates to {selectedManager.firstName} {selectedManager.lastName}
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {affiliates.map(affiliate => (
                <div
                  key={affiliate.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    affiliate.managerId === selectedManager.id
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-sm">
                      {affiliate.firstName[0]}{affiliate.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {affiliate.firstName} {affiliate.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{affiliate.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignAffiliate(
                      affiliate.id,
                      affiliate.managerId === selectedManager.id ? null : selectedManager.id
                    )}
                    className={`p-2 rounded-lg transition-colors ${
                      affiliate.managerId === selectedManager.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
