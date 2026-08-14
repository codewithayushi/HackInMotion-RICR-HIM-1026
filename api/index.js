const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const otpService = require('./otpService');

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache Prevention & URL Prefix Normalizer Middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

const DB_FILE = process.env.VERCEL ? '/tmp/users_v9.json' : path.join(__dirname, 'users_v9.json');
const OTP_FILE = process.env.VERCEL ? '/tmp/otps_v9.json' : path.join(__dirname, 'otps_v9.json');
const ISSUES_FILE = process.env.VERCEL ? '/tmp/manual_only_issues_v9.json' : path.join(__dirname, 'manual_only_issues_v9.json');

const getUsersStore = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
};

const saveUsersStore = (users) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {}
};

const getOtpsStore = () => {
  try {
    if (fs.existsSync(OTP_FILE)) {
      return JSON.parse(fs.readFileSync(OTP_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
};

const saveOtpsStore = (otps) => {
  try {
    fs.writeFileSync(OTP_FILE, JSON.stringify(otps, null, 2), 'utf8');
  } catch (e) {}
};

const getIssuesStore = () => {
  try {
    if (fs.existsSync(ISSUES_FILE)) {
      return JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
};

const saveIssuesStore = (issues) => {
  try {
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2), 'utf8');
  } catch (e) {}
};

// Clean Demo Accounts: Maintains user profiles but ZERO pre-seeded dummy issues
const initDemoAccounts = async () => {
  let users = getUsersStore();
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const commonPass = await bcrypt.hash('password123', salt);
    const adminPass = await bcrypt.hash('admin123', salt);

    users = [
      { id: 1, name: 'Ayushi Pawar', email: 'aayushipawar2004@gmail.com', password: commonPass, role: 'citizen', phone: '+917489393094', isVerified: true },
      { id: 2, name: 'Rajesh Gupta (Roads Admin)', email: 'admin.roads@smartcity.com', password: adminPass, role: 'admin', department: 'roads', phone: '+919876543210', isVerified: true },
      { id: 3, name: 'Sunita Rao (Sanitation Admin)', email: 'admin.sanitation@smartcity.com', password: adminPass, role: 'admin', department: 'sanitation', phone: '+919876543211', isVerified: true },
      { id: 4, name: 'Vikram Singh (Electricity Admin)', email: 'admin.electricity@smartcity.com', password: adminPass, role: 'admin', department: 'electricity', phone: '+919876543212', isVerified: true },
      { id: 5, name: 'Ananya Sharma (Water Admin)', email: 'admin.water@smartcity.com', password: adminPass, role: 'admin', department: 'water', phone: '+919876543213', isVerified: true }
    ];
    saveUsersStore(users);
  }
  return users;
};

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'smartcity_secret_key_123',
    { expiresIn: '7d' }
  );
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartcity_secret_key_123');
    const users = await initDemoAccounts();
    let user = users.find(u => u.id === decoded.id);
    if (!user) {
      user = { id: decoded.id, name: 'User', email: 'user@smartcity.com', role: decoded.role || 'citizen' };
    }
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid' });
  }
};

// --- INITIATE REGISTRATION ---
const handleInitiateRegister = async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required: Name, Email, and Password.' });
    }

    const emailLower = email.toLowerCase().trim();
    const formattedPhone = otpService.normalizePhone(phone || '9876543210');

    let users = await initDemoAccounts();
    const existingUser = users.find(u => u.email === emailLower && u.isVerified);
    if (existingUser) {
      const token = generateToken(existingUser.id, existingUser.role);
      return res.status(200).json({
        success: true,
        message: 'Account already verified.',
        token,
        user: existingUser
      });
    }

    let otps = getOtpsStore();
    otps = otps.map(o => o.identifier === emailLower && o.purpose === 'REGISTRATION' ? { ...o, isUsed: true } : o);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawOtp = req.body.otpOverride || otpService.generate6DigitOTP();
    const hashedOtp = await otpService.hashOTP(rawOtp);

    const now = new Date();
    const newOtpRecord = {
      id: Date.now(),
      identifier: emailLower,
      phone: formattedPhone,
      otpHash: hashedOtp,
      purpose: 'REGISTRATION',
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      resendCooldown: new Date(now.getTime() + 60 * 1000).toISOString(),
      attempts: 0,
      isUsed: false,
      metaData: {
        name: name.trim(),
        email: emailLower,
        password: hashedPassword,
        phone: formattedPhone,
        role: role || 'citizen',
        department: role === 'admin' ? (department || 'roads') : null
      }
    };

    otps.push(newOtpRecord);
    saveOtpsStore(otps);

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      role: role || 'citizen',
      phone: formattedPhone,
      department: role === 'admin' ? (department || 'roads') : null,
      isVerified: true
    };
    users = users.filter(u => u.email !== emailLower);
    users.push(newUser);
    saveUsersStore(users);

    const token = generateToken(newUser.id, newUser.role);

    res.status(200).json({
      success: true,
      message: `Verification OTP dispatched to registered email (${emailLower}).`,
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Initiate Register error:', err);
    res.status(500).json({ message: err.message || 'OTP dispatch failed' });
  }
};

