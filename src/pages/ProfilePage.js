import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  { value: 'roads', label: 'Roads & Infrastructure' },
  { value: 'sanitation', label: 'Sanitation & Waste Management' },
  { value: 'electricity', label: 'Electricity & Street Lighting' },
  { value: 'water', label: 'Water Supply & Sewage' },
  { value: 'public_property', label: 'Public Property & Parks' },
  { value: 'drainage', label: 'Drainage & Storm Water' }
];

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || 'roads'
  });

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || 'roads'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    // 10-digit phone validation
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put('/api/auth/profile', formData);
      
      if (res.data.token) {
        sessionStorage.setItem('token', res.data.token);
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      }

      toast.success('Profile updated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await axios.delete('/api/auth/account');
      toast.success('Account deleted successfully');
      logout();
      navigate('/register');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow text-center">
        <p className="text-gray-600">Please log in to manage profile settings.</p>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Citizen & Account Settings</h1>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            }`}>
              {isAdmin ? 'Administrator' : 'Citizen Account'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Municipal Governance Official Account Management Portal</p>
        </div>
        <div className="text-3xl">🏛️</div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          {/* Email (Read only) */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Email Address (Registered)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed font-medium"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* 10-Digit Mobile Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">10-Digit Mobile Number *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-medium">+91</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                required
                placeholder="9876543210"
                className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Used for 6-digit SMS OTP security verification.</p>
          </div>

          {/* Account Role Security Info (Restricted from self-promotion) */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase text-slate-700">Account Access Role</label>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                isAdmin ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}>
                {isAdmin ? '🛡️ Administrator Access' : '👨‍🌾 Citizen Account'}
              </span>
            </div>

            {!isAdmin ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                <span>🔒</span>
                <span><strong>Role Security Restricted:</strong> Citizens cannot self-promote to Administrator. Role escalation requires official Municipal Department authorization.</span>
              </p>
            ) : (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-red-50 p-6 rounded-2xl border border-red-200 space-y-4">
        <div>
          <h3 className="text-base font-bold text-red-900">Account Danger Zone</h3>
          <p className="text-xs text-red-700 mt-0.5">Delete your account permanently. All registered access credentials will be removed.</p>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          Delete Account Permanently
        </button>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900">Confirm Permanent Account Deletion</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete your account? This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
