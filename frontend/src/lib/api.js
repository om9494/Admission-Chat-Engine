import axios from 'axios'

// ─── Axios instances ──────────────────────────────────────────────────────────

/** Node.js Express backend */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** Python FastAPI AI backend */
export const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_BASE_URL || 'http://localhost:8000',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Token helper (called by authStore) ──────────────────────────────────────
// authStore calls setAxiosToken() which sets api.defaults.headers.common.
// The interceptor below just ensures the header is always present on every
// request, reading from the persisted localStorage key as a fallback for
// the very first request before initAuth() has run.

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

const attachToken = (config) => {
  // Prefer the in-memory default (set by authStore.setAxiosToken)
  if (!config.headers.Authorization) {
    const token = api.defaults.headers.common['Authorization'] || getStoredToken()
    if (token) {
      config.headers.Authorization =
        typeof token === 'string' && token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`
    }
  }
  return config
}

api.interceptors.request.use(attachToken)
aiApi.interceptors.request.use(attachToken)

// ─── Response interceptors — silent refresh on TOKEN_EXPIRED ─────────────────

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

const handle401 = async (error) => {
  const originalRequest = error.config
  const isExpired = error.response?.data?.code === 'TOKEN_EXPIRED'

  if (error.response?.status === 401 && isExpired && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      const res = await api.post('/auth/refresh', { refreshToken })
      const newToken = res.data.token

      // Persist updated token
      try {
        const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}')
        if (stored?.state) {
          stored.state.token = newToken
          localStorage.setItem('auth-storage', JSON.stringify(stored))
        }
      } catch { /* ignore */ }

      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      processQueue(null, newToken)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('auth-storage')
      localStorage.removeItem('refreshToken')
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }

  return Promise.reject(error)
}

api.interceptors.response.use(r => r, handle401)
aiApi.interceptors.response.use(r => r, error => {
  if (error.response?.status === 401) window.location.href = '/login'
  return Promise.reject(error)
})
