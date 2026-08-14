import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const STATUS_COLORS = {
  reported: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  reopened: 'bg-rose-100 text-rose-800 border-rose-200'
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('in_progress');
  const [responseNotes, setResponseNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    byStatus: { reported: 0, acknowledged: 0, in_progress: 0, resolved: 0, closed: 0 },
    byCategory: { roads: 0, sanitation: 0, electricity: 0, water: 0, drainage: 0, public_property: 0, other: 0 },
    byDepartment: {},
    byPriority: {},
    averageResolutionTime: 0,
    hotspotAreas: [],
    departmentPerformance: [],
    recentActivity: []
  });

  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchDashboardData();
    fetchLiveIssues();
  }, [timeRange, filterCategory, filterStatus]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes] = await Promise.all([
        axios.get('/api/admin/dashboard-stats', {
          params: { range: timeRange }
        }).catch(() => ({ data: null }))
      ]);

      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.warn('Dashboard stats fallback notice:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveIssues = async () => {
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get('/api/issues', { params });
      const issuesList = res.data.data || res.data.issues || [];
      setIssues(issuesList);

      // Compute statistics dynamically from live report data
      const byStatus = { reported: 0, acknowledged: 0, in_progress: 0, resolved: 0, closed: 0 };
      const byCat = { roads: 0, sanitation: 0, electricity: 0, water: 0, drainage: 0, public_property: 0, other: 0 };
      
      let totalResolutionDays = 0;
      let resolvedCountForAvg = 0;

      issuesList.forEach((iss) => {
        if (byStatus[iss.status] !== undefined) byStatus[iss.status]++;
        else byStatus[iss.status] = 1;
        if (byCat[iss.category] !== undefined) byCat[iss.category]++;
        else byCat[iss.category] = 1;

        if ((iss.status === 'resolved' || iss.status === 'closed' || iss.status === 'verified') && iss.createdAt && iss.resolvedAt) {
          const created = new Date(iss.createdAt).getTime();
          const resolved = new Date(iss.resolvedAt).getTime();
          if (!isNaN(created) && !isNaN(resolved) && resolved >= created) {
            totalResolutionDays += (resolved - created) / (1000 * 60 * 60 * 24);
            resolvedCountForAvg++;
          }
        }
      });

      const computedAvgTime = resolvedCountForAvg > 0 ? (totalResolutionDays / resolvedCountForAvg).toFixed(1) : 0;

      setStats((prev) => ({
        ...prev,
        total: issuesList.length,
        byStatus,
        byCategory: byCat,
        averageResolutionTime: computedAvgTime
      }));
    } catch (err) {
      console.warn('Live issues fetch notice:', err.message);
      setStats({
        total: 0,
        byStatus: { reported: 0, acknowledged: 0, in_progress: 0, resolved: 0, closed: 0 },
        byCategory: { roads: 0, sanitation: 0, electricity: 0, water: 0, drainage: 0, public_property: 0, other: 0 },
        byDepartment: {},
        byPriority: {},
        averageResolutionTime: 0,
        hotspotAreas: [],
        departmentPerformance: [],
        recentActivity: []
      });
    }
  };

  const handleClearAllIssues = async () => {
    if (!window.confirm('Are you sure you want to delete all reported issues from the system?')) return;
    try {
      await axios.post('/api/admin/clear-all-issues');
      toast.success('All reported issues cleared successfully!');
      fetchLiveIssues();
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to clear issues');
    }
  };

  const handleOpenResponseModal = (issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status === 'reported' ? 'acknowledged' : 'in_progress');
    setResponseNotes(issue.resolutionNotes || '');
  };

  const handleCloseModal = () => {
    setSelectedIssue(null);
    setResponseNotes('');
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    try {
      setUpdatingStatus(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.put(
        `/api/issues/${selectedIssue.id}/status`,
        {
          status: newStatus,
          notes: responseNotes || `Official status updated to ${newStatus.replace('_', ' ')}.`,
          resolutionNotes: responseNotes
        },
        { headers }
      );

      toast.success(`Working condition updated to ${newStatus.replace('_', ' ').toUpperCase()}!`);
      handleCloseModal();
      fetchLiveIssues();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update working condition');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      reported: '#FCD34D',
      acknowledged: '#60A5FA',
      in_progress: '#F59E0B',
      resolved: '#34D399',
      verified: '#6EE7B7',
      closed: '#9CA3AF'
    };
    return colors[status] || '#9CA3AF';
  };

  const statusChartData = {
    labels: Object.keys(stats.byStatus || {}).map((s) => s.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: Object.values(stats.byStatus || {}),
        backgroundColor: Object.keys(stats.byStatus || {}).map(getStatusColor),
        borderWidth: 1
      }
    ]
  };

  const categoryChartData = {
    labels: Object.keys(stats.byCategory || {}).map((c) => c.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Issues by Category',
        data: Object.values(stats.byCategory || {}),
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'],
        borderWidth: 1
      }
    ]
  };

  const totalOpen =
    (stats.byStatus.reported || 0) +
    (stats.byStatus.acknowledged || 0) +
    (stats.byStatus.in_progress || 0);
  const totalResolved =
    (stats.byStatus.resolved || 0) +
    (stats.byStatus.verified || 0) +
    (stats.byStatus.closed || 0);

  const avgResolutionTimeDisplay = stats.averageResolutionTime && Number(stats.averageResolutionTime) > 0
    ? `${stats.averageResolutionTime} Days`
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/30 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Administration Center
            </span>
            {user?.department && (
              <span className="bg-emerald-500/30 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase">
                Dept: {user.department}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Municipal Governance & Response Hub
          </h1>
          <p className="mt-1 text-slate-300 text-sm max-w-2xl">
            Monitor incoming citizen issues, dispatch maintenance teams, and provide official working condition responses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLiveIssues()}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1.5"
          >
            <span>🔄 Refresh</span>
          </button>
          <button
            onClick={handleClearAllIssues}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-1.5"
          >
            <span>🗑️ Clear All Issues</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reported Issues</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{issues.length}</p>
          <p className="text-xs text-gray-400 mt-1">Live database records</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Active / In Progress</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">{totalOpen}</p>
          <p className="text-xs text-amber-700/70 mt-1">Pending resolution</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved Issues</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{totalResolved}</p>
          <p className="text-xs text-emerald-700/70 mt-1">Action completed</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Avg Resolution Time</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{avgResolutionTimeDisplay}</p>
          <p className="text-xs text-blue-700/70 mt-1">Calculated from resolved reports</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 text-base mb-4">Issues by Status</h3>
          <div className="h-64 flex items-center justify-center">
            {issues.length > 0 ? (
              <Doughnut data={statusChartData} options={{ maintainAspectRatio: false }} />
            ) : (
              <div className="text-center text-gray-400 text-sm">No report data available</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 text-base mb-4">Issues by Category</h3>
          <div className="h-64 flex items-center justify-center">
            {issues.length > 0 ? (
              <Bar data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            ) : (
              <div className="text-center text-gray-400 text-sm">No report data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Queue Table Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Municipal Issues Work Queue</h2>
          <p className="text-xs text-gray-500">Review reported problems, inspect details, and update working condition responses.</p>
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
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {issues.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold">No civic issues in queue</p>
            <p className="text-xs text-gray-400 mt-1">Manual reports submitted by citizens will appear here instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Issue Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reported Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {issues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{iss.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{iss.address || 'SmartCity Region'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-xs px-2.5 py-1 rounded-lg bg-gray-100 font-medium text-gray-700">
                        {iss.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`capitalize text-xs px-2.5 py-1 rounded-lg font-semibold ${
                          iss.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : iss.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {iss.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLORS[iss.status] || 'bg-gray-100 text-gray-800'}`}>
                        {iss.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {iss.createdAt ? format(new Date(iss.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenResponseModal(iss)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Update Working Condition
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg">Update Working Condition</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Issue</label>
                <div className="text-sm font-semibold text-gray-900">{selectedIssue.title}</div>
                <div className="text-xs text-gray-500">{selectedIssue.address}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select New Working Condition Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="acknowledged">Acknowledged (Under Inspection)</option>
                  <option value="in_progress">In Progress (Maintenance Team Dispatched)</option>
                  <option value="resolved">Resolved (Work Completed)</option>
                  <option value="closed">Closed (Verified & Archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Official Response / Inspection Notes</label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows="3"
                  placeholder="Provide official department response notes for citizen inspection..."
                  className="w-full text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 border-t pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors"
                >
                  {updatingStatus ? 'Updating...' : 'Save & Publish Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;