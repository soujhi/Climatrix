import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/**
 * AUTHENTICATION CONTEXT PROVIDER
 * Handles manual Signup, Login, Profile retrieval, and Logout.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check stored JWT session on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('climatrix_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
          }
        } catch (err) {
          console.warn('[Session Expired] Clearing stored token');
          localStorage.removeItem('climatrix_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  // Manual Signup
  const signup = async (name, email, password, role) => {
    try {
      const res = await api.post('/auth/signup', { name, email, password, role });
      if (res.data.success) {
        localStorage.setItem('climatrix_token', res.data.data.token);
        setUser(res.data.data);
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  };

  // Manual Login
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('climatrix_token', res.data.data.token);
        setUser(res.data.data);
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('climatrix_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
