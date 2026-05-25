import { create } from 'zustand'
import { api, aiApi } from '@/lib/api'

export const useChatStore = create((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isTyping: false,

  createSession: async () => {
    try {
      const res = await api.post('/chat/sessions')
      const session = res.data
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSessionId: session._id,
        messages: [],
      }))
      return session._id
    } catch (err) {
      console.error('Failed to create session', err)
    }
  },

  loadSessions: async () => {
    try {
      const res = await api.get('/chat/sessions')
      set({ sessions: res.data })
    } catch (err) {
      console.error('Failed to load sessions', err)
    }
  },

  loadSession: async (sessionId) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}/messages`)
      set({ currentSessionId: sessionId, messages: res.data })
    } catch (err) {
      console.error('Failed to load session', err)
    }
  },

  sendMessage: async ({ content, sessionId }) => {
    // Resolve or create a session
    let activeSid = sessionId || get().currentSessionId
    if (!activeSid) {
      activeSid = await get().createSession()
      if (!activeSid) return
    }

    // Optimistic user message
    const userMsg = { tempId: `temp-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() }
    set((state) => ({ messages: [...state.messages, userMsg], isTyping: true }))

    try {
      const res = await aiApi.post('/chat', {
        message: content,
        session_id: activeSid,
        language: localStorage.getItem('i18nextLng') || 'en',
      })

      const assistantMsg = {
        _id: res.data.message_id,
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || [],
        createdAt: new Date().toISOString(),
      }

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isTyping: false,
      }))

      // Persist to Node backend
      await api.post(`/chat/sessions/${activeSid}/messages`, {
        userMessage: content,
        assistantMessage: res.data.answer,
        sources: res.data.sources,
      })
    } catch (err) {
      console.error('Chat error:', err)
      set((state) => ({
        messages: [
          ...state.messages,
          {
            tempId: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            createdAt: new Date().toISOString(),
          },
        ],
        isTyping: false,
      }))
    }
  },
}))
