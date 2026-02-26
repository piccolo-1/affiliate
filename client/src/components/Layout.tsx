import { useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Link2,
  BarChart3,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Users,
  FileText,
  Webhook,
  ChevronDown,
  Bell,
  Search,
  HelpCircle,
  Shield,
  UserCircle,
  Briefcase,
  CreditCard,
  Target,
  Zap,
  TrendingUp,
  Store
} from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  const affiliateNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview' },
    { name: 'Offer Vault', href: '/offers', icon: Store, description: 'Find offers' },
    { name: 'Tracking', href: '/tracking', icon: Target, description: 'Live tracking' },
    { name: 'My Links', href: '/links', icon: Link2, description: 'Manage links' },
    { name: 'Conversions', href: '/conversions', icon: DollarSign, description: 'View conversions' },
    { name: 'Reports', href: '/reports', icon: BarChart3, description: 'Analytics' },
    { name: 'Postbacks', href: '/postbacks', icon: Webhook, description: 'S2S setup' },
  ];

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, description: 'Network overview' },
    { name: 'Offers', href: '/admin/offers', icon: ShoppingBag, description: 'Manage offers' },
    { name: 'Affiliates', href: '/admin/users', icon: Users, description: 'User management' },
    { name: 'Managers', href: '/admin/managers', icon: Briefcase, description: 'AM team' },
    { name: 'Conversions', href: '/admin/conversions', icon: FileText, description: 'Review' },
    { name: 'Payouts', href: '/admin/payouts', icon: CreditCard, description: 'Process payments' },
  ];

  const isAdminRoute = location.pathname.startsWith('/admin');
  const navigation = isAdminRoute ? adminNavigation : affiliateNavigation;

  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{
        background: 'linear-gradient(180deg, #0f1729 0%, #162033 100%)'
      }}
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center justify-between px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to={isAdminRoute ? '/admin' : '/dashboard'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3182f6 0%, #7c3aed 100%)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">AffiliateHub</span>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Performance Network</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick stats (Toss-style) */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="rounded-xl p-4" style={{ background: 'rgba(49, 130, 246, 0.1)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-400 font-medium">Today's Earnings</span>
              <span className="live-indicator text-emerald-400">Live</span>
            </div>
            <p className="text-2xl font-bold text-white">$0.00</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400">+0% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-4 mb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {isAdminRoute ? 'Admin Panel' : 'Main Menu'}
          </p>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin' || item.href === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block">{item.name}</span>
              </div>
            </NavLink>
          ))}

          {/* Admin/Affiliate Toggle Section */}
          {isAdmin && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="px-4 mb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Switch View
              </p>
              {isAdminRoute ? (
                <NavLink
                  to="/dashboard"
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Affiliate Portal</span>
                </NavLink>
              ) : (
                <NavLink
                  to="/admin"
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                </NavLink>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>

        {/* User section at bottom */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="avatar">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        {/* Top header - Toss style */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2.5 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search bar - Toss style */}
              <div className="hidden md:block search-box">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search offers, links, reports..."
                  className="w-80"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Quick actions */}
              <Link
                to="/offers"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Find Offers</span>
              </Link>

              {/* Help button */}
              <button className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="notification-dot" />
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 mx-2" />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="avatar">
                    {userInitials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="dropdown animate-scale-in">
                      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="dropdown-item flex items-center gap-3"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          <span>Settings</span>
                        </Link>
                        {user?.referralCode && (
                          <div className="dropdown-item flex items-center justify-between">
                            <span className="text-gray-500">Referral Code</span>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-mono">
                              {user.referralCode}
                            </code>
                          </div>
                        )}
                      </div>
                      <div className="py-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="dropdown-item flex items-center gap-3 w-full text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
