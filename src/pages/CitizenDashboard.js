import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/common/SearchBar';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const STATUS_COLORS = {
  reported: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-300',
  resolved: 'bg-green-100 text-green-800 border-green-300',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  closed: 'bg-gray-100 text-gray-800 border-gray-300',
  reopened: 'bg-rose-100 text-rose-800 border-rose-300'
};

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, 15, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
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

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'public'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [mapCenter, setMapCenter] = useState([22.7196, 75.8577]);
  const [searchedMarker, setSearchedMarker] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, [activeTab, filterCategory, filterStatus]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const localKey = user?.id ? `smartcity_local_issues_${user.id}` : 'smartcity_local_issues';
      const res = await axios.get('/api/issues', { params, headers });
      let allIssues = res.data.data || res.data.issues || [];

      // Merge with this specific citizen's locally stored issues buffer if available
      try {
        const localSaved = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (Array.isArray(localSaved) && localSaved.length > 0) {
          const existingIds = new Set(allIssues.map((i) => String(i.id)));
          const toAdd = localSaved.filter((i) => !existingIds.has(String(i.id)));
          allIssues = [...toAdd, ...allIssues];
        }
      } catch (e) {
        console.warn('Local issues merge notice:', e.message);
      }

      // STRICT USER ISOLATION: A citizen MUST ONLY see issues they personally reported
      if (user?.id) {
        allIssues = allIssues.filter((i) => String(i.reportedBy) === String(user.id));
      }

      setIssues(allIssues);
    } catch (error) {
      console.warn('Error fetching issues notice:', error.message);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId, e) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`/api/issues/${issueId}/upvote`);
      setIssues(
        issues.map((item) => {
          if (item.id === issueId) {
            return { ...item, upvoteCount: res.data.upvoteCount || (item.upvoteCount + 1) };
          }
          return item;
        })
      );
    } catch (error) {
      console.warn('Upvote notice:', error.message);
    }
  };

  const handleMapLocationSearch = (loc) => {
    const coords = [loc.lat, loc.lng];
    setMapCenter(coords);
    setSearchedMarker({
      position: coords,
      title: loc.displayName || 'Searched Location',
      address: loc.address
    });
  };

  // Filter issues strictly for this logged-in citizen
  const displayedIssues = issues.filter((iss) => {
    if (!user?.id) return false;
    return String(iss.reportedBy) === String(user.id);
  });

  const totalCount = displayedIssues.length;
  const openCount = displayedIssues.filter((i) =>
    ['reported', 'acknowledged', 'in_progress'].includes(i.status)
  ).length;
  const resolvedCount = displayedIssues.filter((i) =>
    ['resolved', 'verified', 'closed'].includes(i.status)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 text-white text-xs px-3 py-0.5 rounded-full font-semibold">
              Citizen Portal
            </span>
            <span className="text-blue-100 text-xs">
              Welcome, {user?.name || 'Citizen'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Citizen Civic Reports & Live Tracking
          </h1>
          <p className="mt-1 text-blue-100 text-sm sm:text-base max-w-2xl">
            Track real-time resolution of your reported municipal problems, view official department responses, and explore community issues.
          </p>
        </div>
        <Link
          to="/report"
          className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-5 py-3 rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          <span>➕ Report New Issue</span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Reports Tracked</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">In Progress / Under Inspection</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{openCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved by Municipality</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3.5 py-1.5 rounded-xl font-bold text-sm">
            📋 My Reported Issues ({displayedIssues.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="roads">Roads & Potholes</option>
            <option value="sanitation">Sanitation</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water Supply</option>
            <option value="public_property">Public Property</option>
            <option value="drainage">Drainage</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="verified">Verified</option>
            <option value="closed">Closed</option>
          </select>

          <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-semibold ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 text-xs font-semibold ${
                viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Map View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="max-w-xl">
            <SearchBar
              onLocationSelect={handleMapLocationSearch}
              placeholder="Search colony, landmark, or city on map..."
              showGpsButton={true}
            />
          </div>

          <div className="h-[520px] rounded-xl overflow-hidden border border-gray-200 relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} />

              {searchedMarker && (
                <Marker position={searchedMarker.position}>
                  <Popup>
                    <div className="p-1 max-w-xs">
                      <p className="font-bold text-xs text-blue-700">📍 Searched Area</p>
                      <p className="text-xs text-gray-800 mt-0.5">{searchedMarker.address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {displayedIssues.map(
                (issue) =>
                  issue.latitude &&
                  issue.longitude && (
                    <Marker
                      key={issue.id}
                      position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
                    >
                      <Popup>
                        <div className="p-1 max-w-xs space-y-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              STATUS_COLORS[issue.status] || STATUS_COLORS.reported
                            }`}
                          >
                            {issue.status.replace('_', ' ')}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 mt-1">{issue.title}</h4>
                          <p className="text-xs text-gray-500">
                            {issue.category?.replace('_', ' ')} • {issue.address || 'Smart City'}
                          </p>
                          <a
                            href={`/issues/${issue.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs block text-center mt-2 shadow transition-all"
                          >
                            🔍 Open Details & Photos (New Tab) ↗
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  )
              )}
            </MapContainer>
          </div>
        </div>
      ) : displayedIssues.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            📝
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">No Reports in this View</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              {activeTab === 'my'
                ? "You haven't reported any civic issues yet, or your filters matched no records."
                : 'No issues match the selected category and status filters.'}
            </p>
          </div>
          <div>
            <Link
              to="/report"
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
            >
              + Report an Issue Now
            </Link>
          </div>
        </div>
      ) : (
        /* Actual Filled Report Cards with New Tab Inspection Links */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedIssues.map((issue) => {
            const photos = getPhotosArray(issue.photos);
            const firstPhoto = photos.length > 0 ? (typeof photos[0] === 'string' ? photos[0] : photos[0].url) : null;

            return (
              <div
                key={issue.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
              >
                {/* Photo Thumbnail - Clicking opens in New Tab */}
                {firstPhoto ? (
                  <a
                    href={`/issues/${issue.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-48 w-full bg-gray-100 overflow-hidden block"
                  >
                    <img
                      src={firstPhoto}
                      alt={issue.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                      📷 {photos.length} Photo{photos.length > 1 ? 's' : ''}
                    </div>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <span>🔍 Inspect in New Tab ↗</span>
                    </div>
                  </a>
                ) : (
                  <a
                    href={`/issues/${issue.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium hover:bg-slate-100 transition-colors"
                  >
                    <span>📍 Click to View Map & Details (New Tab) ↗</span>
                  </a>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Status & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                          STATUS_COLORS[issue.status] || STATUS_COLORS.reported
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {issue.createdAt ? format(new Date(issue.createdAt), 'MMM d, yyyy') : 'Recent'}
                      </span>
                    </div>

                    {/* Title & Description - Clicking opens in New Tab */}
                    <a
                      href={`/issues/${issue.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group/title"
                    >
                      <h3 className="font-bold text-gray-900 group-hover/title:text-blue-600 transition-colors text-base leading-snug">
                        {issue.title}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm mt-1.5 leading-relaxed line-clamp-2">
                        {issue.description}
                      </p>
                    </a>

                    {/* Official Response Banner (if available) */}
                    {issue.resolutionNotes && (
                      <div className="mt-3 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                        <p className="font-bold text-[11px] text-emerald-950 flex items-center gap-1.5">
                          <span>🏢 Official Department Response:</span>
                        </p>
                        <p className="text-xs text-emerald-900 leading-relaxed line-clamp-2">
                          {issue.resolutionNotes}
                        </p>
                      </div>
                    )}

                    {/* Pinned Address */}
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-blue-600">📍</span>
                      <span className="truncate">{issue.address || 'Smart City Municipal Region'}</span>
                    </div>
                  </div>

                  {/* Card Bottom Bar with Dedicated New Tab Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600 font-medium capitalize bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      {issue.category.replace('_', ' ')}
                    </span>
                    <a
                      href={`/issues/${issue.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 hover:shadow"
                    >
                      <span>Open in New Tab ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
