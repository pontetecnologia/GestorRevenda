import { create } from 'zustand'
import api from '../services/api'

interface User {
  id: string
  name: string
  email: string
  role: 'SUPPORT' | 'MANAGER' | 'ADMIN'
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => void
  can: (roles: string[]) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  loadFromStorage: () => {
    const token = localStorage.getItem('rh_token')
    const userStr = localStorage.getItem('rh_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ token, user })
      } catch {
        localStorage.removeItem('rh_token')
        localStorage.removeItem('rh_user')
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, user } = res.data
      localStorage.setItem('rh_token', access_token)
      localStorage.setItem('rh_user', JSON.stringify(user))
      set({ token: access_token, user, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('rh_token')
    localStorage.removeItem('rh_user')
    set({ user: null, token: null })
  },

  can: (roles: string[]) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return roles.includes(user.role)
  },
}))
