import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Fleet from './pages/Fleet';
import WarehousePage from './pages/Warehouse';
import RoutesPage from './pages/Routes';
import Customers from './pages/Customers';
import Notifications from './pages/Notifications';
import TrackOrder from './pages/TrackOrder';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="fleet" element={<ProtectedRoute roles={['admin']}><Fleet /></ProtectedRoute>} />
            <Route path="warehouse" element={<ProtectedRoute roles={['admin']}><WarehousePage /></ProtectedRoute>} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="customers" element={<ProtectedRoute roles={['admin']}><Customers /></ProtectedRoute>} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="track" element={<TrackOrder />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
