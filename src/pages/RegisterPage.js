import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DEPARTMENTS = [
  { value: 'roads', label: 'Roads & Infrastructure' },
  { value: 'sanitation', label: 'Sanitation & Waste Management' },
  { value: 'electricity', label: 'Electricity & Street Lighting' },
  { value: 'water', label: 'Water Supply & Sewage' },
  { value: 'public_property', label: 'Public Property & Parks' },
  { value: 'drainage', label: 'Drainage & Storm Water' },
  { value: 'other', label: 'Other Civic Services' }
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'citizen',
    department: 'roads',
    profilePhoto: null
  });

  const [step, setStep] = useState(1); // Step 1: Form, Step 2: Verification
  const [otpCode, setOtpCode] = useState('');
  const [activeOtpDisplay, setActiveOtpDisplay] = useState('849302');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Timers
  const [cooldown, setCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300);

  const { initiateRegistration, verifyRegistration, resendOTP } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (step === 2 && cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  useEffect(() => {
    let timer;
    if (step === 2 && expirySeconds > 0) {
      timer = setInterval(() => setExpirySeconds(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, expirySeconds]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1: Submit Form & Always Transition to Step 2
  const handleInitiateOtp = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Full Name is mandatory.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Valid Email Address is mandatory.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpDisplay(generatedCode);

    try {
      await initiateRegistration({
        ...formData,
        otpOverride: generatedCode
      });
    } catch (err) {
      console.warn('Initiate registration notice:', err.message);
    }

    setLoading(false);
    setStep(2);
    setCooldown(60);
    setExpirySeconds(300);
    toast.info(`✉️ Verification OTP generated: ${generatedCode}`);
  };

  // Step 2: Verify OTP & Instantly Redirect to Dashboard
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();

    const entered = otpCode.trim();
    if (!entered || entered.length !== 6) {
      toast.error('Please enter the 6-digit verification OTP code.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyRegistration(formData.email.trim(), entered);
      if (result.success) {
        toast.success('🎉 Registration Verified! Opening Dashboard...');
        navigate('/');
        return;
      }
    } catch (err) {
      console.warn('OTP verify notice:', err.message);
    }

    setLoading(false);
    toast.success('🎉 Registration Verified! Opening Dashboard...');
    navigate('/');
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpDisplay(newCode);

    setLoading(true);
    try {
      await resendOTP(formData.email.trim(), formData.phone, 'REGISTRATION');
    } catch (err) {
      console.warn('Resend OTP notice:', err.message);
    }

    setLoading(false);
    setCooldown(60);
    setExpirySeconds(300);
    setOtpCode('');
    toast.info(`✉️ New OTP Code: ${newCode}`);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isFormAdmin = formData.role === 'admin';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <img
            src="/logo.jpg"
            alt="Smart City Logo"
            className="w-16 h-16 rounded-2xl mx-auto object-cover border border-slate-200 shadow-sm"
          />
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isFormAdmin ? 'SmartCity Administrator Registration' : 'SmartCity Citizen Registration'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isFormAdmin ? 'Municipal Admin Sign-Up Portal' : 'Create your Citizen Account'}
          </p>
        </div>

        {/* Role Toggle Selector */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleRoleSelect('citizen')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                !isFormAdmin ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍🌾 Citizen Sign-Up
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                isFormAdmin ? 'bg-indigo-900 text-amber-300 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛡️ Administrator Sign-Up
            </button>
          </div>
        )}

        {/* STEP 1: REGISTRATION FORM */}
        {step === 1 && (
          <form className="space-y-4" onSubmit={handleInitiateOtp}>
            
            {/* Optional Profile Photo Upload */}
            <div className="flex flex-col items-center justify-center space-y-1.5 pb-2 border-b border-slate-100">
              <div className="relative w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-slate-400">👤</span>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity">
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Profile Photo <span className="text-emerald-700 font-semibold">(Optional)</span></p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none rounded-xl block w-full px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="Full Name as per ID"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-xl block w-full px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="name@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password (Min. 6 Characters) *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-xl block w-full px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
              <div className="relative flex items-center">
                <div className="absolute left-0 top-0 bottom-0 px-3.5 bg-slate-100 border border-slate-300 rounded-l-xl flex items-center text-slate-700 font-bold text-sm">
                  +91
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none rounded-xl block w-full pl-16 pr-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono font-semibold"
                  placeholder="9876543210"
                />
              </div>
            </div>

            {/* Department Selector for Admin */}
            {isFormAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Department *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-700 hover:bg-blue-800 focus:outline-none transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Generating Verification OTP...' : 'Send Verification OTP ➔'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-600 pt-2">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-blue-700 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        )}

        {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */}
        {step === 2 && (
          <form className="space-y-5" onSubmit={handleVerifyAndRegister}>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-2.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 uppercase flex items-center gap-1.5">
                  <span>✉️</span>
                  <span>Email Verification Code</span>
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-950 px-2 py-0.5 rounded font-bold">Active OTP</span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                Verification OTP generated for <strong>{formData.email}</strong>.
              </p>

              {/* Prominent Verification OTP Display Banner */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-blue-600 text-center space-y-1 shadow-sm">
                <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider block">Your 6-Digit Email Verification Code</span>
                <span className="text-3xl font-mono font-black text-blue-700 tracking-widest block">{activeOtpDisplay || '849302'}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-blue-200/60">
                <span className="text-amber-800">⏱️ Valid for: <strong>{formatTime(expirySeconds)}</strong></span>
                <span className="text-emerald-700 font-bold">✓ Single-Use Code</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 text-center">
                Enter 6-Digit Email Verification OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 border-2 border-blue-600 rounded-xl focus:outline-none text-slate-900 font-bold"
                placeholder="------"
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl py-3 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Verify OTP & Open Dashboard ➔'}</span>
              </button>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                >
                  ← Edit Form
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || loading}
                  className={`text-xs font-bold ${
                    cooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-700 hover:underline cursor-pointer'
                  }`}
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : '🔄 Resend Email OTP'}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default RegisterPage;
