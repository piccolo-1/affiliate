import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

interface Conversion {
  id: string;
  clickId: string;
  offerName: string;
  affiliateEmail: string;
  status: string;
  revenue: number;
  payout: number;
  sub1?: string;
  sub2?: string;
  createdAt: string;
}

export default function AdminConversions() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadConversions();
  }, [filters]);

  async function loadConversions() {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/api/admin/conversions?${params}`);
      setConversions(response.data);
    } catch (error) {
      console.error('Failed to load conversions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateConversionStatus(id: string, status: string, rejectionReason?: string) {
    try {
      await api.put(`/api/admin/conversions/${id}`, { status, rejectionReason });
      loadConversions();
    } catch (error) {
      console.error('Failed to update conversion:', error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
      case 'pending':
        return <span className="badge badge-warning"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Conversions</h1>
        <p className="text-gray-600">Review and manage conversion status</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Conversions table */}
      {conversions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No conversions found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Offer</th>
                <th>Affiliate</th>
                <th>Click ID</th>
                <th>Sub1</th>
                <th>Revenue</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conversions.map((conv) => (
                <tr key={conv.id}>
                  <td className="text-gray-900">
                    {format(new Date(conv.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td className="font-medium">{conv.offerName}</td>
                  <td className="text-gray-600">{conv.affiliateEmail}</td>
                  <td>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {conv.clickId?.substring(0, 12)}...
                    </code>
                  </td>
                  <td className="text-gray-600">{conv.sub1 || '-'}</td>
                  <td className="font-medium">${conv.revenue.toFixed(2)}</td>
                  <td className="text-green-600 font-medium">${conv.payout.toFixed(2)}</td>
                  <td>{getStatusBadge(conv.status)}</td>
                  <td>
                    {conv.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateConversionStatus(conv.id, 'approved')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason !== null) {
                              updateConversionStatus(conv.id, 'rejected', reason);
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {conv.status === 'approved' && (
                      <button
                        onClick={() => updateConversionStatus(conv.id, 'reversed')}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
