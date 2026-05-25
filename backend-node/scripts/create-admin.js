/**
 * Seed script — creates a superadmin or admin user.
 *
 * Usage:
 *   node scripts/create-admin.js                        # creates superadmin
 *   ROLE=admin node scripts/create-admin.js             # creates admin
 *
 * Override defaults via env vars:
 *   ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const ROLE         = process.env.ROLE          || 'superadmin'
const ADMIN_NAME   = process.env.ADMIN_NAME    || (ROLE === 'superadmin' ? 'Super Admin' : 'Admin')
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL   || (ROLE === 'superadmin' ? 'superadmin@admission.local' : 'admin@admission.local')
const ADMIN_PASS   = process.env.ADMIN_PASSWORD || 'Admin@1234'
const MONGODB_URI  = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set. Copy .env.example → .env and fill it in.')
  process.exit(1)
}

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    password:     { type: String, required: true, select: false },
    role:         { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    profileImage: { type: String, default: '' },
    isActive:     { type: Boolean, default: true },
    isSuspended:  { type: Boolean, default: false },
    college:      { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function main() {
  console.log(`Connecting to MongoDB...`)
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.\n')

  const existing = await User.findOne({ email: ADMIN_EMAIL })

  if (existing) {
    if (existing.role === ROLE) {
      console.log(`✅  ${ROLE} already exists: ${ADMIN_EMAIL}`)
    } else {
      existing.role = ROLE
      await existing.save({ validateBeforeSave: false })
      console.log(`✅  Promoted ${existing.email} to ${ROLE}`)
    }
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASS, role: ROLE })
    console.log(`✅  ${ROLE} created!`)
    console.log(`    Email:    ${ADMIN_EMAIL}`)
    console.log(`    Password: ${ADMIN_PASS}`)
    console.log(`\n⚠️   Change the password after first login.`)
  }

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
