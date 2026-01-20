import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, CreditCard, Lock, Copy, Check, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'payout' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    company: ''
  });

  const [payout, setPayout] = useState({
    payoutMethod: 'paypal',
    payoutDetails: '',
    minimumPayout: 50
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const response = await api.get('/api/auth/me');
      setProfile({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        company: response.data.company || ''
      });
      setPayout({
        payoutMethod: response.data.payoutMethod || 'paypal',
        payoutDetails: response.data.payoutDetails || '',
        minimumPayout: response.data.minimumPayout || 50
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  async function updateProfile() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/api/auth/profile', profile);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function updatePayout() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/api/auth/profile', payout);
      setSuccess('Payout settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update payout settings');
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/api/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setSuccess('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  function copyReferralCode() {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Referral code */}
      {user?.referralCode && (
        <div className="card bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <h3 className="text-lg font-semibold mb-2">Your Referral Code</h3>
          <p className="text-white/80 text-sm mb-3">
            Share this code with other affiliates. When they sign up, they'll be linked to your account.
          </p>
          <div className="flex items-center gap-3">
            <code className="bg-white/20 px-4 py-2 rounded-lg text-lg font-mono">
              {user.referralCode}
            </code>
            <button
              onClick={copyReferralCode}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'payout', label: 'Payout', icon: CreditCard },
            { id: 'security', label: 'Security', icon: Lock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError('');
                setSuccess('');
              }}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <Check className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                className="input"
                placeholder="Your company name"
              />
            </div>
            <button
              onClick={updateProfile}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Payout Tab */}
      {activeTab === 'payout' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Payout Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payout Method</label>
              <select
                value={payout.payoutMethod}
                onChange={(e) => setPayout({ ...payout, payoutMethod: e.target.value })}
                className="input"
              >
                <option value="paypal">PayPal</option>
                <option value="bank">Bank Transfer</option>
                <option value="payoneer">Payoneer</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {payout.payoutMethod === 'paypal' ? 'PayPal Email' :
                 payout.payoutMethod === 'bank' ? 'Bank Account Details' :
                 payout.payoutMethod === 'crypto' ? 'Wallet Address' : 'Account Details'}
              </label>
              <textarea
                value={payout.payoutDetails}
                onChange={(e) => setPayout({ ...payout, payoutDetails: e.target.value })}
                className="input min-h-[100px]"
                placeholder={
                  payout.payoutMethod === 'paypal' ? 'your@paypal.email' :
                  payout.payoutMethod === 'bank' ? 'Bank name, account number, routing number, etc.' :
                  payout.payoutMethod === 'crypto' ? 'Your USDT/BTC wallet address' :
                  'Your account details'
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payout ($)</label>
              <input
                type="number"
                min="50"
                step="10"
                value={payout.minimumPayout}
                onChange={(e) => setPayout({ ...payout, minimumPayout: Number(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum: $50</p>
            </div>
            <button
              onClick={updatePayout}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Payout Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="input"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="input"
              />
            </div>
            <button
              onClick={changePassword}
              disabled={loading || !passwords.currentPassword || !passwords.newPassword}
              className="btn btn-primary"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
