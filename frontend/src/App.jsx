import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

import LoginView from './views/LoginView';
import CustomerView from './views/CustomerView';
import KitchenView from './views/KitchenView';
import AdminView from './views/AdminView';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-semibold">
        <div className="animate-pulse">Loading DineSmart AI...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'customer') {
      return <Navigate to={`/menu/${user.restaurantId}/${user.tableId}`} replace />;
    }

    if (user.role === 'kitchen' || user.role === 'waiter') {
      return <Navigate to="/kitchen" replace />;
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.role === 'customer' ? (
              <Navigate to={`/menu/${user.restaurantId}/${user.tableId}`} replace />
            ) : user.role === 'kitchen' || user.role === 'waiter' ? (
              <Navigate to="/kitchen" replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<LoginView />} />
      <Route path="/menu/:restaurantId/:tableId" element={<CustomerView />} />

      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['kitchen', 'waiter', 'admin', 'superadmin']}>
            <KitchenView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminView />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}
