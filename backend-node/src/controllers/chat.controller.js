import ChatSession from '../models/ChatSession.model.js'

export const createSession = async (req, res, next) => {
  try {
    const session = await ChatSession.create({ user: req.user.id })
    res.status(201).json(session)
  } catch (err) {
    next(err)
  }
}

export const getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ user: req.user.id, isArchived: false })
      .select('title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
    res.json(sessions)
  } catch (err) {
    next(err)
  }
}

export const getSessionMessages = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user.id,
    })
    if (!session) return res.status(404).json({ message: 'Session not found' })
    res.json(session.messages)
  } catch (err) {
    next(err)
  }
}

export const saveMessages = async (req, res, next) => {
  try {
    const { userMessage, assistantMessage, sources } = req.body

    if (!userMessage || !assistantMessage) {
      return res.status(400).json({ message: 'userMessage and assistantMessage are required.' })
    }

    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user.id,
    })
    if (!session) return res.status(404).json({ message: 'Session not found' })

    session.messages.push({ role: 'user', content: userMessage })
    session.messages.push({ role: 'assistant', content: assistantMessage, sources: sources || [] })
    await session.save()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export const deleteSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.sessionId, user: req.user.id },
      { isArchived: true },
      { new: true }
    )
    if (!session) return res.status(404).json({ message: 'Session not found.' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
