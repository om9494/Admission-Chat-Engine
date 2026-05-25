import { Router } from 'express'
import { body } from 'express-validator'
import {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

// ─── Validation rule sets ────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
]

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),
]

const resetPasswordRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
]

const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('profileImage')
    .optional()
    .isURL().withMessage('Profile image must be a valid URL'),
]

// ─── Public routes ───────────────────────────────────────────────────────────

router.post('/register', registerRules, register)
router.post('/login', loginRules, login)
router.post('/logout', logout)
router.post('/refresh', refreshAccessToken)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password/:token', resetPasswordRules, resetPassword)

// ─── Protected routes ────────────────────────────────────────────────────────

router.use(protect)

router.get('/me', getMe)
router.patch('/update-profile', updateProfileRules, updateProfile)
router.patch('/change-password', changePasswordRules, changePassword)

export default router
