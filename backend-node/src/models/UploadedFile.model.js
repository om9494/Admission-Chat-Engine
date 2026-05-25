import mongoose from 'mongoose'

const uploadedFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['pdf', 'image', 'other'], default: 'pdf' },
    label: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

uploadedFileSchema.index({ college: 1 })
uploadedFileSchema.index({ uploadedBy: 1 })

export default mongoose.model('UploadedFile', uploadedFileSchema)
