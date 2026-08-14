const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/tmp/smart_city.sqlite',
  logging: false
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('citizen', 'admin'),
    defaultValue: 'citizen'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  identifier: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  otpHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  purpose: {
    type: DataTypes.ENUM('REGISTRATION', 'FORGOT_PASSWORD'),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  resendCooldown: {
    type: DataTypes.DATE,
    allowNull: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metaData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened'),
    defaultValue: 'reported'
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  photos: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isDuplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  duplicateScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  upvoteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  slaDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolutionPhotos: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reportedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  verifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const StatusHistory = sequelize.define('StatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  issueId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened'),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const Upvote = sequelize.define('Upvote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  issueId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

User.hasMany(Issue, { foreignKey: 'reportedBy', as: 'reportedIssues' });
User.hasMany(Issue, { foreignKey: 'assignedTo', as: 'assignedIssues' });
Issue.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });
Issue.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

Issue.hasMany(StatusHistory, { foreignKey: 'issueId' });
StatusHistory.belongsTo(Issue, { foreignKey: 'issueId' });

Issue.hasMany(Upvote, { foreignKey: 'issueId' });
Upvote.belongsTo(Issue, { foreignKey: 'issueId' });
User.hasMany(Upvote, { foreignKey: 'userId' });
Upvote.belongsTo(User, { foreignKey: 'userId' });

let isSynced = false;
const syncDatabase = async () => {
  if (!isSynced) {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    isSynced = true;
  }
};

module.exports = {
  sequelize,
  User,
  OTP,
  Issue,
  StatusHistory,
  Upvote,
  syncDatabase
};
