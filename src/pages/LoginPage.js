import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Cooldown Timer
  const [cooldown, setCooldown] = useState(60);

  const { login, initiateForgotPassword, verifyForgotPassword, resendOTP } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (showForgotModal && forgotStep === 2 && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showForgotModal, forgotStep, cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    }
  };

  // Trigger Forgot Password Dual-Channel OTP
  const handleInitiateForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered email address.');
      return;
    }

    setResetting(true);
    const result = await initiateForgotPassword(forgotEmail.trim(), forgotPhone);
    setResetting(false);

    if (result.success) {
      setForgotStep(2);
      setCooldown(60);
    }
  };

  // Complete Password Reset via OTP Verification
  const handleCompleteReset = async (e) => {
    e.preventDefault();
    if (!userOtp || userOtp.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New Password must be at least 6 characters long.');
      return;
    }

    setResetting(true);
    const result = await verifyForgotPassword(forgotEmail.trim(), userOtp.trim(), newPassword);
    setResetting(false);

    if (result.success) {
      setShowForgotModal(false);
      navigate('/');
    }
  };

  const handleResendForgotOtp = async () => {
    if (cooldown > 0) return;
    setResetting(true);
    const result = await resendOTP(forgotEmail.trim(), forgotPhone, 'FORGOT_PASSWORD');
    setResetting(false);
    if (result.success) {
      setCooldown(60);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
        
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo.jpg"
            alt="Smart City Logo"
            className="w-16 h-16 rounded-2xl mx-auto object-cover border border-slate-200 shadow-sm"
          />
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to SmartCity
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Citizen & Administrator Portal Access
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">Password (Min. 6 Chars) *</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setCooldown(60);
                }}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-700 hover:bg-blue-800 focus:outline-none disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-600 pt-2">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-700 hover:underline">
              Create New Account
            </Link>
          </p>
        </form>

        {/* Forgot Password OTP Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">🔑 Password Recovery & Reset</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Forgot Step 1: Send Dual-Channel OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleInitiateForgotOtp} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your registered email address and mobile number to receive a 6-digit verification code.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email *</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registered 10-Digit Mobile</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-slate-100 border border-slate-300 rounded-l-xl flex items-center text-slate-700 font-bold text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-16 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetting}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {resetting ? 'Sending OTP...' : 'Send Verification OTP Code ➔'}
                  </button>
                </form>
              )}

              {/* Forgot Step 2: Verify OTP & Reset Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleCompleteReset} className="space-y-4">
                  <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 uppercase flex items-center gap-1">📱✉️ OTP Dispatched</span>
                      <span className="text-[10px] bg-blue-200 text-blue-950 px-1.5 py-0.5 rounded font-bold">5-Min Expiry</span>
                    </div>
                    <p className="text-xs text-slate-700">
                      OTP sent to your registered mobile number (+91 {forgotPhone || '••••••••••'}) and email ({forgotEmail}).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-center">Enter 6-Digit Mobile/Email OTP</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={userOtp}
                      onChange={(e) => setUserOtp(e.target.value)}
                      placeholder="------"
                      className="w-full text-center text-xl font-mono font-bold tracking-widest px-3 py-2.5 border-2 border-blue-600 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min. 6 Characters) *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl py-2.5"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={resetting}
                      className="w-2/3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl py-2.5 disabled:opacity-50 shadow-sm"
                    >
                      {resetting ? 'Verifying...' : 'Verify OTP & Reset'}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResendForgotOtp}
                      disabled={cooldown > 0 || resetting}
                      className={`text-xs font-bold ${
                        cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-700 hover:underline cursor-pointer'
                      }`}
                    >
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : '🔄 Resend OTP Code'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
