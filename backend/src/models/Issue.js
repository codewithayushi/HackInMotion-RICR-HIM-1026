const mongoose = require('mongoose');

const StatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened'],
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const IssueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    address: String,
    landmark: String
  },
  photos: [{
    url: String,
    key: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['reported', 'acknowledged', 'in_progress', 'resolved', 'verified', 'closed', 'reopened'],
    default: 'reported'
  },
  statusHistory: [StatusHistorySchema],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    enum: ['roads', 'sanitation', 'electricity', 'water', 'public_property', 'drainage', 'other'],
    required: true
  },
  resolution: {
    notes: String,
    photos: [{
      url: String,
      key: String
    }],
    resolvedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue'
  },
  duplicateScore: {
    type: Number,
    min: 0,
    max: 100
  },
  upvotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  slaDeadline: Date,
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: Date,
  escalatedTo: String,
  tags: [String],
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
IssueSchema.index({ 'location.coordinates': '2dsphere' });
IssueSchema.index({ status: 1, department: 1 });
IssueSchema.index({ category: 1, reportedAt: -1 });

// Virtual for age in days
IssueSchema.virtual('ageInDays').get(function() {
  const diff = Date.now() - this.reportedAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Pre-save hook to set SLA deadline
IssueSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set SLA based on priority
    const slaDays = {
      'urgent': 1,
      'high': 2,
      'medium': 5,
      'low': 10
    };
    this.slaDeadline = new Date(Date.now() + slaDays[this.priority] * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Issue', IssueSchema);