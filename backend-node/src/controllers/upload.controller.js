import UploadedFile from '../models/UploadedFile.model.js'
import College from '../models/College.model.js'
import fs from 'fs'

export const uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' })
    }

    // Admin uses their own college; superadmin must supply collegeId in body
    const collegeId =
      req.user.role === 'superadmin'
        ? req.body.collegeId
        : req.user.college?.toString() || req.body.collegeId

    if (!collegeId) return res.status(400).json({ message: 'College ID required.' })

    const college = await College.findById(collegeId)
    if (!college) return res.status(404).json({ message: 'College not found.' })

    const saved = []
    for (const file of req.files) {
      const type = file.mimetype === 'application/pdf' ? 'pdf' : 'image'
      const doc = await UploadedFile.create({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        college: collegeId,
        uploadedBy: req.user._id,
        type,
        label: req.body.label || file.originalname,
      })
      saved.push(doc)
    }

    // Link PDFs to college
    const pdfIds = saved.filter(f => f.type === 'pdf').map(f => f._id)
    if (pdfIds.length) {
      await College.findByIdAndUpdate(collegeId, { $push: { uploadedPdfs: { $each: pdfIds } } })
    }

    res.status(201).json({ files: saved })
  } catch (err) {
    next(err)
  }
}

export const getCollegeFiles = async (req, res, next) => {
  try {
    // Superadmin can query by collegeId param; admin uses their own college
    const collegeId =
      req.user.role === 'superadmin'
        ? req.params.collegeId || req.query.collegeId
        : req.user.college

    if (!collegeId) {
      return res.status(400).json({ message: 'College ID required.' })
    }

    const files = await UploadedFile.find({ college: collegeId, isActive: true })
      .sort({ createdAt: -1 })
    res.json(files)
  } catch (err) {
    next(err)
  }
}

export const deleteFile = async (req, res, next) => {
  try {
    const file = await UploadedFile.findById(req.params.id)
    if (!file) return res.status(404).json({ message: 'File not found.' })

    // Ensure admin owns this file's college; superadmin can delete any
    if (
      req.user.role === 'admin' &&
      file.college.toString() !== req.user.college?.toString()
    ) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    // Remove from disk
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path)

    // Soft-delete and remove from college
    await College.findByIdAndUpdate(file.college, { $pull: { uploadedPdfs: file._id } })
    await file.deleteOne()

    res.json({ message: 'File deleted.' })
  } catch (err) {
    next(err)
  }
}
