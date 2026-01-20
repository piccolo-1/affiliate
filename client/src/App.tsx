import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import OfferDetail from './pages/OfferDetail';
import TrackingLinks from './pages/TrackingLinks';
import Conversions from './pages/Conversions';
import Reports from './pages/Reports';
import Postbacks from './pages/Postbacks';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOffers from './pages/admin/AdminOffers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminConversions from './pages/admin/AdminConversions';
import AdminPayouts from './pages/admin/AdminPayouts';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="offers" element={<Offers />} />
        <Route path="offers/:id" element={<OfferDetail />} />
        <Route path="links" element={<TrackingLinks />} />
        <Route path="conversions" element={<Conversions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="postbacks" element={<Postbacks />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="conversions" element={<AdminConversions />} />
        <Route path="payouts" element={<AdminPayouts />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
