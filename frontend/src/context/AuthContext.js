import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Set base URL without duplicate /api
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Support tab-isolated sessions using sessionStorage first, fallback to localStorage
  const getInitialToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getInitialToken());

  // Set axios default header dynamically
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  useEffect(() => {
    const currentToken = getInitialToken();
    if (currentToken) {
      loadUser(currentToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (authToken) => {
    try {
      const tokenToUse = authToken || getInitialToken();
      if (!tokenToUse) {
        setLoading(false);
        return;
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToUse}`;
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      setLoading(false);
    } catch (error) {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const newToken = res.data.token;
      
      // Store in both sessionStorage (tab-isolated) and localStorage
      sessionStorage.setItem('token', newToken);
      localStorage.setItem('token', newToken);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Login failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register', userData);
      const newToken = res.data.token;
      
      sessionStorage.setItem('token', newToken);
      localStorage.setItem('token', newToken);

      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    toast.info('Logged out');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCitizen: user?.role === 'citizen'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};