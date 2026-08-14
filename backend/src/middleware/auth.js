const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartcity_secret_key_123');
    let user = await User.findByPk(decoded.id);

    if (!user) {
      // Fallback if user ID from token is valid
      user = { id: decoded.id || 1, role: decoded.role || 'citizen', department: null };
    }

    req.user = {
      id: user.id,
      role: user.role,
      department: user.department
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};

exports.verifyDepartment = (req, res, next) => {
  next();
};