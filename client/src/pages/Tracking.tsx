import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format, subDays, subHours } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Line
} from 'recharts';
import {
  MousePointer,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Clock,
  Smartphone,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Eye
} from 'lucide-react';

interface TrackingStats {
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  epc: number;
  conversionRate: number;
}

interface HourlyData {
  hour: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface RecentConversion {
  id: string;
  offerName: string;
  payout: number;
  status: string;
  sub1: string;
  createdAt: string;
}

export default function Tracking() {
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d' | '30d'>('today');
  const [stats, setStats] = useState<TrackingStats>({
    clicks: 0,
    uniqueClicks: 0,
    conversions: 0,
    revenue: 0,
    epc: 0,
    conversionRate: 0
  });
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadTrackingData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadTrackingData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  async function loadTrackingData(silent = false) {
    if (!silent) setLoading(true);
    setIsRefreshing(true);

    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      let startDate = endDate;

      switch (timeRange) {
        case '24h':
          startDate = format(subHours(new Date(), 24), 'yyyy-MM-dd');
          break;
        case '7d':
          startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
          break;
        case '30d':
          startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
          break;
      }

      const params = `startDate=${startDate}&endDate=${endDate}`;

      const [dashboardRes, dailyRes] = await Promise.all([
        api.get('/api/affiliate/dashboard'),
        api.get(`/api/stats/daily?${params}`)
      ]);

      const dashboard = dashboardRes.data;
      const dailyStats = dailyRes.data;

      // Calculate totals from daily stats
      const totals = dailyStats.reduce((acc: TrackingStats, day: any) => ({
        clicks: acc.clicks + (day.clicks || 0),
        uniqueClicks: acc.uniqueClicks + (day.uniqueClicks || 0),
        conversions: acc.conversions + (day.conversions || 0),
        revenue: acc.revenue + (day.payout || 0),
        epc: 0,
        conversionRate: 0
      }), { clicks: 0, uniqueClicks: 0, conversions: 0, revenue: 0, epc: 0, conversionRate: 0 });

      totals.epc = totals.clicks > 0 ? totals.revenue / totals.clicks : 0;
      totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

      setStats(totals);

      // Generate mock hourly data for visualization
      const hours = [];
      for (let i = 23; i >= 0; i--) {
        hours.push({
          hour: format(subHours(new Date(), i), 'HH:00'),
          clicks: Math.floor(Math.random() * 50),
          conversions: Math.floor(Math.random() * 5),
          revenue: Math.random() * 100
        });
      }
      setHourlyData(hours);

      // Set recent conversions
      setRecentConversions(dashboard.recentConversions?.slice(0, 5) || []);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load tracking data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  function getChangeIndicator(current: number, previous: number | undefined) {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;

    return (
      <span className={`metric-change ${isPositive ? 'metric-change-up' : 'metric-change-down'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Live Tracking</h1>
            <span className="live-indicator text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Live
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Real-time performance tracking and analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="tab-list">
            {[
              { id: 'today', label: 'Today' },
              { id: '24h', label: '24h' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as any)}
                className={`tab ${timeRange === range.id ? 'tab-active' : ''}`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => loadTrackingData()}
            disabled={isRefreshing}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        Last updated: {format(lastUpdated, 'HH:mm:ss')}
      </div>

      {/* Main metrics - Everflow style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clicks */}
        <div className="tracking-metric-card clicks">
          <div className="metric-icon">
            <MousePointer className="w-6 h-6 text-white" />
          </div>
          <p className="metric-label mb-1">Total Clicks</p>
          <div className="flex items-end gap-2">
            <p className="metric">{stats.clicks.toLocaleString()}</p>
            {getChangeIndicator(stats.clicks, undefined)}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {stats.uniqueClicks.toLocaleString()} unique
          </p>
        </div>

        {/* Conversions */}
        <div className="tracking-metric-card conversions">
          <div className="metric-icon">
            <Target className="w-6 h-6 text-white" />
          </div>
          <p className="metric-label mb-1">Conversions</p>
          <div className="flex items-end gap-2">
            <p className="metric">{stats.conversions.toLocaleString()}</p>
            {getChangeIndicator(stats.conversions, undefined)}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {stats.conversionRate.toFixed(2)}% CR
          </p>
        </div>

        {/* Revenue */}
        <div className="tracking-metric-card revenue">
          <div className="metric-icon">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <p className="metric-label mb-1">Revenue</p>
          <div className="flex items-end gap-2">
            <p className="metric">${stats.revenue.toFixed(2)}</p>
            {getChangeIndicator(stats.revenue, undefined)}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Approved earnings
          </p>
        </div>

        {/* EPC */}
        <div className="tracking-metric-card epc">
          <div className="metric-icon">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <p className="metric-label mb-1">EPC</p>
          <div className="flex items-end gap-2">
            <p className="metric">${stats.epc.toFixed(2)}</p>
            {getChangeIndicator(stats.epc, undefined)}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Earnings per click
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly traffic chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hourly Traffic</h3>
              <p className="text-sm text-gray-500">Clicks over the last 24 hours</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">Clicks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600">Conversions</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3182f6"
                  strokeWidth={2}
                  fill="url(#colorClicks)"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#00c471"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hourly Revenue</h3>
              <p className="text-sm text-gray-500">Earnings over the last 24 hours</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Bar
                  dataKey="revenue"
                  fill="url(#revenueGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent conversions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Conversions</h3>
            <Link to="/conversions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          {recentConversions.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon w-14 h-14">
                <Target className="w-7 h-7" />
              </div>
              <p className="empty-state-text">No conversions yet</p>
              <Link to="/offers" className="btn btn-primary btn-sm">
                Find Offers
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentConversions.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{conv.offerName}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(conv.createdAt), 'MMM d, HH:mm')}
                        {conv.sub1 && <span className="ml-2">| {conv.sub1}</span>}
                      </p>
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

        {/* Quick insights */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-4">
            {/* Best performing hour */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50">
              <div className="w-12 h-12 rounded-xl gradient-blue flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Peak Traffic Hour</p>
                <p className="text-lg font-semibold text-gray-900">
                  {hourlyData.length > 0
                    ? hourlyData.reduce((max, h) => h.clicks > max.clicks ? h : max, hourlyData[0]).hour
                    : 'N/A'}
                </p>
              </div>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>

            {/* Top device */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50">
              <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Top Device</p>
                <p className="text-lg font-semibold text-gray-900">Mobile</p>
              </div>
              <span className="text-sm font-medium text-purple-600">65%</span>
            </div>

            {/* Best CR offer */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50">
              <div className="w-12 h-12 rounded-xl gradient-green flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Avg. Conversion Rate</p>
                <p className="text-lg font-semibold text-gray-900">{stats.conversionRate.toFixed(2)}%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>

            {/* Active offers */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/50">
              <div className="w-12 h-12 rounded-xl gradient-orange flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Active Offers</p>
                <p className="text-lg font-semibold text-gray-900">0 running</p>
              </div>
              <Link to="/links" className="btn btn-sm btn-ghost">
                Manage
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Performance tips */}
      <div className="card bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Boost Your Performance</h3>
            <p className="text-blue-100 text-sm mb-4">
              Optimize your campaigns with these quick tips to maximize your earnings.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/reports" className="btn btn-sm bg-white/20 hover:bg-white/30 text-white">
                View Reports
              </Link>
              <Link to="/offers" className="btn btn-sm bg-white/20 hover:bg-white/30 text-white">
                Find New Offers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
