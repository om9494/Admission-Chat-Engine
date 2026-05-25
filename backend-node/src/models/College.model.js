import mongoose from 'mongoose'

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  degreeType: { type: String, enum: ['UG', 'PG', 'Diploma', 'PhD', 'Certificate'], default: 'UG' },
  department: { type: String, trim: true },
  duration: { type: String, trim: true },
  fees: { type: Number, min: 0 },
  seats: { type: Number, min: 0 },
  cutoff: { type: String, trim: true },
})

const facilitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  icon: { type: String, default: '' },
})

const placementSchema = new mongoose.Schema({
  year: { type: Number },
  averagePackage: { type: Number },
  highestPackage: { type: Number },
  placementRate: { type: Number, min: 0, max: 100 },
  topRecruiters: [{ type: String }],
})

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
}, { timestamps: true })

// ─── Main schema ─────────────────────────────────────────────────────────────

const collegeSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: { type: String, required: [true, 'College name is required'], trim: true, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    description: { type: String, trim: true, maxlength: 2000 },
    establishmentYear: { type: Number },
    accreditation: { type: String, trim: true },
    ranking: { type: Number },
    type: { type: String, enum: ['Government', 'Private', 'Deemed', 'Autonomous'], default: 'Private' },

    // ── Contact ───────────────────────────────────────────────────────────────
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
    },
    websiteUrl: { type: String, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },

    // ── Social ────────────────────────────────────────────────────────────────
    socialLinks: {
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },

    // ── Academics ─────────────────────────────────────────────────────────────
    courses: [courseSchema],
    departments: [{ type: String, trim: true }],

    // ── Admission ─────────────────────────────────────────────────────────────
    admissionProcess: { type: String, trim: true },
    eligibilityCriteria: { type: String, trim: true },
    applicationDeadline: { type: Date },
    entranceExams: [{ type: String }],

    // ── Campus ────────────────────────────────────────────────────────────────
    campusSize: { type: String, trim: true },
    hostelAvailable: { type: Boolean, default: false },
    hostelDetails: { type: String, trim: true },
    facilities: [facilitySchema],
    labs: [{ type: String }],
    clubs: [{ type: String }],
    sports: [{ type: String }],

    // ── Financials ────────────────────────────────────────────────────────────
    scholarshipDetails: { type: String, trim: true },

    // ── Placements ────────────────────────────────────────────────────────────
    placements: [placementSchema],

    // ── Faculty ───────────────────────────────────────────────────────────────
    totalFaculty: { type: Number },
    facultyDetails: { type: String, trim: true },

    // ── Media ─────────────────────────────────────────────────────────────────
    gallery: [{ url: String, caption: String }],

    // ── FAQs ──────────────────────────────────────────────────────────────────
    faqs: [faqSchema],

    // ── Uploaded resources ────────────────────────────────────────────────────
    uploadedPdfs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile' }],
    websiteUrls: [{ url: String, label: String, addedAt: { type: Date, default: Date.now } }],

    // ── Ownership ─────────────────────────────────────────────────────────────
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // ── Analytics ─────────────────────────────────────────────────────────────
    viewCount: { type: Number, default: 0 },
    queryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// ─── Indexes ─────────────────────────────────────────────────────────────────
collegeSchema.index({ name: 'text', description: 'text' })
collegeSchema.index({ 'address.city': 1, 'address.state': 1 })
collegeSchema.index({ admin: 1 })
collegeSchema.index({ isActive: 1 })

// ─── Hooks ───────────────────────────────────────────────────────────────────
collegeSchema.pre('save', function (next) {
  // Regenerate slug whenever name changes (and no custom slug was manually set)
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
  next()
})

export default mongoose.model('College', collegeSchema)
