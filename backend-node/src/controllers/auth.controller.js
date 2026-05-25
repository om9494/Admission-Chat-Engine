import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'
import { validationResult } from 'express-validator'
import { signAccessToken, signRefreshToken } from '../middleware/auth.middleware.js'
import logger from '../config/logger.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Send both tokens + user in a consistent response shape */
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id)
  const refreshToken = signRefreshToken(user._id)

  // Set refresh token as httpOnly cookie (more secure than localStorage)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  res.status(statusCode).json({
    token: accessToken,       // short-lived access token for Authorization header
    refreshToken,             // also returned for clients that can't use cookies
    user,
  })
}

/** Extract and validate express-validator errors */
const checkValidation = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg })
    return false
  }
  return true
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new user account.
 */
export const register = async (req, res, next) => {
  try {
    if (!checkValidation(req, res)) return

    const { name, email, password } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' })
    }

    const user = await User.create({ name, email, password })
    logger.info(`New user registered: ${email}`)
    sendTokenResponse(user, 201, res)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/login
 * Authenticate with email + password.
 */
export const login = async (req, res, next) => {
  try {
    if (!checkValidation(req, res)) return

    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated.' })
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
    }

    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })

    logger.info(`User logged in: ${email}`)
    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    // Accept from cookie or body
    const token = req.cookies?.refreshToken || req.body?.refreshToken
    if (!token) {
      return res.status(401).json({ message: 'Refresh token not provided.' })
    }

    let decoded
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      )
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' })
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type.' })
    }

    const user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive.' })
    }

    const newAccessToken = signAccessToken(user._id)
    res.json({ token: newAccessToken, user })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/logout
 * Clear the refresh token cookie.
 */
export const logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
  res.json({ message: 'Logged out successfully.' })
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/auth/update-profile
 * Update name and/or profileImage.
 */
export const updateProfile = async (req, res, next) => {
  try {
    if (!checkValidation(req, res)) return

    // Only allow safe fields — never role or password here
    const allowed = ['name', 'profileImage']
    const updates = {}
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    })

    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/auth/change-password
 * Change password — requires current password confirmation.
 */
export const changePassword = async (req, res, next) => {
  try {
    if (!checkValidation(req, res)) return

    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id).select('+password')
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect.' })
    }

    user.password = newPassword
    await user.save()

    logger.info(`Password changed for user: ${user.email}`)
    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/forgot-password
 * Generate a password-reset token and (in production) email it.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' })
    }

    const user = await User.findOne({ email })
    // Always respond 200 to prevent user enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    // In production: send email with resetToken
    // For now, return it in dev mode only
    const response = { message: 'If that email exists, a reset link has been sent.' }
    if (process.env.NODE_ENV === 'development') {
      response.resetToken = resetToken
    }

    logger.info(`Password reset requested for: ${email}`)
    res.json(response)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/reset-password/:token
 * Reset password using the token from the email link.
 */
export const resetPassword = async (req, res, next) => {
  try {
    if (!checkValidation(req, res)) return

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired.' })
    }

    user.password = req.body.password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    logger.info(`Password reset completed for: ${user.email}`)
    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}
