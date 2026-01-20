import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Edit2, X } from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  payoutType: string;
  payoutAmount: number;
  revenueAmount: number;
  status: string;
  requiresApproval: boolean;
  createdAt: string;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category: '',
    payoutType: 'cpa',
    payoutAmount: 0,
    revenueAmount: 0,
    requiresApproval: false,
    status: 'active'
  });

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    try {
      const response = await api.get('/api/admin/offers');
      setOffers(response.data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingOffer(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      category: '',
      payoutType: 'cpa',
      payoutAmount: 0,
      revenueAmount: 0,
      requiresApproval: false,
      status: 'active'
    });
    setShowModal(true);
  }

  function openEditModal(offer: Offer) {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description || '',
      url: offer.url,
      category: offer.category || '',
      payoutType: offer.payoutType,
      payoutAmount: offer.payoutAmount,
      revenueAmount: offer.revenueAmount,
      requiresApproval: offer.requiresApproval,
      status: offer.status
    });
    setShowModal(true);
  }

  async function saveOffer() {
    try {
      if (editingOffer) {
        await api.put(`/api/offers/${editingOffer.id}`, formData);
      } else {
        await api.post('/api/offers', formData);
      }
      setShowModal(false);
      loadOffers();
    } catch (error) {
      console.error('Failed to save offer:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Manage Offers</h1>
          <p className="text-gray-600">Create and manage offers for affiliates</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Create Offer
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Payout</th>
              <th>Revenue</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td>
                  <div>
                    <p className="font-medium text-gray-900">{offer.name}</p>
                    {offer.requiresApproval && (
                      <span className="text-xs text-yellow-600">Requires approval</span>
                    )}
                  </div>
                </td>
                <td>{offer.category || '-'}</td>
                <td className="text-green-600 font-medium">${offer.payoutAmount.toFixed(2)}</td>
                <td className="font-medium">${offer.revenueAmount.toFixed(2)}</td>
                <td className="uppercase text-xs">{offer.payoutType}</td>
                <td>
                  <span className={`badge ${
                    offer.status === 'active' ? 'badge-success' :
                    offer.status === 'paused' ? 'badge-warning' : 'badge-gray'
                  }`}>
                    {offer.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => openEditModal(offer)}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingOffer ? 'Edit Offer' : 'Create Offer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Offer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="Offer description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="input"
                  placeholder="https://example.com?click_id={click_id}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                  placeholder="e.g., Software, Finance, Gaming"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout Type</label>
                  <select
                    value={formData.payoutType}
                    onChange={(e) => setFormData({ ...formData, payoutType: e.target.value })}
                    className="input"
                  >
                    <option value="cpa">CPA</option>
                    <option value="cpl">CPL</option>
                    <option value="cpc">CPC</option>
                    <option value="cpi">CPI</option>
                    <option value="revshare">RevShare</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.payoutAmount}
                    onChange={(e) => setFormData({ ...formData, payoutAmount: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.revenueAmount}
                    onChange={(e) => setFormData({ ...formData, revenueAmount: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Requires approval</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={saveOffer}
                disabled={!formData.name || !formData.url || !formData.payoutAmount}
                className="btn btn-primary flex-1"
              >
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
