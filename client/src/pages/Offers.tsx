import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import {
  Search,
  Globe,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  TrendingUp,
  Gamepad2,
  Heart,
  Wallet,
  Bitcoin,
  Gift,
  ShoppingCart,
  FileText,
  Monitor,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
  category: string;
  vertical: string;
  payoutType: string;
  payoutAmount: number;
  countries?: string[];
  allowedTraffic?: string[];
  restrictedTraffic?: string[];
  requiresApproval: boolean;
  myStatus: string;
  isFeatured?: boolean;
  isTop?: boolean;
  createdAt: string;
}

const VERTICALS = [
  { id: 'all', name: 'All Offers', icon: Layers },
  { id: 'nutra', name: 'Nutra', icon: Heart },
  { id: 'gaming', name: 'Gaming & Casino', icon: Gamepad2 },
  { id: 'finance', name: 'Finance', icon: Wallet },
  { id: 'dating', name: 'Dating', icon: Heart },
  { id: 'crypto', name: 'Crypto', icon: Bitcoin },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart },
  { id: 'sweepstakes', name: 'Sweepstakes', icon: Gift },
  { id: 'leadgen', name: 'Lead Gen', icon: FileText },
  { id: 'software', name: 'Software', icon: Monitor },
];

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('all');

  useEffect(() => {
    loadOffers();
  }, [search, selectedVertical]);

  async function loadOffers() {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedVertical && selectedVertical !== 'all') {
        params.append('vertical', selectedVertical);
      }

      const response = await api.get(`/api/offers?${params}`);
      setOffers(response.data.offers);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function applyForOffer(offerId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/affiliate/offers/${offerId}/apply`);
      loadOffers();
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

  const featuredOffers = offers.filter(o => o.isFeatured);
  const topOffers = offers.filter(o => o.isTop);
  const filteredOffers = selectedVertical === 'all'
    ? offers
    : offers.filter(o => o.vertical === selectedVertical);

  const verticalCounts = VERTICALS.reduce((acc, v) => {
    acc[v.id] = v.id === 'all' ? offers.length : offers.filter(o => o.vertical === v.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offer Marketplace</h1>
          <p className="text-slate-500">Browse high-converting offers across all verticals</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full sm:w-72"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Vertical sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-3">
            <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Verticals</h3>
            <nav className="vertical-tab-list">
              {VERTICALS.map((vertical) => (
                <button
                  key={vertical.id}
                  onClick={() => setSelectedVertical(vertical.id)}
                  className={`vertical-tab w-full flex items-center justify-between ${
                    selectedVertical === vertical.id ? 'vertical-tab-active' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <vertical.icon className="w-4 h-4" />
                    <span>{vertical.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedVertical === vertical.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {verticalCounts[vertical.id]}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-10 h-10" />
            </div>
          ) : (
            <>
              {/* Featured offers */}
              {selectedVertical === 'all' && featuredOffers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Featured Offers</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredOffers.slice(0, 4).map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="card p-4 hover:shadow-lg hover:border-blue-300 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                          Featured
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {offer.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {offer.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">{offer.category}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="font-bold text-emerald-600">${offer.payoutAmount.toFixed(2)}</span>
                                <span className="text-xs text-slate-400">{getPayoutTypeLabel(offer.payoutType)}</span>
                              </div>
                              {offer.countries && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Globe className="w-3 h-3" />
                                  {offer.countries.slice(0, 3).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top performing */}
              {selectedVertical === 'all' && topOffers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Top Performing</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {topOffers.map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="flex-shrink-0 w-64 card p-4 hover:shadow-lg hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-medium text-emerald-600">High Conversion</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {offer.name}
                        </h3>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-emerald-600">${offer.payoutAmount.toFixed(2)}</span>
                            <span className="text-xs text-slate-400">{getPayoutTypeLabel(offer.payoutType)}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* All offers grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedVertical === 'all' ? 'All Offers' : VERTICALS.find(v => v.id === selectedVertical)?.name}
                  </h2>
                  <span className="text-sm text-slate-500">{filteredOffers.length} offers</span>
                </div>

                {filteredOffers.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-slate-500">No offers found in this category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOffers.map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="card p-5 hover:shadow-lg hover:border-slate-300 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {offer.category}
                            </span>
                            {offer.isTop && (
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          {getStatusBadge(offer.myStatus, offer.requiresApproval)}
                        </div>

                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {offer.name}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                          {offer.description}
                        </p>

                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            <span className="font-bold text-lg text-emerald-600">${offer.payoutAmount.toFixed(2)}</span>
                            <span className="text-sm text-slate-400">{getPayoutTypeLabel(offer.payoutType)}</span>
                          </div>
                        </div>

                        {offer.countries && offer.countries.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                            <Globe className="w-4 h-4" />
                            <span>{offer.countries.slice(0, 5).join(', ')}{offer.countries.length > 5 ? ` +${offer.countries.length - 5}` : ''}</span>
                          </div>
                        )}

                        {offer.allowedTraffic && offer.allowedTraffic.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {offer.allowedTraffic.slice(0, 4).map((traffic) => (
                              <span key={traffic} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                {traffic}
                              </span>
                            ))}
                            {offer.allowedTraffic.length > 4 && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                +{offer.allowedTraffic.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                          {(offer.myStatus === 'approved' || (!offer.requiresApproval && offer.myStatus === 'not_applied')) ? (
                            <Link
                              to={`/links?offerId=${offer.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-primary flex-1 text-center"
                            >
                              Get Link
                            </Link>
                          ) : offer.myStatus === 'not_applied' ? (
                            <button
                              onClick={(e) => applyForOffer(offer.id, e)}
                              className="btn btn-primary flex-1"
                            >
                              Apply Now
                            </button>
                          ) : (
                            <span className="btn btn-secondary flex-1 text-center cursor-default">
                              {offer.myStatus === 'pending' ? 'Pending Approval' : 'View Details'}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
