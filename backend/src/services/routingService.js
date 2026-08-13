// Department routing configuration
const departmentMapping = {
  roads: {
    department: 'roads',
    priority: 'medium',
    keywords: ['pothole', 'road', 'street', 'asphalt', 'pavement', 'traffic', 'crack']
  },
  sanitation: {
    department: 'sanitation',
    priority: 'medium',
    keywords: ['garbage', 'trash', 'waste', 'bin', 'dump', 'cleaning', 'sanitation']
  },
  electricity: {
    department: 'electricity',
    priority: 'high',
    keywords: ['light', 'streetlight', 'power', 'electric', 'pole', 'wire', 'cable']
  },
  water: {
    department: 'water',
    priority: 'high',
    keywords: ['water', 'leak', 'pipe', 'drain', 'tap', 'supply', 'flood']
  },
  public_property: {
    department: 'public_property',
    priority: 'medium',
    keywords: ['park', 'bench', 'playground', 'sign', 'public', 'property', 'damage']
  },
  drainage: {
    department: 'drainage',
    priority: 'high',
    keywords: ['drain', 'sewer', 'blockage', 'flood', 'waterlogging', 'storm']
  }
};

// AI-based category detection (simplified)
exports.detectCategory = (description, title) => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  let scores = {};
  let totalScore = 0;
  
  for (const [category, config] of Object.entries(departmentMapping)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    scores[category] = score;
    totalScore += score;
  }
  
  // Find category with highest score
  let bestCategory = 'other';
  let bestScore = 0;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  // If no keywords matched, use 'other'
  if (bestScore === 0) {
    bestCategory = 'other';
  }
  
  return bestCategory;
};

// Route issue to appropriate department
exports.routeIssue = (category) => {
  // Validate category
  if (departmentMapping[category]) {
    return departmentMapping[category].department;
  }
  
  // If category is 'other' or unknown, route to a default department
  // In a real system, this would go to a triage queue
  return 'other';
};

// Get priority based on category and description
exports.getPriority = (category, description) => {
  const config = departmentMapping[category];
  if (!config) return 'medium';
  
  // Check for urgency keywords
  const urgentKeywords = ['emergency', 'critical', 'urgent', 'dangerous', 'hazard'];
  const text = description.toLowerCase();
  
  for (const keyword of urgentKeywords) {
    if (text.includes(keyword)) {
      return 'urgent';
    }
  }
  
  return config.priority || 'medium';
};

exports.getAllDepartments = () => {
  return Object.keys(departmentMapping);
};