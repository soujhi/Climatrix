import express from 'express';
import { runCorrelationAnalysis, getSavedAnalysis } from '../controllers/analysisController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analysis routes require authentication
router.use(protect);

// Run correlation analysis
router.post('/correlation', runCorrelationAnalysis);

// Get single saved analysis
router.get('/:id', getSavedAnalysis);

export default router;
