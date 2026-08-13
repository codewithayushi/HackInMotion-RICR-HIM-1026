const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  createIssue,
  getIssues,
  getIssue,
  updateStatus,
  upvoteIssue,
  getMapIssues,
  geocodeLocation
} = require('../controllers/issueController');

const { protect, authorize } = require('../middleware/auth');

router.get('/map', getMapIssues);
router.get('/geocode', geocodeLocation);

router.route('/')
  .post(protect, upload.array('photos', 5), createIssue)
  .get(protect, getIssues);

router.route('/:id')
  .get(protect, getIssue);

router.put('/:id/status', protect, authorize('admin'), upload.array('photos', 5), updateStatus);
router.post('/:id/upvote', protect, upvoteIssue);

module.exports = router;
