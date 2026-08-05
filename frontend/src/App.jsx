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
import { PlaceholderPage } from './pages/user/PlaceholderPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AgencyLogin } from './pages/agency/AgencyLogin';
import { AgencyLayout } from './pages/agency/AgencyLayout';
import { AgencyDashboard } from './pages/agency/AgencyDashboard';
import { AgencyProfile } from './pages/agency/AgencyProfile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<UserLayout />}>
            <Route index element={<Home />} />
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
                  <PlaceholderPage title="Wallet" icon="👛" />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute roles={['user']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
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
              <ProtectedRoute roles={['agency_admin']}>
                <AgencyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AgencyDashboard />} />
            <Route path="profile" element={<AgencyProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
