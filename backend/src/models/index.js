const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

let sequelize;

const createMySQLInstance = () => {
  return new Sequelize(
    process.env.DB_NAME || 'smart_city',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: false,
      pool: { max: 10, min: 0, acquire: 10000, idle: 5000 }
    }
  );
};

const createSQLiteInstance = () => {
  return new Sequelize({
    dialect: 'sqlite',
    storage: process.env.VERCEL ? '/tmp/smart_city_clean_v8.sqlite' : './smart_city_clean_v8.sqlite',
    logging: false
  });
};

if (process.env.VERCEL || process.env.DB_DIALECT === 'sqlite') {
  sequelize = createSQLiteInstance();
} else {
  sequelize = createMySQLInstance();
}

// User Model
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
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// OTP Model
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
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('metaData');
      return val ? JSON.parse(val) : null;
    },
    set(val) {
      this.setDataValue('metaData', val ? JSON.stringify(val) : null);
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Issue Model
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
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
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
  upvoteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  photos: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('photos');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('photos', JSON.stringify(val || []));
    }
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolutionPhotos: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('resolutionPhotos');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('resolutionPhotos', JSON.stringify(val || []));
    }
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// StatusHistory Model
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
    type: DataTypes.STRING(50),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Upvote Model
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

// Relationships
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

// Clean Seed Handler: Purges pre-seeded issues for clean zero initial dashboard
const seedDemoData = async () => {
  try {
    // Purge any residual pre-seeded issues
    await Issue.destroy({ where: {} });

    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Seeding primary user profile...');
      const salt = await bcrypt.genSalt(10);
      const commonPass = await bcrypt.hash('password123', salt);

      await User.create({
        name: 'Ayushi Pawar',
        email: 'aayushipawar2004@gmail.com',
        password: commonPass,
        role: 'citizen',
        phone: '+917489393094',
        isVerified: true
      });
    }
  } catch (e) {
    console.warn('Seeding notice:', e.message);
  }
};

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    await seedDemoData();
  } catch (error) {
    try {
      sequelize = createSQLiteInstance();
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      await seedDemoData();
    } catch (fallbackErr) {
      console.error('Fallback DB sync error:', fallbackErr.message);
    }
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