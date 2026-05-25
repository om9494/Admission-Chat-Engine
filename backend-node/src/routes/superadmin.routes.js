import { Router } from 'express'
import { body } from 'express-validator'
import { protect, restrictTo } from '../middleware/auth.middleware.js'
import {
  getPlatformStats,
  getAllAdmins, createAdmin, updateAdmin, deleteAdmin, resetAdminPassword,
  getAllUsers, toggleUserStatus,
  getAllColleges,
} from '../controllers/superadmin.controller.js'

const router = Router()
router.use(protect, restrictTo('superadmin'))

// Platform stats
router.get('/stats', getPlatformStats)

// Admin management
router.get('/admins', getAllAdmins)
router.post('/admins', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Min 8 characters'),
], createAdmin)
router.patch('/admins/:id', updateAdmin)
router.delete('/admins/:id', deleteAdmin)
router.post('/admins/:id/reset-password', resetAdminPassword)

// User management
router.get('/users', getAllUsers)
router.patch('/users/:id/toggle-status', toggleUserStatus)

// College overview
router.get('/colleges', getAllColleges)

export default router
