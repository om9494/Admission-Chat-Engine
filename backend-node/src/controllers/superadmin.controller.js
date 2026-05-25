import User from '../models/User.model.js'
import College from '../models/College.model.js'
import ChatSession from '../models/ChatSession.model.js'
import Analytics from '../models/Analytics.model.js'
import { signAccessToken, signRefreshToken } from '../middleware/auth.middleware.js'
import { validationResult } from 'express-validator'
import logger from '../config/logger.js'

// ─── Platform Analytics ───────────────────────────────────────────────────────

export const getPlatformStats = async (req, res, next) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, totalAdmins, totalColleges, totalSessions,
      activeUsersToday, newUsersThisMonth,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'admin' }),
      College.countDocuments({ isActive: true }),
      ChatSession.countDocuments({ isArchived: false }),
      User.countDocuments({ lastLogin: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ])

    // Queries today
    const queriesToday = await ChatSession.aggregate([
      { $match: { updatedAt: { $gte: startOfDay } } },
      { $project: { count: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ])

    // Daily signups last 7 days
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Daily queries last 7 days
    const dailyQueries = await ChatSession.aggregate([
      { $match: { updatedAt: { $gte: last7Days } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Top colleges by query count
    const topColleges = await College.find({ isActive: true })
      .select('name queryCount viewCount logo')
      .sort({ queryCount: -1 })
      .limit(5)

    res.json({
      totalUsers,
      totalAdmins,
      totalColleges,
      totalSessions,
      activeUsersToday,
      newUsersThisMonth,
      queriesToday: queriesToday[0]?.total || 0,
      dailySignups,
      dailyQueries,
      topColleges,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Admin Management ─────────────────────────────────────────────────────────

export const getAllAdmins = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [admins, total] = await Promise.all([
      User.find({ role: 'admin' })
        .populate('college', 'name slug logo')
        .select('-password -passwordResetToken -passwordResetExpires -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'admin' }),
    ])

    res.json({ admins, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export const createAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

    const { name, email, password, collegeId } = req.body

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already registered.' })

    // Validate college exists and doesn't already have an admin
    if (collegeId) {
      const college = await College.findById(collegeId)
      if (!college) return res.status(404).json({ message: 'College not found.' })
      if (college.admin) return res.status(409).json({ message: 'This college already has an admin.' })
    }

    const admin = await User.create({ name, email, password, role: 'admin', college: collegeId || null })

    // Assign admin to college
    if (collegeId) {
      await College.findByIdAndUpdate(collegeId, { admin: admin._id })
    }

    logger.info(`SuperAdmin created admin: ${email}`)
    res.status(201).json(admin)
  } catch (err) {
    next(err)
  }
}

export const updateAdmin = async (req, res, next) => {
  try {
    const { name, collegeId, isSuspended } = req.body
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' })
    if (!admin) return res.status(404).json({ message: 'Admin not found.' })

    // Handle college reassignment
    if (collegeId !== undefined) {
      // Remove from old college
      if (admin.college) {
        await College.findByIdAndUpdate(admin.college, { admin: null })
      }
      // Assign to new college
      if (collegeId) {
        const college = await College.findById(collegeId)
        if (!college) return res.status(404).json({ message: 'College not found.' })
        if (college.admin && college.admin.toString() !== admin._id.toString()) {
          return res.status(409).json({ message: 'College already has an admin.' })
        }
        await College.findByIdAndUpdate(collegeId, { admin: admin._id })
      }
      admin.college = collegeId || null
    }

    if (name !== undefined) admin.name = name
    if (isSuspended !== undefined) admin.isSuspended = isSuspended

    await admin.save({ validateBeforeSave: false })
    await admin.populate('college', 'name slug logo')
    res.json(admin)
  } catch (err) {
    next(err)
  }
}

export const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' })
    if (!admin) return res.status(404).json({ message: 'Admin not found.' })

    // Unassign from college
    if (admin.college) {
      await College.findByIdAndUpdate(admin.college, { admin: null })
    }

    await admin.deleteOne()
    logger.info(`SuperAdmin deleted admin: ${admin.email}`)
    res.json({ message: 'Admin deleted successfully.' })
  } catch (err) {
    next(err)
  }
}

export const resetAdminPassword = async (req, res, next) => {
  try {
    const { password } = req.body
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter.' })
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one number.' })
    }

    const admin = await User.findOne({ _id: req.params.id, role: 'admin' })
    if (!admin) return res.status(404).json({ message: 'Admin not found.' })

    admin.password = password
    await admin.save()

    logger.info(`SuperAdmin reset password for admin: ${admin.email}`)
    res.json({ message: 'Password reset successfully.' })
  } catch (err) {
    next(err)
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const search = req.query.search || ''

    const query = { role: 'user' }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken -passwordResetExpires -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ])

    res.json({ users, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (user.role === 'superadmin') return res.status(403).json({ message: 'Cannot modify superadmin.' })

    user.isSuspended = !user.isSuspended
    await user.save({ validateBeforeSave: false })
    res.json({ message: `User ${user.isSuspended ? 'suspended' : 'activated'}.`, user })
  } catch (err) {
    next(err)
  }
}

// ─── College Management ───────────────────────────────────────────────────────

export const getAllColleges = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [colleges, total] = await Promise.all([
      College.find()
        .populate('admin', 'name email')
        .select('name slug logo isActive isVerified admin viewCount queryCount createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      College.countDocuments(),
    ])

    res.json({ colleges, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}
