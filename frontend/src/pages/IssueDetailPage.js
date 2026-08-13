import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const STATUS_TRANSITIONS = {
  reported: ['acknowledged'],
  acknowledged: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['verified', 'reopened'],
  verified: ['closed', 'reopened'],
  reopened: ['acknowledged', 'in_progress']
};

// Safe helper to parse photos array from JSON string or Array
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
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Admin status update form
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/issues/${id}`);
      setIssue(res.data.data);
      const currentStatus = res.data.data.status;
      const available = STATUS_TRANSITIONS[currentStatus] || [];
      if (available.length > 0) {
        setNewStatus(available[0]);
      }
    } catch (error) {
      console.error('Error fetching issue:', error);
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const res = await axios.post(`/api/issues/${id}/upvote`);
      setIssue({ ...issue, upvoteCount: res.data.upvoteCount });
      toast.success(res.data.message);
    } catch (error) {
      toast.error('Upvote failed');
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    try {
      setUpdating(true);
      await axios.put(`/api/issues/${id}/status`, {
        status: newStatus,
        notes,
        resolutionNotes
      });
      toast.success('Issue status updated successfully!');
      fetchIssue();
      setNotes('');
      setResolutionNotes('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Issue Not Found</h2>
        <Link to="/" className="text-blue-600 font-semibold mt-4 inline-block">← Back to Dashboard</Link>
      </div>
    );
  }

  const availableNextStatuses = STATUS_TRANSITIONS[issue.status] || [];
  const photosList = getPhotosArray(issue.photos);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600">
        ← Back to Issues
      </Link>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 columns: Details & Photos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase bg-blue-100 text-blue-800">
                {issue.category.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500">
                Reported {format(new Date(issue.createdAt), 'PPP')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{issue.title}</h1>

            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
              {issue.description}
            </p>

            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">Reported by:</span>
                <span className="bg-gray-100 px-2.5 py-1 rounded-md font-semibold text-gray-800">
                  {issue.reporter?.name || 'Citizen'}
                </span>
              </div>

              <button
                onClick={handleUpvote}
                className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <span>▲ Upvote Issue</span>
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{issue.upvoteCount}</span>
              </button>
            </div>
          </div>

          {/* Photos Section */}
          {photosList.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Uploaded Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photosList.map((photo, idx) => (
                  <img
                    key={idx}
                    src={typeof photo === 'string' ? photo : photo.url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Map Location */}
          {issue.latitude && issue.longitude && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-lg font-bold text-gray-900">Issue Location</h3>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                <MapContainer
                  center={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}>
                    <Popup>{issue.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Status Timeline & Admin Controls */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Status</h3>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
              <span className="text-xl font-extrabold text-gray-900 capitalize">
                {issue.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 space-y-1">
              <p>Department: <span className="font-semibold text-gray-800">{issue.department}</span></p>
              <p>Priority: <span className="font-semibold text-gray-800 uppercase">{issue.priority}</span></p>
            </div>
          </div>

          {/* Admin Workflow Control Panel */}
          {isAdmin && availableNextStatuses.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md space-y-4">
              <h3 className="font-bold text-lg text-blue-300">Admin Action Panel</h3>
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Update Status To</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableNextStatuses.map(st => (
                      <option key={st} value={st}>{st.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Update Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter status change notes..."
                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </form>
            </div>
          )}

          {/* Status History Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Status History</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200">
              {issue.StatusHistories && issue.StatusHistories.length > 0 ? (
                issue.StatusHistories.map((item, index) => (
                  <div key={index} className="relative flex items-start space-x-3 pl-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">{item.status.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{item.notes}</p>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {format(new Date(item.createdAt), 'PPp')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">Reported initially</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetailPage;
