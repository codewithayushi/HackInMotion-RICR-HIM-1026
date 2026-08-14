const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Issue = sequelize.define('Issue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title cannot be empty' },
        len: { args: [3, 200], msg: 'Title must be between 3 and 200 characters' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Description cannot be empty' }
      }
    },
    category: {
      type: DataTypes.ENUM('roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other']],
          msg: 'Invalid category selected'
        }
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Latitude must be a valid decimal number' }
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Longitude must be a valid decimal number' }
      }
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
  }, {
    tableName: 'Issues',
    timestamps: true,
    updatedAt: false
  });

  return Issue;
};