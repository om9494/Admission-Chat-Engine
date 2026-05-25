import mongoose from 'mongoose'

const analyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
    event: {
      type: String,
      enum: ['page_view', 'chat_query', 'college_view', 'comparison', 'pdf_download'],
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

analyticsSchema.index({ date: -1 })
analyticsSchema.index({ college: 1, date: -1 })
analyticsSchema.index({ event: 1, date: -1 })

export default mongoose.model('Analytics', analyticsSchema)
