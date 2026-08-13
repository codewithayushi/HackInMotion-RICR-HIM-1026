const { Issue, User, StatusHistory, Upvote } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const { uploadToS3 } = require('../services/s3Service');
const { detectDuplicates } = require('../services/duplicateService');
const { routeIssue } = require('../services/routingService');

// Helper to safely parse photos JSON
const parsePhotos = (photos) => {
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

// @desc    Geocode address search (Google Maps style autocomplete)
// @route   GET /api/issues/geocode
// @access  Public
exports.geocodeLocation = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const query = q.trim();

    // 1. Try Esri World Geocoding API (Fast, global, complete street/city addresses)
    try {
      const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=8`;
      const esriRes = await axios.get(esriUrl, { timeout: 4000 });
      
      const candidates = esriRes.data?.candidates || [];
      if (candidates.length > 0) {
        const results = candidates.map(item => ({
          display_name: item.address,
          lat: item.location.y,
          lon: item.location.x
        }));
        return res.status(200).json({ success: true, data: results });
      }
    } catch (e) {
      console.warn('Esri geocode fallback:', e.message);
    }

    // 2. Fallback to OpenStreetMap Nominatim API
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8`;
    const nomRes = await axios.get(nomUrl, {
      headers: { 'User-Agent': 'SmartCityIssuePlatform/1.0' },
      timeout: 4000
    });

    const nomResults = (nomRes.data || []).map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));

    res.status(200).json({ success: true, data: nomResults });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(200).json({ success: true, data: [] });
  }
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private (Citizen)
exports.createIssue = async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    // Parse location
    let latitude = 0;
    let longitude = 0;
    let address = '';

    if (location) {
      const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      if (parsedLocation.coordinates) {
        longitude = parsedLocation.coordinates[0];
        latitude = parsedLocation.coordinates[1];
      } else if (parsedLocation.lat && parsedLocation.lng) {
        latitude = parsedLocation.lat;
        longitude = parsedLocation.lng;
      }
      address = parsedLocation.address || '';
    }

    // Check for duplicates
    const duplicateCheck = await detectDuplicates({
      category,
      coordinates: [longitude, latitude],
      description,
      title
    });

    let isDuplicate = false;
    let duplicateScore = 0;

    if (duplicateCheck.isDuplicate) {
      isDuplicate = true;
      duplicateScore = duplicateCheck.score;
    }

    // Handle photo uploads
    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = await Promise.all(
        req.files.map(async (file) => {
          const result = await uploadToS3(file, 'issues');
          return { url: result.url, key: result.key };
        })
      );
    }

    const assignedDepartment = routeIssue(category);

    // Create issue in MySQL via Sequelize
    const issue = await Issue.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      latitude,
      longitude,
      address,
      department: assignedDepartment,
      reportedBy: req.user.id,
      photos,
      isDuplicate,
      duplicateScore,
      status: 'reported'
    });

    // Create initial status history entry
    await StatusHistory.create({
      issueId: issue.id,
      status: 'reported',
      notes: 'Issue reported by citizen',
      updatedBy: req.user.id
    });

    // Fetch reporter info
    const populatedIssue = await Issue.findByPk(issue.id, {
      include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }]
    });

    const issueData = populatedIssue.toJSON();
    issueData.photos = parsePhotos(issueData.photos);

    res.status(201).json({
      success: true,
      data: issueData,
      duplicateWarning: duplicateCheck.isDuplicate ? {
        message: 'Similar issue found nearby',
        score: duplicateCheck.score,
        existingIssue: duplicateCheck.existingIssue
      } : null
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all issues (with filters)
// @route   GET /api/issues
// @access  Private
exports.getIssues = async (req, res) => {
  try {
    const {
      status,
      category,
      department,
      priority,
      reportedBy,
      limit = 20,
      page = 1
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (department) where.department = department;
    if (priority) where.priority = priority;

    // Role-based filtering
    if (req.user.role === 'citizen') {
      if (!req.query.publicView) {
        where.reportedBy = req.user.id;
      }
    } else if (reportedBy) {
      where.reportedBy = reportedBy;
    }

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows: issues } = await Issue.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset
    });

    const formattedIssues = issues.map(item => {
      const json = item.toJSON();
      json.photos = parsePhotos(json.photos);
      return json;
    });

    res.status(200).json({
      success: true,
      data: formattedIssues,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count,
        pages: Math.ceil(count / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private
exports.getIssue = async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name', 'email', 'phone'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: StatusHistory }
      ]
    });

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const issueData = issue.toJSON();
    issueData.photos = parsePhotos(issueData.photos);

    res.status(200).json({
      success: true,
      data: issueData
    });
  } catch (error) {
    console.error('Error getting issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update issue status
// @route   PUT /api/issues/:id/status
// @access  Private (Admin)
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes, resolutionNotes } = req.body;
    const issueId = req.params.id;

    const issue = await Issue.findByPk(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check admin department access
    if (req.user.role === 'admin' && req.user.department && req.user.department !== issue.department) {
      return res.status(403).json({
        message: 'Access denied. This issue belongs to another department.'
      });
    }

    // State transition rules
    const validTransitions = {
      'reported': ['acknowledged'],
      'acknowledged': ['in_progress', 'resolved'],
      'in_progress': ['resolved'],
      'resolved': ['verified', 'reopened'],
      'verified': ['closed', 'reopened'],
      'reopened': ['acknowledged', 'in_progress']
    };

    if (!validTransitions[issue.status]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${issue.status} to ${status}`
      });
    }

    const oldStatus = issue.status;
    issue.status = status;

    // Handle resolution details
    if (status === 'resolved') {
      issue.resolutionNotes = resolutionNotes || notes;
      issue.resolvedAt = new Date();

      if (req.files && req.files.length > 0) {
        const photoUploads = await Promise.all(
          req.files.map(async (file) => {
            const result = await uploadToS3(file, `issues/${issueId}/resolution`);
            return { url: result.url, key: result.key };
          })
        );
        issue.resolutionPhotos = photoUploads;
      }
    }

    if (status === 'verified') {
      issue.verifiedBy = req.user.id;
    }

    await issue.save();

    // Create status history record
    await StatusHistory.create({
      issueId: issue.id,
      status,
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upvote an issue
// @route   POST /api/issues/:id/upvote
// @access  Private
exports.upvoteIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user.id;

    const issue = await Issue.findByPk(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const existingVote = await Upvote.findOne({
      where: { issueId, userId }
    });

    if (existingVote) {
      await existingVote.destroy();
      issue.upvoteCount = Math.max(0, issue.upvoteCount - 1);
      await issue.save();

      return res.status(200).json({
        success: true,
        message: 'Upvote removed',
        upvoteCount: issue.upvoteCount
      });
    }

    await Upvote.create({ issueId, userId });
    issue.upvoteCount = issue.upvoteCount + 1;
    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Issue upvoted',
      upvoteCount: issue.upvoteCount
    });
  } catch (error) {
    console.error('Error upvoting issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get issues by location (for map)
// @route   GET /api/issues/map
// @access  Public
exports.getMapIssues = async (req, res) => {
  try {
    const issues = await Issue.findAll({
      where: {
        status: { [Op.ne]: 'closed' },
        isDuplicate: false
      },
      attributes: ['id', 'title', 'category', 'status', 'latitude', 'longitude', 'photos', 'priority', 'createdAt'],
      limit: 500
    });

    const formattedIssues = issues.map(item => {
      const json = item.toJSON();
      json.photos = parsePhotos(json.photos);
      return json;
    });

    res.status(200).json({
      success: true,
      data: formattedIssues
    });
  } catch (error) {
    console.error('Error getting map issues:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
