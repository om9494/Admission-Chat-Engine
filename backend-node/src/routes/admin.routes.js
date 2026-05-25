import { Router } from 'express'
import { protect, restrictTo } from '../middleware/auth.middleware.js'
import { getAdminStats, getStats, getUsers } from '../controllers/admin.controller.js'

const router = Router()
router.use(protect, restrictTo('admin', 'superadmin'))

router.get('/stats', getAdminStats)
router.get('/platform-stats', restrictTo('superadmin'), getStats)
router.get('/users', getUsers)

export default router
