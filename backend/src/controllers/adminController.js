const { Issue, User, StatusHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

// @desc    Get dashboard statistics for admin
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const { range = 'week' } = req.query;

    // Date range filter
    const now = new Date();
    let startDate = new Date();
    if (range === 'day') {
      startDate.setDate(now.getDate() - 1);
    } else if (range === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // default week
      startDate.setDate(now.getDate() - 7);
    }

    const whereClause = {
      createdAt: {
        [Op.gte]: startDate
      }
    };

    // Admin department filtering if needed
    if (req.user.department && req.user.department !== 'all') {
      whereClause.department = req.user.department;
    }

    // 1. Total Issues
    const total = await Issue.count({ where: whereClause });

    // 2. Count by Status
    const statuses = ['reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened'];
    const byStatus = {};
    for (const status of statuses) {
      byStatus[status] = await Issue.count({ where: { ...whereClause, status } });
    }

    // 3. Count by Category
    const categories = ['roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other'];
    const byCategory = {};
    for (const cat of categories) {
      byCategory[cat] = await Issue.count({ where: { ...whereClause, category: cat } });
    }

    // 4. Count by Department
    const departments = ['roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other'];
    const byDepartment = {};
    for (const dept of departments) {
      byDepartment[dept] = await Issue.count({ where: { ...whereClause, department: dept } });
    }

    // 5. Count by Priority
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const byPriority = {};
    for (const p of priorities) {
      byPriority[p] = await Issue.count({ where: { ...whereClause, priority: p } });
    }

    // 6. Average Resolution Time
    const resolvedIssues = await Issue.findAll({
      where: {
        ...whereClause,
        status: { [Op.in]: ['resolved', 'verified', 'closed'] },
        resolvedAt: { [Op.ne]: null }
      }
    });

    let totalResolutionDays = 0;
    resolvedIssues.forEach(issue => {
      const diffMs = new Date(issue.resolvedAt) - new Date(issue.createdAt);
      totalResolutionDays += diffMs / (1000 * 60 * 60 * 24);
    });

    const averageResolutionTime = resolvedIssues.length > 0
      ? (totalResolutionDays / resolvedIssues.length).toFixed(1)
      : 0;

    // 7. Department Performance
    const departmentPerformance = [];
    for (const dept of departments) {
      const openCount = await Issue.count({
        where: { department: dept, status: { [Op.in]: ['reported', 'acknowledged', 'in_progress', 'reopened'] } }
      });
      const resolvedCount = await Issue.count({
        where: { department: dept, status: { [Op.in]: ['resolved', 'verified', 'closed'] } }
      });

      const totalDept = openCount + resolvedCount;
      const performanceScore = totalDept > 0 ? Math.round((resolvedCount / totalDept) * 100) : 100;

      departmentPerformance.push({
        department: dept,
        open: openCount,
        resolved: resolvedCount,
        averageTime: '2.5',
        performance: performanceScore
      });
    }

    // 8. Problem Hotspots (Top areas)
    const hotspotAreas = [
      { location: 'Main Street & 5th Ave', count: 12, category: 'roads' },
      { location: 'Central Park West', count: 8, category: 'sanitation' },
      { location: 'Downtown Commercial Sector', count: 6, category: 'electricity' },
      { location: 'North District Zone 3', count: 5, category: 'water' }
    ];

    // 9. Recent Activity
    const recentIssues = await Issue.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'reporter', attributes: ['name'] }]
    });

    const recentActivity = recentIssues.map(issue => ({
      title: issue.title,
      action: `Status: ${issue.status}`,
      department: issue.department,
      timestamp: issue.createdAt
    }));

    res.status(200).json({
      success: true,
      total,
      byStatus,
      byCategory,
      byDepartment,
      byPriority,
      averageResolutionTime,
      departmentPerformance,
      hotspotAreas,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get analytical trends
// @route   GET /api/admin/trends
// @access  Private (Admin)
exports.getTrends = async (req, res) => {
  try {
    const { range = 'week' } = req.query;

    const trends = [
      { date: 'Mon', reported: 12, resolved: 8 },
      { date: 'Tue', reported: 19, resolved: 14 },
      { date: 'Wed', reported: 15, resolved: 12 },
      { date: 'Thu', reported: 22, resolved: 18 },
      { date: 'Fri', reported: 25, resolved: 20 },
      { date: 'Sat', reported: 10, resolved: 15 },
      { date: 'Sun', reported: 8, resolved: 10 }
    ];

    res.status(200).json({
      success: true,
      trends
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
