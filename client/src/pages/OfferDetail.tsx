import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  ArrowLeft,
  Globe,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  description: string;
  url: string;
  previewUrl?: string;
  category: string;
  payoutType: string;
  payoutAmount: number;
  countries?: string[];
  allowedTraffic?: string[];
  restrictedTraffic?: string[];
  conversionCap?: number;
  dailyCap?: number;
  monthlyCap?: number;
  requiresApproval: boolean;
  myStatus: string;
  stats: {
    totalClicks: number;
    totalConversions: number;
    totalPayout: number;
    conversionRate: number;
  };
}

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [id]);

  async function loadOffer() {
    try {
      const response = await api.get(`/api/offers/${id}`);
      setOffer(response.data);
    } catch (error) {
      console.error('Failed to load offer:', error);
    } finally {
      setLoading(false);
    }
  }

  async function applyForOffer() {
    if (!offer) return;
    setApplying(true);
    try {
      await api.post(`/api/affiliate/offers/${offer.id}/apply`);
      loadOffer();
    } catch (error) {
      console.error('Failed to apply for offer:', error);
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Offer not found</p>
        <Link to="/offers" className="btn btn-primary mt-4">Back to Offers</Link>
      </div>
    );
  }

  function getPayoutTypeLabel(type: string) {
    const labels: Record<string, string> = {
      cpa: 'Cost Per Action',
      cpl: 'Cost Per Lead',
      cpc: 'Cost Per Click',
      cpm: 'Cost Per Mille',
      cpi: 'Cost Per Install',
      revshare: 'Revenue Share'
    };
    return labels[type] || type.toUpperCase();
  }

  const canGetLink = offer.myStatus === 'approved' || (!offer.requiresApproval && offer.myStatus === 'not_applied');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Offers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <span className="badge badge-gray">{offer.category}</span>
              {offer.myStatus === 'approved' ? (
                <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>
              ) : offer.myStatus === 'pending' ? (
                <span className="badge badge-warning"><Clock className="w-3 h-3 mr-1" /> Pending Approval</span>
              ) : offer.myStatus === 'rejected' ? (
                <span className="badge badge-danger"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>
              ) : offer.requiresApproval ? (
                <span className="badge badge-gray">Requires Approval</span>
              ) : (
                <span className="badge badge-info">Open</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{offer.name}</h1>
            <p className="mt-4 text-gray-600 whitespace-pre-wrap">{offer.description}</p>

            {offer.previewUrl && (
              <a
                href={offer.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Landing Page
              </a>
            )}
          </div>

          {/* Traffic restrictions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Requirements</h2>

            {offer.allowedTraffic && offer.allowedTraffic.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Allowed Traffic</h3>
                <div className="flex flex-wrap gap-2">
                  {offer.allowedTraffic.map((traffic) => (
                    <span key={traffic} className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      {traffic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {offer.restrictedTraffic && offer.restrictedTraffic.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Restricted Traffic</h3>
                <div className="flex flex-wrap gap-2">
                  {offer.restrictedTraffic.map((traffic) => (
                    <span key={traffic} className="flex items-center gap-1 text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full">
                      <XCircle className="h-3 w-3" />
                      {traffic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Your stats */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Clicks</p>
                <p className="text-xl font-semibold">{offer.stats.totalClicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Conversions</p>
                <p className="text-xl font-semibold">{offer.stats.totalConversions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xl font-semibold text-green-600">${offer.stats.totalPayout.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-xl font-semibold">{offer.stats.conversionRate.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payout info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout</h2>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <span className="text-3xl font-bold text-green-600">${offer.payoutAmount.toFixed(2)}</span>
            </div>
            <p className="text-gray-600">{getPayoutTypeLabel(offer.payoutType)}</p>

            {(offer.conversionCap || offer.dailyCap || offer.monthlyCap) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {offer.dailyCap && (
                  <p className="text-sm text-gray-600">Daily Cap: <span className="font-medium">{offer.dailyCap}</span></p>
                )}
                {offer.monthlyCap && (
                  <p className="text-sm text-gray-600">Monthly Cap: <span className="font-medium">{offer.monthlyCap}</span></p>
                )}
                {offer.conversionCap && (
                  <p className="text-sm text-gray-600">Total Cap: <span className="font-medium">{offer.conversionCap}</span></p>
                )}
              </div>
            )}
          </div>

          {/* Countries */}
          {offer.countries && offer.countries.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <Globe className="h-5 w-5 inline mr-2" />
                Allowed Countries
              </h2>
              <div className="flex flex-wrap gap-2">
                {offer.countries.map((country) => (
                  <span key={country} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card">
            {canGetLink ? (
              <Link
                to={`/links?offerId=${offer.id}`}
                className="btn btn-primary w-full"
              >
                Get Tracking Link
              </Link>
            ) : offer.myStatus === 'not_applied' ? (
              <button
                onClick={applyForOffer}
                disabled={applying}
                className="btn btn-primary w-full"
              >
                {applying ? 'Applying...' : 'Apply to Run This Offer'}
              </button>
            ) : offer.myStatus === 'pending' ? (
              <button disabled className="btn btn-secondary w-full">
                Application Pending
              </button>
            ) : (
              <button disabled className="btn btn-secondary w-full">
                Application Rejected
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
