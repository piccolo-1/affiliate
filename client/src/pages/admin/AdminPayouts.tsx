import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Plus, Check, X, DollarSign } from 'lucide-react';

interface Payout {
  id: string;
  affiliateId: string;
  affiliateEmail: string;
  affiliateName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  processedAt?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [affiliates, setAffiliates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPayout, setNewPayout] = useState({
    affiliateId: '',
    amount: 0,
    paymentMethod: 'paypal',
    notes: ''
  });

  useEffect(() => {
    loadPayouts();
    loadAffiliates();
  }, []);

  async function loadPayouts() {
    try {
      const response = await api.get('/api/admin/payouts');
      setPayouts(response.data);
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAffiliates() {
    try {
      const response = await api.get('/api/admin/users?role=affiliate');
      setAffiliates(response.data);
    } catch (error) {
      console.error('Failed to load affiliates:', error);
    }
  }

  async function createPayout() {
    try {
      await api.post('/api/admin/payouts', newPayout);
      setShowCreateModal(false);
      setNewPayout({ affiliateId: '', amount: 0, paymentMethod: 'paypal', notes: '' });
      loadPayouts();
    } catch (error) {
      console.error('Failed to create payout:', error);
    }
  }

  async function updatePayoutStatus(id: string, status: string, transactionId?: string) {
    try {
      await api.put(`/api/admin/payouts/${id}`, { status, transactionId });
      loadPayouts();
    } catch (error) {
      console.error('Failed to update payout:', error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'processing':
        return <span className="badge badge-warning">Processing</span>;
      case 'pending':
        return <span className="badge badge-info">Pending</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  }

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalProcessing = payouts.filter(p => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0);
  const totalCompleted = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Manage Payouts</h1>
          <p className="text-gray-600">Process affiliate payments</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Create Payout
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-xl font-bold text-blue-600">${totalProcessing.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed (Total)</p>
              <p className="text-xl font-bold text-green-600">${totalCompleted.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payouts table */}
      {payouts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No payouts yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Affiliate</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="text-gray-900">
                    {format(new Date(payout.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{payout.affiliateName}</p>
                      <p className="text-sm text-gray-500">{payout.affiliateEmail}</p>
                    </div>
                  </td>
                  <td className="font-bold text-green-600">${payout.amount.toFixed(2)}</td>
                  <td className="capitalize">{payout.paymentMethod}</td>
                  <td>{getStatusBadge(payout.status)}</td>
                  <td>
                    {payout.transactionId ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{payout.transactionId}</code>
                    ) : '-'}
                  </td>
                  <td>
                    {payout.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updatePayoutStatus(payout.id, 'processing')}
                          className="btn btn-secondary text-xs py-1 px-2"
                        >
                          Process
                        </button>
                      </div>
                    )}
                    {payout.status === 'processing' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const txId = prompt('Transaction ID:');
                            if (txId) {
                              updatePayoutStatus(payout.id, 'completed', txId);
                            }
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Mark Completed"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updatePayoutStatus(payout.id, 'failed')}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Mark Failed"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Payout</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate</label>
                <select
                  value={newPayout.affiliateId}
                  onChange={(e) => setNewPayout({ ...newPayout, affiliateId: e.target.value })}
                  className="input"
                >
                  <option value="">Select affiliate...</option>
                  {affiliates.map((a) => (
                    <option key={a.id} value={a.id}>{a.firstName} {a.lastName} ({a.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayout.amount}
                  onChange={(e) => setNewPayout({ ...newPayout, amount: Number(e.target.value) })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={newPayout.paymentMethod}
                  onChange={(e) => setNewPayout({ ...newPayout, paymentMethod: e.target.value })}
                  className="input"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="payoneer">Payoneer</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newPayout.notes}
                  onChange={(e) => setNewPayout({ ...newPayout, notes: e.target.value })}
                  className="input"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={createPayout}
                disabled={!newPayout.affiliateId || newPayout.amount <= 0}
                className="btn btn-primary flex-1"
              >
                Create Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
