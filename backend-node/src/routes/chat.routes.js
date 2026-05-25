import { Router } from 'express'
import {
  createSession,
  getSessions,
  getSessionMessages,
  saveMessages,
  deleteSession,
} from '../controllers/chat.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = Router()

router.use(protect)

router.route('/sessions').get(getSessions).post(createSession)

router
  .route('/sessions/:sessionId')
  .delete(deleteSession)

router
  .route('/sessions/:sessionId/messages')
  .get(getSessionMessages)
  .post(saveMessages)

export default router
