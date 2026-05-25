import { Router } from 'express'
import { protect, restrictTo, optionalAuth } from '../middleware/auth.middleware.js'
import {
  getColleges, getCollegeBySlug, compareColleges,
  getMyCollege, updateMyCollege, addFaq, deleteFaq, addWebsiteUrl, deleteWebsiteUrl,
  createCollege, updateCollege, deleteCollege,
} from '../controllers/college.controller.js'

const router = Router()

// ── Static paths FIRST (must come before /:slug to avoid shadowing) ───────────

// Public static
router.get('/compare', compareColleges)

// Admin — own college (static prefix "my" before /:slug)
router.get('/my/college',              protect, restrictTo('admin'), getMyCollege)
router.patch('/my/college',            protect, restrictTo('admin'), updateMyCollege)
router.post('/my/faqs',                protect, restrictTo('admin'), addFaq)
router.delete('/my/faqs/:faqId',       protect, restrictTo('admin'), deleteFaq)
router.post('/my/urls',                protect, restrictTo('admin'), addWebsiteUrl)
router.delete('/my/urls/:urlId',       protect, restrictTo('admin'), deleteWebsiteUrl)

// SuperAdmin — create
router.post('/', protect, restrictTo('superadmin'), createCollege)

// ── Public listing ────────────────────────────────────────────────────────────
router.get('/', optionalAuth, getColleges)

// ── Dynamic slug/id routes LAST ───────────────────────────────────────────────
router.get('/:slug',    optionalAuth,                          getCollegeBySlug)
router.patch('/:id',   protect, restrictTo('superadmin'),     updateCollege)
router.delete('/:id',  protect, restrictTo('superadmin'),     deleteCollege)

export default router
