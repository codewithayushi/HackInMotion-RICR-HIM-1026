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

    // 1. Primary: OpenStreetMap Nominatim API (Free Geocoding)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
      const nomRes = await axios.get(nomUrl, {
        headers: { 'User-Agent': 'SmartCityIssueReportingPlatform/2.0 (contact@smartcity.gov.in)' },
        timeout: 4500
      });

      if (nomRes.data && Array.isArray(nomRes.data) && nomRes.data.length > 0) {
        const nomResults = nomRes.data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || 'place',
          importance: item.importance || 0
        }));
        return res.status(200).json({ success: true, data: nomResults });
      }
    } catch (nomErr) {
      console.warn('Nominatim geocode fallback attempt:', nomErr.message);
    }

    // 2. Secondary Fallback: Esri World Geocoding
    const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}&maxLocations=8`;
    const esriRes = await axios.get(esriUrl, { timeout: 4500 });
    
    const candidates = esriRes.data?.candidates || [];
    const results = candidates.map(item => ({
      display_name: item.address,
      lat: item.location.y,
      lon: item.location.x,
      type: 'place'
    }));

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(200).json({ success: true, data: [] });
  }
};

// @desc    Reverse geocode coordinates to formatted address
// @route   GET /api/issues/reverse-geocode
// @access  Public
exports.reverseGeocodeLocation = async (req, res) => {
  try {
    const { lat, lon, lng } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon || lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude query parameters are required' });
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'SmartCityIssueReportingPlatform/2.0 (contact@smartcity.gov.in)' },
        timeout: 4500
      });

      if (response.data && response.data.display_name) {
        return res.status(200).json({
          success: true,
          display_name: response.data.display_name,
          address: response.data.address || {}
        });
      }
    } catch (nomErr) {
      console.warn('Nominatim reverse geocode fallback:', nomErr.message);
    }

    // Fallback formatted coordinates string
    res.status(200).json({
      success: true,
      display_name: `Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
    });
  } catch (error) {
    console.error('Reverse geocode error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private (Citizen)
exports.createIssue = async (req, res) => {
  try {
    console.log('[Create Issue Request] Body keys:', Object.keys(req.body));
    console.log('[Create Issue Request] Files received:', req.files?.length || 0);

    const {
      title,
      description,
      category,
      priority = 'medium',
      location,
      latitude: bodyLat,
      longitude: bodyLng,
      address: bodyAddr
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required fields'
      });
    }

    // Universal Coordinate & Address Resolver
    let latitude = parseFloat(bodyLat);
    let longitude = parseFloat(bodyLng);
    let address = bodyAddr || '';

    if (location) {
      try {
        const parsed = typeof location === 'string' ? JSON.parse(location) : location;
        if (parsed.coordinates && Array.isArray(parsed.coordinates)) {
          longitude = parseFloat(parsed.coordinates[0]);
          latitude = parseFloat(parsed.coordinates[1]);
        } else if (parsed.lat !== undefined && (parsed.lng !== undefined || parsed.lon !== undefined)) {
          latitude = parseFloat(parsed.lat);
          longitude = parseFloat(parsed.lng || parsed.lon);
        }
        if (parsed.address && !address) {
          address = parsed.address;
        }
      } catch (err) {
        console.warn('Could not parse location payload:', err.message);
      }
    }

    // Provide default safe fallback coordinates if unassigned
    if (isNaN(latitude) || isNaN(longitude)) {
      latitude = 22.7196; // Default Smart City Center
      longitude = 75.8577;
    }

    if (!address) {
      address = `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    // Handle photo uploads (both base64 JSON payload and Multer binary files)
    let photos = [];
    if (req.body.photos) {
      if (Array.isArray(req.body.photos)) {
        photos = req.body.photos.map(p => typeof p === 'string' ? { url: p, key: 'photo' } : p);
      } else if (typeof req.body.photos === 'string') {
        try {
          const parsedPhotos = JSON.parse(req.body.photos);
          photos = Array.isArray(parsedPhotos) ? parsedPhotos : [{ url: req.body.photos, key: 'photo' }];
        } catch (e) {
          photos = [{ url: req.body.photos, key: 'photo' }];
        }
      }
    } else if (req.files && req.files.length > 0) {
      try {
        photos = await Promise.all(
          req.files.map(async (file) => {
            const result = await uploadToS3(file, 'issues');
            return { url: result.url, key: result.key };
          })
        );
      } catch (uploadErr) {
        console.warn('File upload warning, continuing issue creation:', uploadErr.message);
      }
    }

    // AI / Geospatial Duplicate Check (Safe Execution)
    let isDuplicate = false;
    let duplicateScore = 0;
    let duplicateCheck = { isDuplicate: false };

    try {
      duplicateCheck = await detectDuplicates({
        category,
        coordinates: [longitude, latitude],
        description,
        title
      });

      if (duplicateCheck && duplicateCheck.isDuplicate) {
        isDuplicate = true;
        duplicateScore = duplicateCheck.score || 0;
      }
    } catch (dupErr) {
      console.warn('Duplicate detection bypassed:', dupErr.message);
    }

    // Department routing calculation
    const assignedDepartment = routeIssue(category) || category;

    // Calculate SLA deadline based on priority
    const slaDaysMap = { urgent: 1, high: 2, medium: 5, low: 10 };
    const slaDays = slaDaysMap[priority] || 5;
    const slaDeadline = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

    const reporterId = req.user ? req.user.id : 1;

    // Create issue in MySQL / SQLite via Sequelize
    const issue = await Issue.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      latitude,
      longitude,
      address,
      department: assignedDepartment,
      reportedBy: reporterId,
      photos,
      isDuplicate,
      duplicateScore,
      status: 'reported',
      slaDeadline
    });

    // Create initial status history entry
    try {
      await StatusHistory.create({
        issueId: issue.id,
        status: 'reported',
        notes: 'Issue reported by citizen',
        updatedBy: reporterId
      });
    } catch (shErr) {
      console.warn('Status history creation warning:', shErr.message);
    }

    // Populate reporter info
    let populatedIssue;
    try {
      populatedIssue = await Issue.findByPk(issue.id, {
        include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }]
      });
    } catch (e) {
      populatedIssue = issue;
    }

    const issueData = populatedIssue.toJSON ? populatedIssue.toJSON() : populatedIssue;
    issueData.photos = parsePhotos(issueData.photos);

    console.log(`[Issue Created Successfully] ID: ${issue.id}, Department: ${assignedDepartment}`);

    res.status(201).json({
      success: true,
      message: 'Civic issue reported successfully!',
      data: issueData,
      duplicateWarning: isDuplicate ? {
        message: 'Similar issue found nearby',
        score: duplicateScore,
        existingIssue: duplicateCheck.existingIssue
      } : null
    });
  } catch (error) {
    console.error('CRITICAL Error in createIssue:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while submitting issue',
      error: error.message
    });
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
      limit = 50,
      page = 1
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (department) where.department = department;
    if (priority) where.priority = priority;

    // IMPORTANT: Citizens ONLY see THEIR OWN reported issues (Strict Privacy & Isolation)
    if (req.user && req.user.role === 'citizen') {
      where.reportedBy = req.user.id;
    } else if (reportedBy) {
      where.reportedBy = reportedBy;
    }

    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;
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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const issueData = issue.toJSON();
    issueData.photos = parsePhotos(issueData.photos);

    res.status(200).json({
      success: true,
      data: issueData
    });
  } catch (error) {
    console.error('Error getting issue:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Check admin department access
    if (req.user && req.user.role === 'admin' && req.user.department && req.user.department !== issue.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This issue belongs to another department.'
      });
    }

    const oldStatus = issue.status;
    issue.status = status || issue.status;

    // Handle resolution details
    if (status === 'resolved' || status === 'closed') {
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
      issue.verifiedBy = req.user ? req.user.id : null;
    }

    await issue.save();

    // Create status history record
    try {
      await StatusHistory.create({
        issueId: issue.id,
        status: issue.status,
        notes: notes || `Status changed from ${oldStatus} to ${issue.status}`,
        updatedBy: req.user ? req.user.id : null
      });
    } catch (shErr) {
      console.warn('Status history creation warning:', shErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Issue status updated successfully',
      data: issue
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Upvote an issue
// @route   POST /api/issues/:id/upvote
// @access  Private
exports.upvoteIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user ? req.user.id : 1;

    const issue = await Issue.findByPk(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      attributes: ['id', 'title', 'category', 'status', 'latitude', 'longitude', 'photos', 'priority', 'address', 'createdAt'],
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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
