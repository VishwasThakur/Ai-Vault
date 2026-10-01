const express = require('express');
const router = express.Router();
const { summarizeFile, askFile, extractKeywords, suggestCategory } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/summarize', summarizeFile);
router.post('/ask', askFile);
router.post('/keywords', extractKeywords);
router.post('/categorize', suggestCategory);

module.exports = router;
