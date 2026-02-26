import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  today: {
    clicks: number;
    conversions: number;
    revenue: number;
    payout: number;
    profit: number;
  };
  month: {
    clicks: number;
    conversions: number;
    revenue: number;
    payout: number;
    profit: number;
  };
  users: {
    total: number;
    affiliates: number;
    advertisers: number;
    pending: number;
  };
  offers: {
    total: number;
    active: number;
    paused: number;
  };
  pendingApprovals: number;
  topAffiliates: Array<{
    id: string;
    email: string;
    name: string;
    clicks: number;
    conversions: number;
    payout: number;
  }>;
  recentConversions: Array<{
    id: string;
    offerName: string;
    affiliateEmail: string;
    status: string;
    payout: number;
    revenue: number;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadChartData();
  }, []);

  async function loadDashboard() {
    try {
      const response = await api.get('/api/admin/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChartData() {
    try {
      const response = await api.get('/api/admin/stats');
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
      name: 'Total Users',
      value: data.users.total,
      subtitle: `${data.users.affiliates} affiliates`,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Offers',
      value: data.offers.active,
      subtitle: `${data.offers.total} total`,
      icon: ShoppingBag,
      color: 'bg-purple-500'
    },
    {
      name: 'Today\'s Revenue',
      value: `$${data.today.revenue.toFixed(2)}`,
      subtitle: `$${data.today.profit.toFixed(2)} profit`,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      name: 'Today\'s Conversions',
      value: data.today.conversions,
      subtitle: `${data.today.clicks} clicks`,
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Network overview and management</p>
        </div>
        {data.pendingApprovals > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{data.pendingApprovals} pending approvals</span>
          </div>
        )}
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
              <p className="mt-1 text-sm text-gray-500">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly stats */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Clicks</p>
            <p className="text-xl font-semibold">{data.month.clicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Conversions</p>
            <p className="text-xl font-semibold">{data.month.conversions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-xl font-semibold text-green-600">${data.month.revenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Payout</p>
            <p className="text-xl font-semibold text-red-600">${data.month.payout.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Profit</p>
            <p className="text-xl font-semibold text-indigo-600">${data.month.profit.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h2>
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
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="payout" stroke="#ef4444" strokeWidth={2} dot={false} name="Payout" />
                <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top affiliates */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Affiliates (This Month)</h2>
          {data.topAffiliates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topAffiliates.slice(0, 5).map((affiliate, index) => (
                <div key={affiliate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900">{affiliate.name}</p>
                      <p className="text-sm text-gray-500">{affiliate.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${affiliate.payout.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{affiliate.conversions} conv</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent conversions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Conversions</h2>
          {data.recentConversions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No conversions yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentConversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{conv.offerName}</p>
                    <p className="text-sm text-gray-500">
                      {conv.affiliateEmail} | {format(new Date(conv.createdAt), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${conv.revenue.toFixed(2)}</p>
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
