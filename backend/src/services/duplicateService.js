const { Issue, User } = require('../models');
const { Op } = require('sequelize');

// Calculate similarity score between two texts
const calculateTextSimilarity = (text1, text2) => {
  const words1 = (text1 || '').toLowerCase().split(/\s+/);
  const words2 = (text2 || '').toLowerCase().split(/\s+/);
  const common = words1.filter(word => word && words2.includes(word));
  const total = new Set([...words1, ...words2].filter(Boolean)).size;
  return total > 0 ? common.length / total : 0;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Main duplicate detection function
exports.detectDuplicates = async (newIssue) => {
  const { category, coordinates, description, title } = newIssue;
  
  const radius = 5; // km
  const timeWindow = 30; // days
  const startDate = new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000);

  const recentIssues = await Issue.findAll({
    where: {
      category,
      isDuplicate: false,
      status: { [Op.notIn]: ['closed', 'verified'] },
      createdAt: { [Op.gte]: startDate }
    },
    include: [{ model: User, as: 'reporter', attributes: ['name'] }],
    limit: 50
  });

  if (recentIssues.length === 0) {
    return { isDuplicate: false };
  }

  let bestMatch = null;
  let highestScore = 0;

  for (const issue of recentIssues) {
    const issueCoords = [parseFloat(issue.longitude), parseFloat(issue.latitude)];
    const distance = calculateDistance(coordinates, issueCoords);
    if (distance > radius) continue;

    const distanceScore = Math.max(0, 1 - (distance / radius));
    const text = `${title || ''} ${description || ''}`;
    const existingText = `${issue.title} ${issue.description}`;
    const textScore = calculateTextSimilarity(text, existingText);
    
    const score = (textScore * 0.7) + (distanceScore * 0.3);
    
    if (score > highestScore && score > 0.5) {
      highestScore = score;
      bestMatch = issue;
    }
  }

  if (bestMatch && highestScore > 0.5) {
    return {
      isDuplicate: true,
      issueId: bestMatch.id,
      score: Math.round(highestScore * 100),
      existingIssue: {
        id: bestMatch.id,
        title: bestMatch.title,
        status: bestMatch.status,
        reportedAt: bestMatch.createdAt,
        reportedBy: bestMatch.reporter ? bestMatch.reporter.name : 'Citizen'
      }
    };
  }

  return { isDuplicate: false };
};