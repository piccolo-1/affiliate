import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Copy, Check, Trash2, X } from 'lucide-react';

interface TrackingLink {
  id: string;
  offerId: string;
  offerName: string;
  shortCode: string;
  name: string;
  trackingUrl: string;
  defaultSub1?: string;
  defaultSub2?: string;
  defaultSub3?: string;
  defaultSub4?: string;
  defaultSub5?: string;
  status: string;
  payout: number;
  payoutType: string;
  createdAt: string;
}

interface Offer {
  id: string;
  name: string;
  payoutAmount: number;
}

export default function TrackingLinks() {
  const [searchParams] = useSearchParams();
  const preSelectedOfferId = searchParams.get('offerId');

  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(!!preSelectedOfferId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({
    offerId: preSelectedOfferId || '',
    name: '',
    defaultSub1: '',
    defaultSub2: '',
    defaultSub3: '',
    defaultSub4: '',
    defaultSub5: ''
  });

  useEffect(() => {
    loadLinks();
    loadOffers();
  }, []);

  async function loadLinks() {
    try {
      const response = await api.get('/api/affiliate/links');
      setLinks(response.data);
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOffers() {
    try {
      const response = await api.get('/api/offers');
      setOffers(response.data.offers.filter((o: any) =>
        o.myStatus === 'approved' || !o.requiresApproval
      ));
    } catch (error) {
      console.error('Failed to load offers:', error);
    }
  }

  async function createLink() {
    if (!newLink.offerId) return;

    try {
      await api.post('/api/affiliate/links', newLink);
      setShowCreateModal(false);
      setNewLink({ offerId: '', name: '', defaultSub1: '', defaultSub2: '', defaultSub3: '', defaultSub4: '', defaultSub5: '' });
      loadLinks();
    } catch (error) {
      console.error('Failed to create link:', error);
    }
  }

  async function deleteLink(id: string) {
    if (!confirm('Are you sure you want to delete this tracking link?')) return;

    try {
      await api.delete(`/api/affiliate/links/${id}`);
      loadLinks();
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function buildTrackingUrl(link: TrackingLink) {
    let url = link.trackingUrl;
    const params = [];
    if (link.defaultSub1) params.push(`sub1=${encodeURIComponent(link.defaultSub1)}`);
    if (link.defaultSub2) params.push(`sub2=${encodeURIComponent(link.defaultSub2)}`);
    if (link.defaultSub3) params.push(`sub3=${encodeURIComponent(link.defaultSub3)}`);
    if (link.defaultSub4) params.push(`sub4=${encodeURIComponent(link.defaultSub4)}`);
    if (link.defaultSub5) params.push(`sub5=${encodeURIComponent(link.defaultSub5)}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return url;
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
          <h1 className="text-2xl font-bold text-gray-900">Tracking Links</h1>
          <p className="text-gray-600">Create and manage your affiliate tracking links</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Create Link
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900">How Tracking Links Work</h3>
        <p className="text-sm text-blue-700 mt-1">
          Each tracking link includes a unique click ID. Use sub-IDs (sub1-sub5) to track your traffic sources,
          ad creatives, campaigns, and more. These sub-IDs will be passed back with conversions for detailed reporting.
        </p>
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No tracking links yet</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            Create Your First Link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {link.name || link.offerName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {link.offerName} | ${link.payout.toFixed(2)} {link.payoutType.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${link.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                    {link.status}
                  </span>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Tracking URL */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Tracking URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-800 break-all">
                    {buildTrackingUrl(link)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(buildTrackingUrl(link), link.id)}
                    className="p-2 text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedId === link.id ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-IDs */}
              {(link.defaultSub1 || link.defaultSub2 || link.defaultSub3 || link.defaultSub4 || link.defaultSub5) && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {link.defaultSub1 && <span className="bg-gray-100 px-2 py-1 rounded">sub1: {link.defaultSub1}</span>}
                  {link.defaultSub2 && <span className="bg-gray-100 px-2 py-1 rounded">sub2: {link.defaultSub2}</span>}
                  {link.defaultSub3 && <span className="bg-gray-100 px-2 py-1 rounded">sub3: {link.defaultSub3}</span>}
                  {link.defaultSub4 && <span className="bg-gray-100 px-2 py-1 rounded">sub4: {link.defaultSub4}</span>}
                  {link.defaultSub5 && <span className="bg-gray-100 px-2 py-1 rounded">sub5: {link.defaultSub5}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Create Tracking Link</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Offer *
                </label>
                <select
                  value={newLink.offerId}
                  onChange={(e) => setNewLink({ ...newLink, offerId: e.target.value })}
                  className="input"
                >
                  <option value="">Choose an offer...</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name} (${offer.payoutAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Name (optional)
                </label>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Facebook Campaign 1"
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Default Sub-IDs (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sub1 (Source)</label>
                    <input
                      type="text"
                      value={newLink.defaultSub1}
                      onChange={(e) => setNewLink({ ...newLink, defaultSub1: e.target.value })}
                      className="input"
                      placeholder="facebook"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sub2 (Campaign)</label>
                    <input
                      type="text"
                      value={newLink.defaultSub2}
                      onChange={(e) => setNewLink({ ...newLink, defaultSub2: e.target.value })}
                      className="input"
                      placeholder="summer_sale"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sub3 (Ad)</label>
                    <input
                      type="text"
                      value={newLink.defaultSub3}
                      onChange={(e) => setNewLink({ ...newLink, defaultSub3: e.target.value })}
                      className="input"
                      placeholder="ad_001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sub4</label>
                    <input
                      type="text"
                      value={newLink.defaultSub4}
                      onChange={(e) => setNewLink({ ...newLink, defaultSub4: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sub5</label>
                    <input
                      type="text"
                      value={newLink.defaultSub5}
                      onChange={(e) => setNewLink({ ...newLink, defaultSub5: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={createLink}
                disabled={!newLink.offerId}
                className="btn btn-primary flex-1"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
