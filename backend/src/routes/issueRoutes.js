const express = require('express');
const router = express.Router();
const multer = require('multer');

// Configure Multer for in-memory file uploads with validation
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per photo
    files: 5 // Max 5 photos
  },
  fileFilter
});

const {
  createIssue,
  getIssues,
  getIssue,
  updateStatus,
  upvoteIssue,
  getMapIssues,
  geocodeLocation,
  reverseGeocodeLocation
} = require('../controllers/issueController');

const { protect, authorize } = require('../middleware/auth');

// Public / Citizen Location Geocoding & Reverse Geocoding Routes
router.get('/geocode', geocodeLocation);
router.get('/reverse-geocode', reverseGeocodeLocation);
router.get('/map', getMapIssues);

// Issue CRUD Routes
router.route('/')
  .post(protect, (req, res, next) => {
    upload.array('photos', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }, createIssue)
  .get(protect, getIssues);

router.route('/:id')
  .get(getIssue);

router.put('/:id/status', protect, authorize('admin'), upload.array('photos', 5), updateStatus);
router.post('/:id/upvote', protect, upvoteIssue);

module.exports = router;
