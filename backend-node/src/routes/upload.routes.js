import { Router } from 'express'
import { protect, restrictTo } from '../middleware/auth.middleware.js'
import { upload } from '../middleware/upload.middleware.js'
import { uploadFiles, getCollegeFiles, deleteFile } from '../controllers/upload.controller.js'

const router = Router()
router.use(protect, restrictTo('admin', 'superadmin'))

router.post('/', upload.array('files', 10), uploadFiles)
router.get('/', getCollegeFiles)
router.get('/:collegeId', getCollegeFiles)
router.delete('/:id', deleteFile)

export default router
