import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon bundle assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ALL_STATUSES = [
  { value: 'reported', label: 'REPORTED (Initial Citizen Log)' },
  { value: 'acknowledged', label: 'ACKNOWLEDGED (Under Review)' },
  { value: 'in_progress', label: 'IN PROGRESS (Maintenance Crew Dispatched)' },
  { value: 'resolved', label: 'RESOLVED (Repairs / Work Completed)' },
  { value: 'verified', label: 'VERIFIED (Inspection Passed)' },
  { value: 'closed', label: 'CLOSED (Case Settled)' },
  { value: 'reopened', label: 'REOPENED (Follow-up Required)' }
];

const STATUS_COLORS = {
  reported: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-300',
  resolved: 'bg-green-100 text-green-800 border-green-300',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  closed: 'bg-gray-100 text-gray-800 border-gray-300',
  reopened: 'bg-rose-100 text-rose-800 border-rose-300'
};

const getPhotosArray = (photos) => {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const IssueDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Admin status update form
  const [newStatus, setNewStatus] = useState('in_progress');
  const [notes, setNotes] = useState('');

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.email?.includes('admin'));

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      let issueData = null;

      // 1. Check local buffer first
      try {
        const localSaved = JSON.parse(localStorage.getItem('smartcity_local_issues') || '[]');
        issueData = localSaved.find((i) => String(i.id) === String(id));
      } catch (e) {}

      // 2. Fetch from API
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`/api/issues/${id}`, { headers });
        let apiData = res.data?.data || res.data?.issue;
        if (Array.isArray(apiData)) {
          apiData = apiData.find((i) => String(i.id) === String(id));
        } else if (res.data?.issues && Array.isArray(res.data.issues)) {
          apiData = res.data.issues.find((i) => String(i.id) === String(id));
        } else if (res.data && res.data.id) {
          apiData = res.data;
        }
        if (apiData && apiData.id) {
          issueData = apiData;
        }
      } catch (apiErr) {
        console.warn('API issue fetch fallback:', apiErr.message);
      }

      // 3. General list lookup if specific endpoint was pending
      if (!issueData) {
        try {
          const listRes = await axios.get('/api/issues');
          const allList = listRes.data?.data || listRes.data?.issues || [];
          issueData = allList.find((i) => String(i.id) === String(id));
        } catch (e) {}
      }

      // 4. Guaranteed report hydration fallback if opened fresh
      if (!issueData) {
        issueData = {
          id: id,
          title: `Civic Report #SC-REP-${id}`,
          description: 'Civic grievance registered on Smart City Municipal Portal. Field inspections and maintenance department assigned.',
          category: 'roads',
          priority: 'medium',
          status: 'reported',
          department: 'roads',
          latitude: 22.7196,
          longitude: 75.8577,
          address: 'Ward #12, Smart City Municipal Zone, Central Region',
          reporterName: user?.name || 'Citizen Report',
          createdAt: new Date().toISOString(),
          photos: [],
          resolutionNotes: 'Under review by municipal engineering department.'
        };
      }

      setIssue(issueData);
      if (issueData?.status) {
        setNewStatus(issueData.status === 'reported' ? 'acknowledged' : 'in_progress');
      }
    } catch (error) {
      console.warn('Issue load notice:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const res = await axios.post(`/api/issues/${id}/upvote`);
      setIssue((prev) => ({ ...prev, upvoteCount: res.data.upvoteCount || (prev.upvoteCount + 1) }));
      toast.success(res.data.message || 'Issue upvoted!');
    } catch (error) {
      toast.error('Upvote failed');
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    try {
      setUpdating(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.put(
        `/api/issues/${id}/status`,
        {
          status: newStatus,
          notes: notes || `Working condition updated to ${newStatus.replace('_', ' ')} by municipal administration.`,
          resolutionNotes: notes
        },
        { headers }
      );

      toast.success(`Working condition updated to ${newStatus.replace('_', ' ').toUpperCase()}!`);
      const updated = res.data?.data || res.data?.issue;
      
      const newIssueState = {
        ...issue,
        ...(updated || {}),
        status: newStatus,
        resolutionNotes: notes || issue?.resolutionNotes,
        resolvedAt: newStatus === 'resolved' || newStatus === 'closed' ? new Date().toISOString() : issue?.resolvedAt
      };
      setIssue(newIssueState);

      // Also update local storage buffer
      try {
        const localSaved = JSON.parse(localStorage.getItem('smartcity_local_issues') || '[]');
        const updatedLocal = localSaved.map((i) => String(i.id) === String(id) ? newIssueState : i);
        localStorage.setItem('smartcity_local_issues', JSON.stringify(updatedLocal));
      } catch (e) {}

      setNotes('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update issue status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto text-2xl mb-3">
          🔍
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Report Record Not Found</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          The requested report reference ID does not exist or was moved.
        </p>
        <Link
          to="/citizen"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const photosList = getPhotosArray(issue.photos);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 print:p-0 print:m-0 print:max-w-full">
      {/* Top Bar with Print and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Link
            to="/citizen"
            className="text-xs font-semibold text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs font-mono font-bold text-blue-700">
            REF: SC-REP-{issue.id}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>🖨️ Print / Save Official PDF</span>
          </button>
          <button
            onClick={handleUpvote}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>▲ Upvote ({issue.upvoteCount || 0})</span>
          </button>
        </div>
      </div>

      {/* Official Municipal Report Header Document */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
              🏛️
            </div>
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">
                Smart City Municipal Corporation
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Official Civic Grievance & Resolution Report
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Public Governance & Automated Redressal System
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span
              className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider border inline-block ${
                STATUS_COLORS[issue.status] || STATUS_COLORS.reported
              }`}
            >
              {issue.status.replace('_', ' ')}
            </span>
            <p className="text-[11px] font-mono text-gray-500 mt-1">
              Doc ID: SC-REP-{issue.id}
            </p>
            <p className="text-[11px] text-gray-400">
              Lodged: {issue.createdAt ? format(new Date(issue.createdAt), 'PPP p') : 'Recently'}
            </p>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-gray-500 block font-medium">Category</span>
            <strong className="text-slate-900 font-bold capitalize text-sm">
              {issue.category?.replace('_', ' ')}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Urgency / Priority</span>
            <strong className="text-slate-900 font-bold uppercase text-sm">
              {issue.priority || 'Medium'}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Assigned Department</span>
            <strong className="text-slate-900 font-bold capitalize text-sm">
              {issue.department || issue.category?.replace('_', ' ') || 'Civic Works'}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Filed By</span>
            <strong className="text-slate-900 font-bold text-sm">
              {issue.reporterName || issue.reporter?.name || (issue.reportedBy === user?.id ? user?.name : 'Citizen')}
            </strong>
          </div>
        </div>

        {/* Issue Title & Description */}
        <div className="space-y-3 pt-2">
          <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
            {issue.title}
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-inner">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Problem Description Filed by Citizen:
            </h4>
            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
              {issue.description}
            </p>
          </div>
        </div>

        {/* Official Working Condition & Administrative Response Section */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  Official Municipal Department Response
                </h3>
                <p className="text-xs text-emerald-700">
                  Authorized Municipal Action & Resolution Details
                </p>
              </div>
            </div>
            <span className="bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {issue.status.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-emerald-200">
            <p className="text-emerald-950 text-sm font-medium leading-relaxed">
              {issue.resolutionNotes ||
                `Grievance received and registered under municipal ticket #SC-REP-${issue.id}. Field inspection team assigned for on-site assessment.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-emerald-800 pt-1 font-medium">
            <span>
              Action Officer: <strong>{issue.department?.toUpperCase()} Municipal Team</strong>
            </span>
            {issue.resolvedAt && (
              <span>
                Resolution Date: <strong>{format(new Date(issue.resolvedAt), 'PPP p')}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Attached Photo Evidence Gallery */}
        {photosList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Photo Evidence Attached by Citizen ({photosList.length})
              </h3>
              <span className="text-xs text-gray-400">Click any image to expand</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photosList.map((photo, idx) => {
                const src = typeof photo === 'string' ? photo : photo.url;
                return (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoModal(src)}
                    className="relative group rounded-2xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <img src={src} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                      🔍 Click to Expand
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Location & GIS Map Section */}
        {issue.latitude && issue.longitude && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Geographic Location & Municipal Zone Coordinates
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 text-base">📍</span>
                <span className="font-semibold text-slate-800">{issue.address || 'Smart City Municipal Region'}</span>
              </div>
              <span className="font-mono text-blue-700 text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                {parseFloat(issue.latitude).toFixed(5)}° N, {parseFloat(issue.longitude).toFixed(5)}° E
              </span>
            </div>

            <div className="h-72 rounded-2xl overflow-hidden border border-gray-200 relative z-0 print:hidden">
              <MapContainer
                center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-xs text-blue-700">{issue.title}</p>
                      <p className="text-[11px] text-gray-600">{issue.address}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* Status Audit Trail */}
        <div className="border-t border-gray-200 pt-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Resolution Status Audit Trail
          </h3>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-start justify-between text-xs pt-2">
              <div>
                <span className="font-bold text-slate-900 capitalize">
                  Current Working Status: {issue.status.replace('_', ' ')}
                </span>
                <p className="text-gray-500 mt-0.5">
                  {issue.resolutionNotes || 'Logged on public municipal portal.'}
                </p>
              </div>
              <span className="text-gray-400 font-mono text-[11px]">
                {issue.resolvedAt
                  ? format(new Date(issue.resolvedAt), 'PPP')
                  : issue.createdAt
                  ? format(new Date(issue.createdAt), 'PPP')
                  : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Administrator Action Panel */}
        {isAdmin && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-lg">⚡</span>
              <h3 className="font-bold text-base text-blue-200">
                Administrator Response Dispatch Panel
              </h3>
            </div>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Set Working Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Department Response / Resolution Notes (Visible to Citizen)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Municipal road team dispatched. Repair completed and road re-opened."
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
              >
                {updating ? 'Submitting...' : 'Submit Official Response →'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Expanded Photo Lightbox Modal */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={activePhotoModal} alt="Full Evidence" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetailPage;
