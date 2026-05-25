import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

// ─── Token Helpers ───────────────────────────────────────────────────────────

/**
 * Sign an access token (short-lived).
 */
export const signAccessToken = (userId) =>
  jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

/**
 * Sign a refresh token (long-lived).
 */
export const signRefreshToken = (userId) =>
  jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  })

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * protect — verifies the Bearer access token and attaches req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' })
      }
      return res.status(401).json({ message: 'Invalid token.' })
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type.' })
    }

    const user = await User.findById(decoded.id).populate('college', 'name slug logo')
    if (!user || !user.isActive || user.isSuspended) {
      return res.status(401).json({ message: 'User no longer exists or is inactive.' })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * restrictTo — role-based access control gate.
 * Usage: restrictTo('admin') or restrictTo('admin', 'moderator')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'You do not have permission to perform this action.',
      })
    }
    next()
  }
}

/**
 * optionalAuth — attaches req.user if a valid token is present, but does not
 * block the request if no token is provided. Useful for public endpoints that
 * behave differently for authenticated users.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return next()

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (user?.isActive) req.user = user
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next()
}
