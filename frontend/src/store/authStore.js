import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

// ─── Token helpers ────────────────────────────────────────────────────────────

const setAxiosToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialising: true, // true until initAuth completes
      error: null,

      // ── Bootstrap ──────────────────────────────────────────────────────────

      /**
       * Called once on app mount. Restores session from persisted state and
       * verifies the token is still valid by hitting /auth/me.
       */
      initAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isInitialising: false })
          return
        }
        setAxiosToken(token)
        try {
          const res = await api.get('/auth/me')
          set({ user: res.data, isAuthenticated: true, isInitialising: false })
        } catch (err) {
          // 401 with TOKEN_EXPIRED → try silent refresh
          // Any other error (invalid token, server down) → clear session
          if (err.response?.status === 401) {
            const refreshed = await get().silentRefresh()
            if (!refreshed) get().clearSession()
          }
          set({ isInitialising: false })
        }
      },

      /**
       * Attempt to get a new access token using the refresh token stored in
       * the httpOnly cookie (or localStorage fallback).
       */
      silentRefresh: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken')
          const res = await api.post('/auth/refresh', { refreshToken })
          const { token, user } = res.data
          setAxiosToken(token)
          set({ token, user, isAuthenticated: true })
          return true
        } catch {
          get().clearSession()
          return false
        }
      },

      // ── Auth actions ───────────────────────────────────────────────────────

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { token, refreshToken, user } = res.data
          setAxiosToken(token)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
          set({ token, user, isAuthenticated: true, isLoading: false, error: null })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed. Please try again.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      register: async ({ name, email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/register', { name, email, password })
          const { token, refreshToken, user } = res.data
          setAxiosToken(token)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
          set({ token, user, isAuthenticated: true, isLoading: false, error: null })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Registration failed. Please try again.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // Ignore — clear locally regardless
        }
        get().clearSession()
      },

      // ── Profile ────────────────────────────────────────────────────────────

      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.patch('/auth/update-profile', data)
          set({ user: res.data, isLoading: false })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Profile update failed.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      changePassword: async ({ currentPassword, newPassword }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.patch('/auth/change-password', {
            currentPassword,
            newPassword,
          })
          const { token, refreshToken, user } = res.data
          setAxiosToken(token)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
          set({ token, user, isLoading: false })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Password change failed.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/forgot-password', { email })
          set({ isLoading: false })
          return { success: true, message: res.data.message }
        } catch (err) {
          const message = err.response?.data?.message || 'Request failed.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      resetPassword: async ({ token, password }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post(`/auth/reset-password/${token}`, { password })
          const { token: accessToken, refreshToken, user } = res.data
          setAxiosToken(accessToken)
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
          set({ token: accessToken, user, isAuthenticated: true, isLoading: false })
          return { success: true }
        } catch (err) {
          const message = err.response?.data?.message || 'Password reset failed.'
          set({ error: message, isLoading: false })
          return { success: false, message }
        }
      },

      // ── Helpers ────────────────────────────────────────────────────────────

      clearError: () => set({ error: null }),

      clearSession: () => {
        localStorage.removeItem('refreshToken')
        setAxiosToken(null)
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },
    }),
    {
      name: 'auth-storage',
      // Only persist the token — user is re-fetched on init
      partialize: (state) => ({ token: state.token }),
    }
  )
)