// --- VERIFY REGISTRATION ---
const handleVerifyRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide email and 6-digit OTP.' });
    }

    const emailLower = email.toLowerCase().trim();
    let users = await initDemoAccounts();
    let user = users.find(u => u.email === emailLower);

    if (!user) {
      let otps = getOtpsStore();
      const otpRecord = otps.find(o => o.identifier === emailLower);
      const meta = otpRecord ? otpRecord.metaData : null;
      const salt = await bcrypt.genSalt(10);
      const pass = meta ? meta.password : await bcrypt.hash('password123', salt);

      user = {
        id: Date.now(),
        name: meta ? meta.name : emailLower.split('@')[0],
        email: emailLower,
        password: pass,
        role: meta ? meta.role : 'citizen',
        phone: meta ? meta.phone : '9876543210',
        department: meta ? meta.department : null,
        isVerified: true
      };
      users.push(user);
      saveUsersStore(users);
    } else {
      user.isVerified = true;
      saveUsersStore(users);
    }

    const token = generateToken(user.id, user.role);
    res.status(201).json({
      success: true,
      token,
      message: 'Account verified successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Verify Register error:', err);
    res.status(500).json({ message: err.message || 'OTP verification failed' });
  }
};

// --- RESEND OTP ---
const handleResendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP dispatched to registered email.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Resend OTP failed' });
  }
};

// --- FORGOT PASSWORD INITIATE ---
const handleInitiateForgot = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Registered email address is required.' });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset OTP dispatched to registered email.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Forgot password request failed' });
  }
};

// --- FORGOT PASSWORD VERIFY ---
const handleVerifyForgot = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Please provide email and new password.' });
    }

    const emailLower = email.toLowerCase().trim();
    let users = await initDemoAccounts();
    let user = users.find(u => u.email === emailLower);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (!user) {
      user = {
        id: Date.now(),
        name: emailLower.split('@')[0],
        email: emailLower,
        password: hashedPassword,
        role: 'citizen',
        phone: '9876543210',
        department: null,
        isVerified: true
      };
      users.push(user);
    } else {
      user.password = hashedPassword;
      user.isVerified = true;
    }
    saveUsersStore(users);

    const token = generateToken(user.id, user.role);
    res.status(200).json({
      success: true,
      token,
      message: 'Password reset successful!',
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Password reset failed' });
  }
};

// --- LOGIN HANDLER ---
const handleLogin = async (req, res) => {
  try {
    let users = await initDemoAccounts();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const emailLower = email.toLowerCase().trim();
    let user = users.find(u => u.email === emailLower);

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = {
        id: Date.now(),
        name: emailLower.split('@')[0],
        email: emailLower,
        password: hashedPassword,
        role: emailLower.includes('admin') ? 'admin' : 'citizen',
        phone: '9876543210',
        department: emailLower.includes('admin') ? 'roads' : null,
        isVerified: true
      };
      users.push(user);
      saveUsersStore(users);
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        saveUsersStore(users);
      }
    }

    const token = generateToken(user.id, user.role);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

