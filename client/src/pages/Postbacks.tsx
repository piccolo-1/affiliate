import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, Trash2, X, Copy, Check, Info } from 'lucide-react';

interface Postback {
  id: string;
  offerId?: string;
  offerName?: string;
  url: string;
  eventType: string;
  method: string;
  status: string;
  createdAt: string;
}

export default function Postbacks() {
  const [postbacks, setPostbacks] = useState<Postback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newPostback, setNewPostback] = useState({
    url: '',
    eventType: 'conversion',
    method: 'GET'
  });

  useEffect(() => {
    loadPostbacks();
  }, []);

  async function loadPostbacks() {
    try {
      const response = await api.get('/api/affiliate/postbacks');
      setPostbacks(response.data);
    } catch (error) {
      console.error('Failed to load postbacks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createPostback() {
    if (!newPostback.url) return;

    try {
      await api.post('/api/affiliate/postbacks', newPostback);
      setShowCreateModal(false);
      setNewPostback({ url: '', eventType: 'conversion', method: 'GET' });
      loadPostbacks();
    } catch (error) {
      console.error('Failed to create postback:', error);
    }
  }

  async function deletePostback(id: string) {
    if (!confirm('Are you sure you want to delete this postback URL?')) return;

    try {
      await api.delete(`/api/affiliate/postbacks/${id}`);
      loadPostbacks();
    } catch (error) {
      console.error('Failed to delete postback:', error);
    }
  }

  function copyPlaceholders() {
    navigator.clipboard.writeText('{click_id}&payout={payout}&sub1={sub1}&sub2={sub2}');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const placeholders = [
    { name: '{click_id}', description: 'Unique click identifier' },
    { name: '{conversion_id}', description: 'Conversion identifier' },
    { name: '{payout}', description: 'Payout amount' },
    { name: '{revenue}', description: 'Revenue amount' },
    { name: '{offer_id}', description: 'Offer identifier' },
    { name: '{sub1}', description: 'Sub-ID 1 value' },
    { name: '{sub2}', description: 'Sub-ID 2 value' },
    { name: '{sub3}', description: 'Sub-ID 3 value' },
    { name: '{sub4}', description: 'Sub-ID 4 value' },
    { name: '{sub5}', description: 'Sub-ID 5 value' },
    { name: '{event}', description: 'Event type' }
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Postback URLs</h1>
          <p className="text-gray-600">Configure server-to-server conversion notifications</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          Add Postback
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">How Postbacks Work</h3>
            <p className="text-sm text-blue-700 mt-1">
              When a conversion is recorded, we'll send a request to your postback URL with conversion data.
              Use placeholders in your URL to receive specific data like click_id, payout, and sub-IDs.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholders reference */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Placeholders</h2>
          <button
            onClick={copyPlaceholders}
            className="btn btn-secondary text-sm"
          >
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy Example
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {placeholders.map((p) => (
            <div key={p.name} className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-medium text-indigo-600">{p.name}</code>
              <p className="text-xs text-gray-500 mt-1">{p.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Example URL:</p>
          <code className="text-sm text-gray-800 break-all">
            https://your-tracker.com/postback?clickid={'{click_id}'}&payout={'{payout}'}&sub1={'{sub1}'}&sub2={'{sub2}'}
          </code>
        </div>
      </div>

      {/* Postbacks list */}
      {postbacks.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No postback URLs configured</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            Add Your First Postback
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {postbacks.map((postback) => (
            <div key={postback.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${postback.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                    {postback.status}
                  </span>
                  <span className="badge badge-info">{postback.method}</span>
                  <span className="badge badge-gray">{postback.eventType}</span>
                </div>
                <button
                  onClick={() => deletePostback(postback.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <code className="text-sm text-gray-800 break-all">{postback.url}</code>
              </div>
              {postback.offerName && (
                <p className="mt-2 text-sm text-gray-500">Specific to: {postback.offerName}</p>
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
              <h2 className="text-xl font-semibold">Add Postback URL</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postback URL *
                </label>
                <textarea
                  value={newPostback.url}
                  onChange={(e) => setNewPostback({ ...newPostback, url: e.target.value })}
                  className="input min-h-[100px]"
                  placeholder="https://your-tracker.com/postback?clickid={click_id}&payout={payout}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use placeholders like {'{click_id}'}, {'{payout}'}, {'{sub1}'} etc.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={newPostback.eventType}
                    onChange={(e) => setNewPostback({ ...newPostback, eventType: e.target.value })}
                    className="input"
                  >
                    <option value="conversion">Conversion</option>
                    <option value="all">All Events</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={newPostback.method}
                    onChange={(e) => setNewPostback({ ...newPostback, method: e.target.value })}
                    className="input"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={createPostback}
                disabled={!newPostback.url}
                className="btn btn-primary flex-1"
              >
                Add Postback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
