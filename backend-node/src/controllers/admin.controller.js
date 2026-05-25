import User from '../models/User.model.js'
import College from '../models/College.model.js'
import ChatSession from '../models/ChatSession.model.js'
import UploadedFile from '../models/UploadedFile.model.js'

// ─── Admin dashboard stats (scoped to their college) ─────────────────────────

export const getAdminStats = async (req, res, next) => {
  try {
    const collegeId = req.user.college
    if (!collegeId) return res.status(400).json({ message: 'No college assigned.' })

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const college = await College.findById(collegeId).select('name viewCount queryCount')
    if (!college) return res.status(404).json({ message: 'College not found.' })

    // Count uploaded files for this college
    const [totalFiles, totalSessions] = await Promise.all([
      UploadedFile.countDocuments({ college: collegeId, isActive: true }),
      ChatSession.countDocuments({ isArchived: false }),
    ])

    const queriesToday = await ChatSession.aggregate([
      { $match: { updatedAt: { $gte: startOfDay } } },
      { $project: { count: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ])

    // Daily queries last 7 days
    const dailyQueries = await ChatSession.aggregate([
      { $match: { updatedAt: { $gte: last7 } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ])

    res.json({
      college,
      totalFiles,
      totalSessions,
      queriesToday: queriesToday[0]?.total || 0,
      collegeViews: college?.viewCount || 0,
      collegeQueries: college?.queryCount || 0,
      dailyQueries,
    })
  } catch (err) {
    next(err)
  }
}

// ─── SuperAdmin-level stats (kept for backward compat) ───────────────────────

export const getStats = async (req, res, next) => {
  try {
    const [users, sessions] = await Promise.all([
      User.countDocuments(),
      ChatSession.countDocuments({ isArchived: false }),
    ])
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const queriesToday = await ChatSession.aggregate([
      { $match: { updatedAt: { $gte: startOfDay } } },
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ])
    res.json({ users, sessions, queriesToday: queriesToday[0]?.total || 0 })
  } catch (err) {
    next(err)
  }
}

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const [users, total] = await Promise.all([
      User.find({ role: 'user' })
        .select('-password -passwordResetToken -passwordResetExpires -refreshToken')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({ role: 'user' }),
    ])
    res.json({ users, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}
