import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Search, Filter, Globe, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
  category: string;
  payoutType: string;
  payoutAmount: number;
  countries?: string[];
  allowedTraffic?: string[];
  restrictedTraffic?: string[];
  requiresApproval: boolean;
  myStatus: string;
  createdAt: string;
}

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadOffers();
    loadCategories();
  }, [search, category]);

  async function loadOffers() {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await api.get(`/api/offers?${params}`);
      setOffers(response.data.offers);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get('/api/offers/meta/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function applyForOffer(offerId: string) {
    try {
      await api.post(`/api/affiliate/offers/${offerId}/apply`);
      loadOffers(); // Reload to update status
    } catch (error) {
      console.error('Failed to apply for offer:', error);
    }
  }

  function getStatusBadge(status: string, requiresApproval: boolean) {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
      case 'pending':
        return <span className="badge badge-warning"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      default:
        return requiresApproval
          ? <span className="badge badge-gray">Requires Approval</span>
          : <span className="badge badge-info">Open</span>;
    }
  }

  function getPayoutTypeLabel(type: string) {
    const labels: Record<string, string> = {
      cpa: 'CPA',
      cpl: 'CPL',
      cpc: 'CPC',
      cpm: 'CPM',
      cpi: 'CPI',
      revshare: 'RevShare'
    };
    return labels[type] || type.toUpperCase();
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
        <h1 className="text-2xl font-bold text-gray-900">Offers</h1>
        <p className="text-gray-600">Browse and apply to promote offers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input pl-10 pr-10 appearance-none min-w-[180px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Offers grid */}
      {offers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No offers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="badge badge-gray">{offer.category}</span>
                {getStatusBadge(offer.myStatus, offer.requiresApproval)}
              </div>

              <Link to={`/offers/${offer.id}`}>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                  {offer.name}
                </h3>
              </Link>

              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {offer.description}
              </p>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-1 text-green-600">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">${offer.payoutAmount.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">{getPayoutTypeLabel(offer.payoutType)}</span>
                </div>
              </div>

              {offer.countries && offer.countries.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="h-4 w-4" />
                  <span>{offer.countries.slice(0, 5).join(', ')}{offer.countries.length > 5 ? '...' : ''}</span>
                </div>
              )}

              {offer.allowedTraffic && offer.allowedTraffic.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {offer.allowedTraffic.slice(0, 4).map((traffic) => (
                    <span key={traffic} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                      {traffic}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex gap-2">
                <Link
                  to={`/offers/${offer.id}`}
                  className="btn btn-secondary flex-1"
                >
                  View Details
                </Link>
                {(offer.myStatus === 'approved' || (!offer.requiresApproval && offer.myStatus === 'not_applied')) ? (
                  <Link
                    to={`/links?offerId=${offer.id}`}
                    className="btn btn-primary flex-1"
                  >
                    Get Link
                  </Link>
                ) : offer.myStatus === 'not_applied' ? (
                  <button
                    onClick={() => applyForOffer(offer.id)}
                    className="btn btn-primary flex-1"
                  >
                    Apply
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
