const { Issue, User, StatusHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

// @desc    Get dashboard statistics for admin
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const { range = 'week' } = req.query;

    const whereClause = {};

    // Admin department filtering if applicable
    if (req.user && req.user.department && req.user.department !== 'all') {
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

    // 6. Dynamic Average Resolution Time Calculation
    const resolvedIssues = await Issue.findAll({
      where: {
        ...whereClause,
        status: { [Op.in]: ['resolved', 'verified', 'closed'] },
        resolvedAt: { [Op.ne]: null }
      }
    });

    let totalResolutionDays = 0;
    let countWithValidDates = 0;
    resolvedIssues.forEach(issue => {
      if (issue.createdAt && issue.resolvedAt) {
        const diffMs = new Date(issue.resolvedAt) - new Date(issue.createdAt);
        if (!isNaN(diffMs) && diffMs >= 0) {
          totalResolutionDays += diffMs / (1000 * 60 * 60 * 24);
          countWithValidDates++;
        }
      }
    });

    const averageResolutionTime = countWithValidDates > 0
      ? (totalResolutionDays / countWithValidDates).toFixed(1)
      : 0;

    // 7. Department Performance (Dynamic)
    const departmentPerformance = [];
    for (const dept of departments) {
      const openCount = await Issue.count({
        where: { department: dept, status: { [Op.in]: ['reported', 'acknowledged', 'in_progress', 'reopened'] } }
      });
      const resolvedCount = await Issue.count({
        where: { department: dept, status: { [Op.in]: ['resolved', 'verified', 'closed'] } }
      });

      const totalDept = openCount + resolvedCount;
      const performanceScore = totalDept > 0 ? Math.round((resolvedCount / totalDept) * 100) : 0;

      departmentPerformance.push({
        department: dept,
        open: openCount,
        resolved: resolvedCount,
        averageTime: averageResolutionTime > 0 ? String(averageResolutionTime) : '0',
        performance: performanceScore
      });
    }

    // 8. Recent Activity (Dynamic from real issues)
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
      hotspotAreas: [],
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
    const issues = await Issue.findAll({
      attributes: ['createdAt', 'status', 'category'],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: issues.length,
      trends: issues
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
