import { useState, useEffect } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import { Filter, Download, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Conversion {
  id: string;
  clickId: string;
  conversionId: string;
  offerId: string;
  offerName: string;
  eventType: string;
  status: string;
  revenue: number;
  payout: number;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  country?: string;
  transactionId?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface Summary {
  totalConversions: number;
  approved: number;
  pending: number;
  rejected: number;
  totalPayout: number;
  pendingPayout: number;
}

export default function Conversions() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    offerId: '',
    status: ''
  });

  useEffect(() => {
    loadConversions();
  }, [filters]);

  async function loadConversions() {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.offerId) params.append('offerId', filters.offerId);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/api/conversions?${params}`);
      setConversions(response.data.conversions);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to load conversions:', error);
    } finally {
      setLoading(false);
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
      case 'reversed':
        return <span className="badge badge-gray">Reversed</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversions</h1>
          <p className="text-gray-600">View and track your conversion history</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Conversions</p>
            <p className="text-2xl font-bold">{summary.totalConversions}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">${summary.totalPayout.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', offerId: '', status: '' })}
              className="btn btn-secondary"
            >
              Clear Filters
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
                <th>Click ID</th>
                <th>Sub1</th>
                <th>Sub2</th>
                <th>Status</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conversions.map((conv) => (
                <tr key={conv.id}>
                  <td className="text-gray-900">
                    {format(new Date(conv.createdAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td>
                    <span className="font-medium text-gray-900">{conv.offerName}</span>
                  </td>
                  <td>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{conv.clickId}</code>
                  </td>
                  <td className="text-gray-600">{conv.sub1 || '-'}</td>
                  <td className="text-gray-600">{conv.sub2 || '-'}</td>
                  <td>{getStatusBadge(conv.status)}</td>
                  <td>
                    <span className={`font-semibold ${conv.status === 'approved' ? 'text-green-600' : 'text-gray-600'}`}>
                      ${conv.payout.toFixed(2)}
                    </span>
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
