import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },
    profileImage: {
      type: String,
      default: '',
    },
    // For admin role — which college they manage
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Password reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Refresh token (hashed)
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
)

// ─── Indexes ────────────────────────────────────────────────────────────────
// email index is created automatically via `unique: true` on the field
userSchema.index({ role: 1 })

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Hash password before saving if modified */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// ─── Instance Methods ────────────────────────────────────────────────────────

/** Compare a plain-text password against the stored hash */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

/** Generate a password-reset token (plain returned, hashed stored) */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
  return resetToken
}

/** Strip sensitive fields from JSON serialisation */
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.passwordResetToken
  delete obj.passwordResetExpires
  delete obj.refreshToken
  return obj
}

export default mongoose.model('User', userSchema)
