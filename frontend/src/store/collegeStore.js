import { create } from 'zustand'
import { api } from '@/lib/api'

export const useCollegeStore = create((set, get) => ({
  colleges: [],
  total: 0,
  page: 1,
  pages: 1,
  isLoading: false,
  error: null,
  myCollege: null,

  fetchColleges: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get('/colleges', { params })
      set({ colleges: res.data.colleges, total: res.data.total, page: res.data.page, pages: res.data.pages, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load colleges', isLoading: false })
    }
  },

  fetchMyCollege: async () => {
    set({ isLoading: true })
    try {
      const res = await api.get('/colleges/my/college')
      set({ myCollege: res.data, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
    }
  },

  updateMyCollege: async (data) => {
    set({ isLoading: true })
    try {
      const res = await api.patch('/colleges/my/college', data)
      set({ myCollege: res.data, isLoading: false })
      return { success: true }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  },

  addFaq: async (data) => {
    try {
      const res = await api.post('/colleges/my/faqs', data)
      set(s => ({ myCollege: s.myCollege ? { ...s.myCollege, faqs: res.data } : s.myCollege }))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  },

  deleteFaq: async (faqId) => {
    try {
      const res = await api.delete(`/colleges/my/faqs/${faqId}`)
      set(s => ({ myCollege: s.myCollege ? { ...s.myCollege, faqs: res.data } : s.myCollege }))
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  },

  addWebsiteUrl: async (data) => {
    try {
      const res = await api.post('/colleges/my/urls', data)
      set(s => ({ myCollege: s.myCollege ? { ...s.myCollege, websiteUrls: res.data } : s.myCollege }))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  },

  deleteWebsiteUrl: async (urlId) => {
    try {
      const res = await api.delete(`/colleges/my/urls/${urlId}`)
      set(s => ({ myCollege: s.myCollege ? { ...s.myCollege, websiteUrls: res.data } : s.myCollege }))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  },
}))
