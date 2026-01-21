import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import {
  TrendingUp,
  MousePointer,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  ChevronRight,
  Sparkles,
  Clock,
  Star,
  Activity,
  BarChart3,
  Store,
  Link2,
  ExternalLink
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface DashboardData {
  today: {
    clicks: number;
    uniqueClicks: number;
    conversions: number;
    payout: number;
    epc: number;
    conversionRate: number;
  };
  month: {
    clicks: number;
    uniqueClicks: number;
    conversions: number;
    payout: number;
    epc: number;
    conversionRate: number;
  };
  pendingBalance: number;
  activeOffers: number;
  recentConversions: Array<{
    id: string;
    clickId: string;
    offerName: string;
    status: string;
    payout: number;
    sub1: string;
    createdAt: string;
  }>;
  topOffers: Array<{
    offerId: string;
    offerName: string;
    clicks: number;
    conversions: number;
    payout: number;
    epc: number;
  }>;
}

interface ChartData {
  date: string;
  clicks: number;
  conversions: number;
  payout: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadChartData();
  }, []);

  async function loadDashboard() {
    try {
      const response = await api.get('/api/affiliate/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChartData() {
    try {
      const response = await api.get('/api/stats/daily');
      setChartData(response.data);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Failed to load dashboard. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header - Toss style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-500 mt-1">Here's your performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/tracking" className="btn btn-secondary">
            <Activity className="w-4 h-4 mr-2" />
            Live Tracking
          </Link>
          <Link to="/offers" className="btn btn-primary">
            <Store className="w-4 h-4 mr-2" />
            Find Offers
          </Link>
        </div>
      </div>

      {/* Main balance card - Toss style hero */}
      <div className="card bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-sm font-medium">Total Balance</span>
                <span className="live-indicator text-emerald-400">Live</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold tracking-tight">
                  ${data.month.payout.toFixed(2)}
                </span>
                <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  This month
                </span>
              </div>
              <p className="text-gray-400 mt-2">
                ${data.pendingBalance.toFixed(2)} pending approval
              </p>
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{data.month.conversions}</p>
                <p className="text-gray-400 text-sm mt-1">Conversions</p>
              </div>
              <div className="w-px bg-gray-700" />
              <div className="text-center">
                <p className="text-4xl font-bold">{data.month.clicks.toLocaleString()}</p>
                <p className="text-gray-400 text-sm mt-1">Total Clicks</p>
              </div>
              <div className="w-px bg-gray-700" />
              <div className="text-center">
                <p className="text-4xl font-bold">${data.month.epc.toFixed(2)}</p>
                <p className="text-gray-400 text-sm mt-1">Avg. EPC</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <Link
              to="/links"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">My Links</p>
                <p className="text-xs text-gray-400">{data.activeOffers} active</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/offers"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Offers</p>
                <p className="text-xs text-gray-400">Browse all</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Reports</p>
                <p className="text-xs text-gray-400">Analytics</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/conversions"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Conversions</p>
                <p className="text-xs text-gray-400">View all</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Today's stats - Toss style cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Performance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-white" />
              </div>
              {data.today.clicks > 0 && (
                <span className="metric-change metric-change-up">
                  <ArrowUpRight className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">Clicks</p>
            <p className="text-3xl font-bold text-gray-900">{data.today.clicks.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">{data.today.uniqueClicks} unique</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl gradient-green flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              {data.today.conversions > 0 && (
                <span className="metric-change metric-change-up">
                  <ArrowUpRight className="w-3 h-3" />
                  +{data.today.conversions}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-1">Conversions</p>
            <p className="text-3xl font-bold text-gray-900">{data.today.conversions}</p>
            <p className="text-sm text-gray-400 mt-1">{data.today.conversionRate.toFixed(2)}% CR</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl gradient-purple flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Earnings</p>
            <p className="text-3xl font-bold text-gray-900">${data.today.payout.toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-1">Today's total</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl gradient-orange flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">EPC</p>
            <p className="text-3xl font-bold text-gray-900">${data.today.epc.toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-1">Earnings per click</p>
          </div>
        </div>
      </div>

      {/* Chart section */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Performance Trend</h2>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </div>
            <Link to="/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View detailed reports
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c471" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00c471" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3182f6"
                  strokeWidth={2}
                  fill="url(#colorClicksGradient)"
                  name="Clicks"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#00c471"
                  strokeWidth={2}
                  fill="url(#colorConversionsGradient)"
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top offers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Top Performers</h2>
            </div>
            <Link to="/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          {data.topOffers.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon w-14 h-14">
                <TrendingUp className="w-7 h-7" />
              </div>
              <p className="empty-state-title">No performance data yet</p>
              <p className="empty-state-text">Start promoting offers to see your top performers here</p>
              <Link to="/offers" className="btn btn-primary btn-sm">
                Browse Offers
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topOffers.slice(0, 5).map((offer, index) => (
                <div key={offer.offerId} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{offer.offerName}</p>
                    <p className="text-sm text-gray-500">
                      {offer.clicks} clicks | {offer.conversions} conv
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">${offer.payout.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">${offer.epc.toFixed(2)} EPC</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent conversions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900">Recent Conversions</h2>
            </div>
            <Link to="/conversions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          {data.recentConversions.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon w-14 h-14">
                <Target className="w-7 h-7" />
              </div>
              <p className="empty-state-title">No conversions yet</p>
              <p className="empty-state-text">Your recent conversions will appear here</p>
              <Link to="/offers" className="btn btn-primary btn-sm">
                Find Offers
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentConversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    conv.status === 'approved' ? 'gradient-green' :
                    conv.status === 'pending' ? 'gradient-orange' : 'bg-gray-300'
                  }`}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{conv.offerName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(conv.createdAt), 'MMM d, HH:mm')}</span>
                      {conv.sub1 && <span>| {conv.sub1}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">${conv.payout.toFixed(2)}</p>
                    <span className={`badge ${
                      conv.status === 'approved' ? 'badge-success' :
                      conv.status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Promo banner */}
      <div className="card bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Boost Your Earnings</h3>
              <p className="text-blue-100">
                Discover top-converting offers and optimize your campaigns for maximum ROI.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/offers" className="btn bg-white text-blue-600 hover:bg-blue-50">
              Browse Offers
            </Link>
            <Link to="/reports" className="btn bg-white/20 hover:bg-white/30 text-white">
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
