const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Sequelize connection with fallback defaults
const sequelize = new Sequelize(
  process.env.DB_NAME || 'smart_city',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Define User Model
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
    type: DataTypes.STRING(15),
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

// Define Issue Model
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
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  verifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define Status History Model
const StatusHistory = sequelize.define('StatusHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  issueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Issues',
      key: 'id'
    }
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
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define Upvote Model
const Upvote = sequelize.define('Upvote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  issueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Issues',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Define Relationships
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

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection established.');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Unable to connect to database:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Issue,
  StatusHistory,
  Upvote,
  syncDatabase
};