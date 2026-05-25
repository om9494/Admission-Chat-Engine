import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        title: String,
        source: String,
        score: Number,
      },
    ],
  },
  { timestamps: true }
)

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New conversation',
      maxlength: 200,
    },
    messages: [messageSchema],
    language: {
      type: String,
      default: 'en',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

// Auto-generate title from first user message
chatSessionSchema.pre('save', function (next) {
  if (this.isModified('messages') && this.messages.length === 1) {
    const firstMsg = this.messages[0]
    if (firstMsg.role === 'user') {
      this.title = firstMsg.content.slice(0, 60) + (firstMsg.content.length > 60 ? '...' : '')
    }
  }
  next()
})

export default mongoose.model('ChatSession', chatSessionSchema)
