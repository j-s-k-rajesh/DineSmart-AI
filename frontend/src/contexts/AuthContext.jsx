import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleLogoutEvent = () => logout(true);
    window.addEventListener('auth:logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const loginStaff = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginCustomerTable = async (restaurantId, tableId, nickname) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/table-session', { restaurantId, tableId, nickname });
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        return { success: true, session: res.data.session };
      }

      return { success: false, error: 'Failed to activate table session' };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to activate table session' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (localOnly = false) => {
    setLoading(true);
    try {
      if (!localOnly) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginStaff, loginCustomerTable, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
