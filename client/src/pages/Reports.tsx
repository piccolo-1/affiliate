import { useState, useEffect } from 'react';
import api from '../lib/api';
import { format, subDays } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DailyStats {
  date: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  payout: number;
  epc: number;
  conversionRate: number;
}

interface OfferStats {
  offerId: string;
  offerName: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  payout: number;
  epc: number;
  conversionRate: number;
}

interface SubStats {
  subValue: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  payout: number;
  epc: number;
  conversionRate: number;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [offerStats, setOfferStats] = useState<OfferStats[]>([]);
  const [subStats, setSubStats] = useState<SubStats[]>([]);
  const [subField, setSubField] = useState('sub1');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'offers' | 'subs'>('daily');

  useEffect(() => {
    loadAllStats();
  }, [dateRange, subField]);

  async function loadAllStats() {
    setLoading(true);
    try {
      const params = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const [daily, offers, subs] = await Promise.all([
        api.get(`/api/stats/daily?${params}`),
        api.get(`/api/stats/by-offer?${params}`),
        api.get(`/api/stats/by-sub?${params}&subField=${subField}`)
      ]);
      setDailyStats(daily.data);
      setOfferStats(offers.data);
      setSubStats(subs.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalStats = dailyStats.reduce((acc, day) => ({
    clicks: acc.clicks + day.clicks,
    conversions: acc.conversions + day.conversions,
    payout: acc.payout + day.payout
  }), { clicks: 0, conversions: 0, payout: 0 });

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
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Detailed analytics and performance breakdown</p>
        </div>
      </div>

      {/* Date range and summary */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange({
                startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd')
              })}
              className="btn btn-secondary"
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange({
                startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd')
              })}
              className="btn btn-secondary"
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Clicks</p>
            <p className="text-3xl font-bold text-blue-700">{totalStats.clicks.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Conversions</p>
            <p className="text-3xl font-bold text-green-700">{totalStats.conversions.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Total Earnings</p>
            <p className="text-3xl font-bold text-purple-700">${totalStats.payout.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'daily', label: 'Daily Performance' },
            { id: 'offers', label: 'By Offer' },
            { id: 'subs', label: 'By Sub-ID' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Daily Performance */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
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
                    formatter={(value: number, name: string) => [
                      name === 'payout' ? `$${value.toFixed(2)}` : value,
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conversions" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clicks</th>
                  <th>Unique</th>
                  <th>Conversions</th>
                  <th>CR %</th>
                  <th>Payout</th>
                  <th>EPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dailyStats.map((day) => (
                  <tr key={day.date}>
                    <td className="font-medium">{format(new Date(day.date), 'MMM d, yyyy')}</td>
                    <td>{day.clicks.toLocaleString()}</td>
                    <td>{day.uniqueClicks.toLocaleString()}</td>
                    <td>{day.conversions}</td>
                    <td>{day.conversionRate.toFixed(2)}%</td>
                    <td className="text-green-600 font-medium">${day.payout.toFixed(2)}</td>
                    <td>${day.epc.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Offer */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Earnings by Offer</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={offerStats.slice(0, 6)}
                      dataKey="payout"
                      nameKey="offerName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {offerStats.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Conversions by Offer</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offerStats.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis dataKey="offerName" type="category" width={150} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="conversions" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>CR %</th>
                  <th>Payout</th>
                  <th>EPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {offerStats.map((offer) => (
                  <tr key={offer.offerId}>
                    <td className="font-medium">{offer.offerName}</td>
                    <td>{offer.clicks.toLocaleString()}</td>
                    <td>{offer.conversions}</td>
                    <td>{offer.conversionRate.toFixed(2)}%</td>
                    <td className="text-green-600 font-medium">${offer.payout.toFixed(2)}</td>
                    <td>${offer.epc.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Sub-ID */}
      {activeTab === 'subs' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {['sub1', 'sub2', 'sub3', 'sub4', 'sub5'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSubField(sub)}
                className={`btn ${subField === sub ? 'btn-primary' : 'btn-secondary'}`}
              >
                {sub.toUpperCase()}
              </button>
            ))}
          </div>

          {subStats.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No data for {subField.toUpperCase()}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{subField.toUpperCase()} Value</th>
                    <th>Clicks</th>
                    <th>Unique</th>
                    <th>Conversions</th>
                    <th>CR %</th>
                    <th>Payout</th>
                    <th>EPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subStats.map((stat) => (
                    <tr key={stat.subValue}>
                      <td className="font-medium">{stat.subValue || '(empty)'}</td>
                      <td>{stat.clicks.toLocaleString()}</td>
                      <td>{stat.uniqueClicks.toLocaleString()}</td>
                      <td>{stat.conversions}</td>
                      <td>{stat.conversionRate.toFixed(2)}%</td>
                      <td className="text-green-600 font-medium">${stat.payout.toFixed(2)}</td>
                      <td>${stat.epc.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
