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
  ExternalLink
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div>Failed to load dashboard</div>;
  }

  const stats = [
    {
      name: 'Today\'s Clicks',
      value: data.today.clicks.toLocaleString(),
      change: data.today.uniqueClicks,
      changeLabel: 'unique',
      icon: MousePointer,
      color: 'bg-blue-500'
    },
    {
      name: 'Today\'s Conversions',
      value: data.today.conversions.toLocaleString(),
      change: data.today.conversionRate,
      changeLabel: '% CR',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      name: 'Today\'s Earnings',
      value: `$${data.today.payout.toFixed(2)}`,
      change: data.today.epc,
      changeLabel: 'EPC',
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      name: 'Pending Balance',
      value: `$${data.pendingBalance.toFixed(2)}`,
      change: data.activeOffers,
      changeLabel: 'active offers',
      icon: Percent,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your performance overview.</p>
        </div>
        <Link to="/offers" className="btn btn-primary">
          Browse Offers
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{stat.name}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">
                {typeof stat.change === 'number' ? stat.change.toFixed(2) : stat.change} {stat.changeLabel}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly stats */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Clicks</p>
            <p className="text-xl font-semibold">{data.month.clicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Conversions</p>
            <p className="text-xl font-semibold">{data.month.conversions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-xl font-semibold text-green-600">${data.month.payout.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg. EPC</p>
            <p className="text-xl font-semibold">${data.month.epc.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top offers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Performing Offers</h2>
            <Link to="/reports" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </div>
          {data.topOffers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet. Start promoting offers!</p>
          ) : (
            <div className="space-y-3">
              {data.topOffers.map((offer, index) => (
                <div key={offer.offerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900">{offer.offerName}</p>
                      <p className="text-sm text-gray-500">
                        {offer.clicks} clicks | {offer.conversions} conv
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${offer.payout.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">${offer.epc.toFixed(2)} EPC</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent conversions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Conversions</h2>
            <Link to="/conversions" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </div>
          {data.recentConversions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No conversions yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentConversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{conv.offerName}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(conv.createdAt), 'MMM d, h:mm a')}
                      {conv.sub1 && <span className="ml-2">| {conv.sub1}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${conv.payout.toFixed(2)}</p>
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
    </div>
  );
}
