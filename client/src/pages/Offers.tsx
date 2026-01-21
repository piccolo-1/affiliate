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
  ArrowRight,
  Filter,
  SlidersHorizontal,
  Flame,
  Zap,
  Target,
  ExternalLink,
  X,
  ChevronDown,
  Users,
  BarChart3
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
  { id: 'all', name: 'All Offers', icon: Layers, color: 'gray' },
  { id: 'nutra', name: 'Nutra', icon: Heart, color: 'pink' },
  { id: 'gaming', name: 'Gaming & Casino', icon: Gamepad2, color: 'purple' },
  { id: 'finance', name: 'Finance', icon: Wallet, color: 'green' },
  { id: 'dating', name: 'Dating', icon: Heart, color: 'red' },
  { id: 'crypto', name: 'Crypto', icon: Bitcoin, color: 'orange' },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart, color: 'blue' },
  { id: 'sweepstakes', name: 'Sweepstakes', icon: Gift, color: 'yellow' },
  { id: 'leadgen', name: 'Lead Gen', icon: FileText, color: 'cyan' },
  { id: 'software', name: 'Software', icon: Monitor, color: 'indigo' },
];

const PAYOUT_TYPES = ['All', 'CPA', 'CPL', 'CPC', 'CPI', 'RevShare'];
const COUNTRIES = ['All', 'US', 'UK', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'BR', 'MX'];

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('all');
  const [selectedPayoutType, setSelectedPayoutType] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'payout' | 'popular'>('popular');

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
        return <span className="badge badge-success"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'pending':
        return <span className="badge badge-warning"><Clock className="w-3 h-3" /> Pending</span>;
      case 'rejected':
        return <span className="badge badge-danger"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return requiresApproval
          ? <span className="badge badge-gray">Apply Required</span>
          : <span className="badge badge-info">Open</span>;
    }
  }

  function getPayoutTypeBadge(type: string) {
    const typeClass = `payout-${type.toLowerCase()}`;
    return <span className={`payout-badge ${typeClass}`}>{type.toUpperCase()}</span>;
  }

  const featuredOffers = offers.filter(o => o.isFeatured);
  const topOffers = offers.filter(o => o.isTop);

  // Apply filters
  let filteredOffers = selectedVertical === 'all'
    ? offers
    : offers.filter(o => o.vertical === selectedVertical);

  if (selectedPayoutType !== 'All') {
    filteredOffers = filteredOffers.filter(o =>
      o.payoutType.toLowerCase() === selectedPayoutType.toLowerCase()
    );
  }

  if (selectedCountry !== 'All') {
    filteredOffers = filteredOffers.filter(o =>
      o.countries?.includes(selectedCountry)
    );
  }

  // Sort offers
  filteredOffers = [...filteredOffers].sort((a, b) => {
    switch (sortBy) {
      case 'payout':
        return b.payoutAmount - a.payoutAmount;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0);
    }
  });

  const verticalCounts = VERTICALS.reduce((acc, v) => {
    acc[v.id] = v.id === 'all' ? offers.length : offers.filter(o => o.vertical === v.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Offervault style */}
      <div className="card bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Offer Vault</h1>
                <p className="text-blue-100">Discover high-converting offers across all verticals</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-3xl font-bold">{offers.length}</p>
              <p className="text-xs text-blue-200 uppercase tracking-wide">Total Offers</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-3xl font-bold">{featuredOffers.length}</p>
              <p className="text-xs text-blue-200 uppercase tracking-wide">Featured</p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-6">
          <div className="search-box">
            <Search className="search-icon !text-gray-400" />
            <input
              type="text"
              placeholder="Search by offer name, category, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!bg-white/10 !text-white !placeholder-blue-200 w-full"
              style={{ color: 'white' }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Offervault style verticals */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="card p-4 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Verticals
            </h3>
            <nav className="vertical-tab-list">
              {VERTICALS.map((vertical) => (
                <button
                  key={vertical.id}
                  onClick={() => setSelectedVertical(vertical.id)}
                  className={`vertical-tab w-full flex items-center justify-between ${
                    selectedVertical === vertical.id ? 'vertical-tab-active' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <vertical.icon className="w-4 h-4" />
                    <span className="text-sm">{vertical.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedVertical === vertical.id
                      ? 'bg-blue-500/20 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {verticalCounts[vertical.id]}
                  </span>
                </button>
              ))}
            </nav>

            {/* Quick filters */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Quick Filters
              </h3>

              {/* Payout type */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Payout Type
                </label>
                <div className="flex flex-wrap gap-1">
                  {PAYOUT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedPayoutType(type)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedPayoutType === type
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="input text-sm"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
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
              {/* Featured offers carousel - Offervault style */}
              {selectedVertical === 'all' && featuredOffers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-bold text-gray-900">Featured Offers</h2>
                    <span className="badge badge-warning">Hot</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuredOffers.slice(0, 4).map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="offer-card offer-card-featured group"
                      >
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                          FEATURED
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {offer.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {offer.name}
                              </h3>
                              {getPayoutTypeBadge(offer.payoutType)}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-1 mb-3">
                              {offer.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="offer-payout">${offer.payoutAmount.toFixed(2)}</span>
                                {offer.countries && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Globe className="w-3 h-3" />
                                    {offer.countries.slice(0, 2).join(', ')}
                                    {offer.countries.length > 2 && ` +${offer.countries.length - 2}`}
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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
                    <h2 className="text-lg font-bold text-gray-900">Top Performers</h2>
                    <span className="badge badge-success">High CR</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                    {topOffers.map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="flex-shrink-0 w-72 offer-card group"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          </div>
                          <span className="text-xs font-medium text-emerald-600">Top Rated</span>
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                          {offer.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="offer-payout">${offer.payoutAmount.toFixed(2)}</span>
                            {getPayoutTypeBadge(offer.payoutType)}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* All offers grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedVertical === 'all' ? 'All Offers' : VERTICALS.find(v => v.id === selectedVertical)?.name}
                    </h2>
                    <span className="text-sm text-gray-500">({filteredOffers.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="input text-sm w-auto py-2"
                    >
                      <option value="popular">Popular</option>
                      <option value="payout">Highest Payout</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>

                {filteredOffers.length === 0 ? (
                  <div className="card empty-state">
                    <div className="empty-state-icon">
                      <Search />
                    </div>
                    <p className="empty-state-title">No offers found</p>
                    <p className="empty-state-text">Try adjusting your filters or search terms</p>
                    <button
                      onClick={() => {
                        setSelectedVertical('all');
                        setSelectedPayoutType('All');
                        setSelectedCountry('All');
                        setSearch('');
                      }}
                      className="btn btn-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOffers.map((offer) => (
                      <Link
                        key={offer.id}
                        to={`/offers/${offer.id}`}
                        className="offer-card group"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                              {offer.category}
                            </span>
                            {offer.isTop && (
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          {getStatusBadge(offer.myStatus, offer.requiresApproval)}
                        </div>

                        {/* Offer info */}
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                          {offer.name}
                        </h3>

                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">
                          {offer.description}
                        </p>

                        {/* Payout */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="offer-payout">${offer.payoutAmount.toFixed(2)}</span>
                            {getPayoutTypeBadge(offer.payoutType)}
                          </div>
                        </div>

                        {/* Countries */}
                        {offer.countries && offer.countries.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                            <Globe className="w-4 h-4" />
                            <span className="truncate">
                              {offer.countries.slice(0, 5).join(', ')}
                              {offer.countries.length > 5 && ` +${offer.countries.length - 5}`}
                            </span>
                          </div>
                        )}

                        {/* Traffic sources */}
                        {offer.allowedTraffic && offer.allowedTraffic.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {offer.allowedTraffic.slice(0, 3).map((traffic) => (
                              <span key={traffic} className="traffic-tag traffic-tag-allowed">
                                {traffic}
                              </span>
                            ))}
                            {offer.allowedTraffic.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{offer.allowedTraffic.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action button */}
                        <div className="pt-4 border-t border-gray-100">
                          {(offer.myStatus === 'approved' || (!offer.requiresApproval && offer.myStatus === 'not_applied')) ? (
                            <Link
                              to={`/links?offerId=${offer.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-primary w-full"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Get Tracking Link
                            </Link>
                          ) : offer.myStatus === 'not_applied' ? (
                            <button
                              onClick={(e) => applyForOffer(offer.id, e)}
                              className="btn btn-success w-full"
                            >
                              <Target className="w-4 h-4 mr-2" />
                              Apply Now
                            </button>
                          ) : offer.myStatus === 'pending' ? (
                            <button disabled className="btn btn-secondary w-full cursor-not-allowed">
                              <Clock className="w-4 h-4 mr-2" />
                              Pending Approval
                            </button>
                          ) : (
                            <button disabled className="btn btn-secondary w-full cursor-not-allowed">
                              View Details
                            </button>
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
