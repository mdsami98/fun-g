import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserLayout } from './pages/user/UserLayout';
import { Home } from './pages/user/Home';
import { Settings } from './pages/user/Settings';
import { Activity } from './pages/user/Activity';
import { AviatorGame } from './pages/user/AviatorGame';
import { GamesPage } from './pages/user/GamesPage';
import { WalletPage } from './pages/user/WalletPage';
import { PlaceholderPage } from './pages/user/PlaceholderPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AgencyLogin } from './pages/agency/AgencyLogin';
import { AgencyLayout } from './pages/agency/AgencyLayout';
import { AgencyDashboard } from './pages/agency/AgencyDashboard';
import { AgencyProfile } from './pages/agency/AgencyProfile';
import { AgencySettings } from './pages/agency/AgencySettings';
import { AgencyDeposits } from './pages/agency/AgencyDeposits';
import { AgencyUsers } from './pages/agency/AgencyUsers';
import { CrashChartPreview } from './pages/dev/CrashChartPreview';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/crash-chart" element={<CrashChartPreview />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<UserLayout />}>
            <Route index element={<Home />} />
            <Route path="games" element={<GamesPage />} />
            <Route
              path="activity"
              element={
                <ProtectedRoute roles={['user']}>
                  <Activity />
                </ProtectedRoute>
              }
            />
            <Route
              path="wallet"
              element={
                <ProtectedRoute roles={['user']}>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="account"
              element={
                <ProtectedRoute roles={['user']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<Navigate to="/account" replace />} />
          </Route>

          <Route path="/aviator" element={<AviatorGame />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/agency/login" element={<AgencyLogin />} />
          <Route
            path="/agency"
            element={
              <ProtectedRoute roles={['agency_admin', 'super_admin']}>
                <AgencyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AgencyDashboard />} />
            <Route path="users" element={<AgencyUsers />} />
            <Route path="deposits" element={<AgencyDeposits />} />
            <Route path="settings" element={<AgencySettings />} />
            <Route path="profile" element={<AgencyProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
