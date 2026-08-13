import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const STATUS_COLORS = {
  reported: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  reopened: 'bg-rose-100 text-rose-800 border-rose-200'
};

const CitizenDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'public'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchIssues();
  }, [activeTab, filterCategory, filterStatus]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeTab === 'public') {
        params.publicView = true;
      }
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get('/api/issues', { params });
      setIssues(res.data.data || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId, e) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`/api/issues/${issueId}/upvote`);
      setIssues(issues.map(item => {
        if (item.id === issueId) {
          return { ...item, upvoteCount: res.data.upvoteCount };
        }
        return item;
      }));
    } catch (error) {
      console.error('Upvote failed:', error);
    }
  };

  const myCount = issues.length;
  const openCount = issues.filter(i => ['reported', 'acknowledged', 'in_progress'].includes(i.status)).length;
  const resolvedCount = issues.filter(i => ['resolved', 'verified', 'closed'].includes(i.status)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Citizen Issue Reporting Portal</h1>
          <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-2xl">
            Report civic problems with map location and photo evidence, track real-time resolution, and support community issues.
          </p>
        </div>
        <Link
          to="/report"
          className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-5 py-3 rounded-xl shadow transition-all duration-200 transform hover:-translate-y-0.5"
        >
          + Report New Issue
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Issues</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{myCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">In Progress / Open</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{openCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex space-x-2 border-b sm:border-b-0 pb-2 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'my' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Issues
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'public' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All City Issues
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
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
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="verified">Verified</option>
            <option value="closed">Closed</option>
          </select>

          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-semibold ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 text-xs font-semibold ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Content View */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 h-[500px] overflow-hidden">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {issues.map(issue => (
              issue.latitude && issue.longitude && (
                <Marker key={issue.id} position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}>
                  <Popup>
                    <div className="p-1 max-w-xs">
                      <h4 className="font-bold text-sm text-gray-900">{issue.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{issue.category.replace('_', ' ')} • Status: {issue.status}</p>
                      <Link to={`/issues/${issue.id}`} className="text-xs text-blue-600 font-semibold block mt-2">
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by reporting a civic issue in your area.</p>
          <div className="mt-6">
            <Link
              to="/report"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              + Report An Issue
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map(issue => (
            <div key={issue.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLORS[issue.status] || STATUS_COLORS.reported}`}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {format(new Date(issue.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <Link to={`/issues/${issue.id}`} className="block group">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {issue.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {issue.description}
                  </p>
                </Link>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                    📍 {issue.category.replace('_', ' ')}
                  </span>
                  <span className="font-medium text-gray-600">
                    Dept: {issue.department}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                <button
                  onClick={(e) => handleUpvote(issue.id, e)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 hover:text-blue-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <span>▲ Upvote</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">{issue.upvoteCount || 0}</span>
                </button>

                <Link
                  to={`/issues/${issue.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
