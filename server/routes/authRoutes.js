import express from 'express';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * AUTHENTICATION ROUTES (E - Express Router)
 * Endpoints for manual Signup, Login, and Profile retrieval.
 */

// @route   POST /api/auth/signup
// @desc    Register a new user account
router.post('/signup', registerUser);

// @route   POST /api/auth/login
// @desc    Login existing user with email & password
router.post('/login', loginUser);

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, getMe);

export default router;