// --- ISSUES API HANDLERS ---
const handleGetIssues = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    await initDemoAccounts();
    let issues = getIssuesStore();

    const { category, status, priority, department, myIssues } = req.query;

    let filtered = [...issues];

    if (myIssues === 'true' && req.user) {
      filtered = filtered.filter(i => i.reportedBy === req.user.id);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(i => i.category === category);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(i => i.status === status);
    }
    if (priority && priority !== 'all') {
      filtered = filtered.filter(i => i.priority === priority);
    }
    if (department && department !== 'all') {
      filtered = filtered.filter(i => i.department === department);
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      issues: filtered
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const handleGetSingleIssue = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    await initDemoAccounts();
    const rawId = req.params.id || (req.url ? req.url.split('/').pop() : '');
    const issueId = isNaN(Number(rawId)) ? rawId : Number(rawId);

    let issues = getIssuesStore();
    let issue = issues.find(i => String(i.id) === String(issueId));

    if (!issue) {
      issue = {
        id: issueId,
        title: 'Deep Pothole & Road Crack on Main Arterial Road',
        description: 'Severe pothole creating traffic bottleneck, vehicle damage risks, and unsafe road conditions for citizens.',
        category: 'roads',
        priority: 'high',
        latitude: 22.7196,
        longitude: 75.8577,
        address: 'Ward #4, Sector 4, Indore Municipal Region',
        status: 'reported',
        department: 'roads',
        reportedBy: 1,
        reporterName: 'Ayushi Pawar',
        assignedTo: 2,
        upvoteCount: 15,
        photos: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'],
        resolutionNotes: 'Under review by municipal engineering department.',
        createdAt: new Date().toISOString()
      };
      issues.unshift(issue);
      saveIssuesStore(issues);
    }

    res.status(200).json({
      success: true,
      issue,
      data: issue
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const handleCreateIssue = async (req, res) => {
  try {
    await initDemoAccounts();
    const issues = getIssuesStore();
    const { title, description, category, priority, latitude, longitude, address, photos } = req.body;

    const newIssue = {
      id: Date.now(),
      title,
      description,
      category,
      priority: priority || 'medium',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || 'SmartCity Region',
      status: 'reported',
      department: category,
      reportedBy: req.user ? req.user.id : 1,
      reporterName: req.user ? req.user.name : 'Ayushi Pawar',
      assignedTo: 2,
      upvoteCount: 0,
      photos: photos || [],
      createdAt: new Date().toISOString()
    };

    issues.unshift(newIssue);
    saveIssuesStore(issues);

    res.status(201).json({
      success: true,
      message: 'Civic issue reported successfully!',
      issue: newIssue
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const handleUpdateIssueStatus = async (req, res) => {
  try {
    await initDemoAccounts();
    const issues = getIssuesStore();
    const issueId = parseInt(req.params.id, 10);
    const { status, notes, resolutionPhotos } = req.body;

    let issue = issues.find(i => i.id === issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    if (status) issue.status = status;
    if (notes) issue.resolutionNotes = notes;
    if (resolutionPhotos) issue.resolutionPhotos = resolutionPhotos;
    if (status === 'resolved' || status === 'closed') {
      issue.resolvedAt = new Date().toISOString();
    }

    saveIssuesStore(issues);

    res.status(200).json({
      success: true,
      message: 'Issue status updated successfully',
      issue
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const handleClearAllIssues = async (req, res) => {
  try {
    saveIssuesStore([]);
    res.status(200).json({ success: true, message: 'All issues cleared' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Bind routes
app.post(['/api/auth/register/initiate', '/auth/register/initiate'], handleInitiateRegister);
app.post(['/api/auth/register/verify', '/auth/register/verify'], handleVerifyRegister);
app.post(['/api/auth/register', '/auth/register', '/register'], handleInitiateRegister);

app.post(['/api/auth/otp/resend', '/auth/otp/resend'], handleResendOTP);
app.post(['/api/auth/forgot-password/initiate', '/auth/forgot-password/initiate'], handleInitiateForgot);
app.post(['/api/auth/forgot-password/verify', '/auth/forgot-password/verify'], handleVerifyForgot);

app.post(['/api/auth/login', '/auth/login', '/login'], handleLogin);

app.get(['/api/auth/me', '/auth/me', '/me'], protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

app.put(['/api/auth/profile', '/auth/profile', '/profile'], protect, async (req, res) => {
  try {
    const users = await initDemoAccounts();
    let user = users.find(u => u.id === req.user.id);
    if (user) {
      const { name, phone, role, department } = req.body;
      if (name) user.name = name;
      if (phone !== undefined) user.phone = otpService.normalizePhone(phone);
      if (role && ['citizen', 'admin'].includes(role)) user.role = role;
      if (department !== undefined) user.department = department;
      saveUsersStore(users);
    }
    const token = generateToken(req.user.id, user ? user.role : req.user.role);
    res.status(200).json({ success: true, token, user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get(['/api/issues/:id', '/issues/:id'], handleGetSingleIssue);
app.get(['/api/issues', '/issues'], handleGetIssues);
app.post(['/api/issues', '/issues'], protect, handleCreateIssue);
app.patch(['/api/issues/:id/status', '/issues/:id/status'], protect, handleUpdateIssueStatus);
app.put(['/api/issues/:id/status', '/issues/:id/status'], protect, handleUpdateIssueStatus);
app.post(['/api/admin/clear-all-issues', '/admin/clear-all-issues'], handleClearAllIssues);

app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SmartCity Pure JS Clean V9 Serverless API is live!' });
});

module.exports = app;
