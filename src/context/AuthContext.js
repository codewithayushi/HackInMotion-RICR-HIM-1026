import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Helper function to resolve absolute/relative API URLs dynamically on every request
const getApiUrl = (endpoint) => {
  // On Vercel / Live Deployment (any non-localhost domain): ALWAYS use relative URL (/api/...)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return endpoint;
  }

  // If REACT_APP_API_URL is set and does not point to localhost
  if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
    const base = process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
    return `${base}${endpoint}`;
  }

  // Local development fallback
  return `http://localhost:5000${endpoint}`;
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const getInitialToken = () => {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getInitialToken());

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
      const res = await axios.get(getApiUrl('/api/auth/me'));
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
      const url = getApiUrl('/api/auth/login');
      const res = await axios.post(url, { email, password });
      const newToken = res.data.token;
      
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

  // Step 1: Initiate Registration & Dispatch Dual-Channel OTP
  const initiateRegistration = async (userData) => {
    try {
      const primaryUrl = getApiUrl('/api/auth/register/initiate');
      let res;
      try {
        res = await axios.post(primaryUrl, userData);
      } catch (err1) {
        const fallbackUrl = getApiUrl('/api/auth/register');
        res = await axios.post(fallbackUrl, userData);
      }

      toast.success(res.data.message || 'OTP dispatched to registered mobile and email.');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to dispatch OTP. Please try again.';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Step 2: Verify Registration OTP & Complete Account Creation
  const verifyRegistration = async (email, otp) => {
    try {
      const url = getApiUrl('/api/auth/register/verify');
      const res = await axios.post(url, { email, otp });
      const newToken = res.data.token;

      sessionStorage.setItem('token', newToken);
      localStorage.setItem('token', newToken);

      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      toast.success('Account verified and registered successfully!');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'OTP Verification failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Resend OTP Service with Cooldown
  const resendOTP = async (email, phone, purpose) => {
    try {
      const url = getApiUrl('/api/auth/otp/resend');
      const res = await axios.post(url, { email, phone, purpose });
      toast.success(res.data.message || 'New OTP dispatched to registered mobile and email.');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to resend OTP';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Forgot Password Step 1: Request OTP
  const initiateForgotPassword = async (email, phone) => {
    try {
      const url = getApiUrl('/api/auth/forgot-password/initiate');
      const res = await axios.post(url, { email, phone });
      toast.success(res.data.message || 'Password reset OTP dispatched to registered mobile and email.');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to initiate password reset';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Forgot Password Step 2: Verify OTP & Reset Password
  const verifyForgotPassword = async (email, otp, newPassword) => {
    try {
      const url = getApiUrl('/api/auth/forgot-password/verify');
      const res = await axios.post(url, { email, otp, newPassword });
      const newToken = res.data.token;

      sessionStorage.setItem('token', newToken);
      localStorage.setItem('token', newToken);

      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(res.data.user);
      toast.success('Password reset successful! You are now signed in.');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Password reset failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    toast.info('Logged out successfully');
  };

  const value = {
    user,
    loading,
    login,
    initiateRegistration,
    verifyRegistration,
    resendOTP,
    initiateForgotPassword,
    verifyForgotPassword,
    register: verifyRegistration,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCitizen: user?.role === 'citizen'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};