import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { LoadingScreen } from './components/common/UI';
import { AppLayout } from './components/common/Layout';

// Pages
import Landing       from './pages/Landing';
import Login         from './pages/auth/Login';
import Register      from './pages/auth/Register';
import KYC           from './pages/auth/KYC';

import ReceiverDashboard from './pages/receiver/Dashboard';
import PostDelivery      from './pages/receiver/PostDelivery';

import CarrierDashboard  from './pages/carrier/CarrierDashboard';

import TrackDelivery from './pages/shared/TrackDelivery';
import Chat          from './pages/shared/Chat';
import Wallet        from './pages/shared/Wallet';
import Profile       from './pages/shared/Profile';
import Orders        from './pages/shared/Orders';
import Dispute       from './pages/shared/Dispute';

import AdminOverview from './pages/admin/AdminOverview';
import AdminKYC      from './pages/admin/AdminKYC';
import AdminUsers    from './pages/admin/AdminUsers';
import AdminDisputes from './pages/admin/AdminDisputes';

// ── Route Guards ──────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { loggedIn, loading } = useAuthStore();
  const location = useLocation();
  if (loading)    return <LoadingScreen message="Starting CampusRelay..." />;
  if (!loggedIn)  return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuthStore();
  if (!user?.roles?.includes('admin')) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireApproved({ children }) {
  const { user } = useAuthStore();
  // Allow access even if pending — show banner in layout
  return children;
}

function GuestOnly({ children }) {
  const { loggedIn, loading, user } = useAuthStore();
  if (loading) return <LoadingScreen message="Starting CampusRelay..." />;
  if (loggedIn) {
    if (user?.roles?.includes('admin'))  return <Navigate to="/admin"     replace />;
    if (user?.activeRole === 'carrier')  return <Navigate to="/carrier"   replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ── Layouts ───────────────────────────────────────────────────────────────────
function AppPage({ children }) {
  return (
    <RequireAuth>
      <AppLayout>{children}</AppLayout>
    </RequireAuth>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => { init(); }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/"  element={<Landing />} />
      <Route path="/login"    element={<GuestOnly><Login    /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/kyc"      element={<RequireAuth><KYC /></RequireAuth>} />

      {/* Receiver */}
      <Route path="/dashboard" element={<AppPage><ReceiverDashboard /></AppPage>} />
      <Route path="/post"      element={<AppPage><PostDelivery      /></AppPage>} />
      <Route path="/orders"    element={<AppPage><Orders            /></AppPage>} />

      {/* Carrier */}
      <Route path="/carrier"      element={<AppPage><CarrierDashboard /></AppPage>} />
<Route path="/carrier/feed" element={<AppPage><CarrierDashboard /></AppPage>} />
    

      {/* Shared */}
      <Route path="/track/:id"    element={<AppPage><TrackDelivery /></AppPage>} />
      <Route path="/chat/:id"     element={<AppPage><Chat          /></AppPage>} />
      <Route path="/wallet"       element={<AppPage><Wallet        /></AppPage>} />
      <Route path="/profile"      element={<AppPage><Profile       /></AppPage>} />
      <Route path="/dispute/:id"  element={<AppPage><Dispute       /></AppPage>} />

      {/* Admin */}
      <Route path="/admin"           element={<AppPage><RequireAdmin><AdminOverview /></RequireAdmin></AppPage>} />
      <Route path="/admin/kyc"       element={<AppPage><RequireAdmin><AdminKYC      /></RequireAdmin></AppPage>} />
      <Route path="/admin/users"     element={<AppPage><RequireAdmin><AdminUsers    /></RequireAdmin></AppPage>} />
      <Route path="/admin/disputes"  element={<AppPage><RequireAdmin><AdminDisputes /></RequireAdmin></AppPage>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
