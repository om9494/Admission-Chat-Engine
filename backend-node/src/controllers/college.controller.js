import College from '../models/College.model.js'
import User from '../models/User.model.js'

// ─── Public ───────────────────────────────────────────────────────────────────

export const getColleges = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const city = req.query.city || ''
    const state = req.query.state || ''
    const type = req.query.type || ''

    const query = { isActive: true }
    if (search) query.$text = { $search: search }
    if (city) query['address.city'] = { $regex: city, $options: 'i' }
    if (state) query['address.state'] = { $regex: state, $options: 'i' }
    if (type) query.type = type

    const [colleges, total] = await Promise.all([
      College.find(query)
        .select('name slug logo banner description address type ranking accreditation courses viewCount queryCount')
        .sort({ ranking: 1, viewCount: -1 })
        .skip(skip)
        .limit(limit),
      College.countDocuments(query),
    ])

    res.json({ colleges, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export const getCollegeBySlug = async (req, res, next) => {
  try {
    const college = await College.findOne({ slug: req.params.slug, isActive: true })
      .populate('admin', 'name email')
    if (!college) return res.status(404).json({ message: 'College not found.' })

    // Increment view count
    college.viewCount += 1
    await college.save({ validateBeforeSave: false })

    res.json(college)
  } catch (err) {
    next(err)
  }
}

export const compareColleges = async (req, res, next) => {
  try {
    const { ids } = req.query
    if (!ids) return res.status(400).json({ message: 'College IDs required.' })
    const idList = ids.split(',').slice(0, 4)

    const colleges = await College.find({ _id: { $in: idList }, isActive: true })
      .select('name slug logo ranking accreditation type address courses facilities placements hostelAvailable campusSize scholarshipDetails')

    res.json(colleges)
  } catch (err) {
    next(err)
  }
}

// ─── Admin (own college) ──────────────────────────────────────────────────────

export const getMyCollege = async (req, res, next) => {
  try {
    if (!req.user.college) return res.status(404).json({ message: 'No college assigned to your account.' })
    const college = await College.findById(req.user.college)
    if (!college) return res.status(404).json({ message: 'College not found.' })
    res.json(college)
  } catch (err) {
    next(err)
  }
}

export const updateMyCollege = async (req, res, next) => {
  try {
    if (!req.user.college) return res.status(403).json({ message: 'No college assigned.' })

    // Prevent admin from changing ownership fields
    const forbidden = ['admin', 'isVerified', 'isActive']
    forbidden.forEach(f => delete req.body[f])

    const college = await College.findByIdAndUpdate(req.user.college, req.body, {
      new: true, runValidators: true,
    })
    res.json(college)
  } catch (err) {
    next(err)
  }
}

export const addFaq = async (req, res, next) => {
  try {
    const { question, answer } = req.body
    if (!question || !answer) return res.status(400).json({ message: 'Question and answer required.' })

    const college = await College.findByIdAndUpdate(
      req.user.college,
      { $push: { faqs: { question, answer } } },
      { new: true }
    )
    res.json(college.faqs)
  } catch (err) {
    next(err)
  }
}

export const deleteFaq = async (req, res, next) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.user.college,
      { $pull: { faqs: { _id: req.params.faqId } } },
      { new: true }
    )
    res.json(college.faqs)
  } catch (err) {
    next(err)
  }
}

export const addWebsiteUrl = async (req, res, next) => {
  try {
    const { url, label } = req.body
    if (!url) return res.status(400).json({ message: 'URL is required.' })

    // Basic URL format validation
    try { new URL(url) } catch {
      return res.status(400).json({ message: 'Invalid URL format.' })
    }

    const college = await College.findByIdAndUpdate(
      req.user.college,
      { $push: { websiteUrls: { url, label: label || url } } },
      { new: true }
    )
    if (!college) return res.status(404).json({ message: 'College not found.' })
    res.json(college.websiteUrls)
  } catch (err) {
    next(err)
  }
}

export const deleteWebsiteUrl = async (req, res, next) => {
  try {
    const college = await College.findByIdAndUpdate(
      req.user.college,
      { $pull: { websiteUrls: { _id: req.params.urlId } } },
      { new: true }
    )
    if (!college) return res.status(404).json({ message: 'College not found.' })
    res.json(college.websiteUrls)
  } catch (err) {
    next(err)
  }
}

// ─── SuperAdmin college CRUD ──────────────────────────────────────────────────

export const createCollege = async (req, res, next) => {
  try {
    const college = await College.create(req.body)
    res.status(201).json(college)
  } catch (err) {
    next(err)
  }
}

export const updateCollege = async (req, res, next) => {
  try {
    const college = await College.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    })
    if (!college) return res.status(404).json({ message: 'College not found.' })
    res.json(college)
  } catch (err) {
    next(err)
  }
}

export const deleteCollege = async (req, res, next) => {
  try {
    const college = await College.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!college) return res.status(404).json({ message: 'College not found.' })
    // Unassign admin
    if (college.admin) await User.findByIdAndUpdate(college.admin, { college: null })
    res.json({ message: 'College deactivated.' })
  } catch (err) {
    next(err)
  }
}
