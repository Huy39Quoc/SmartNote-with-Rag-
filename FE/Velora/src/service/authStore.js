import { create } from 'zustand'
import authApi from '../lib/api/authApi'
import toast from 'react-hot-toast'

const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('velora_token'),

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authApi.login({ email, password: password })
      const { accessToken, refreshToken, user } = data.data
      localStorage.setItem('velora_token', accessToken)
      localStorage.setItem('velora_refresh', refreshToken)
      set({ user: user, isAuthenticated: true, isLoading: false })
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại')
      set({ isLoading: false })
      return false
    }
  },

    register: async (email, password, fullName) => {
        set({ isLoading: true })

        try {
            await authApi.register({
                email,
                password: password,
                fullName: fullName,
            })

            localStorage.removeItem('velora_token')
            localStorage.removeItem('velora_refresh')

            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            })

            toast.success('Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.')
            return true
        } catch (err) {
            toast.error(err.response?.data?.message || 'Đăng ký thất bại')
            set({ isLoading: false })
            return false
        }
    },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('velora_refresh')
      if (refreshToken) await authApi.logout({ refreshToken })
    } catch {}
    localStorage.removeItem('velora_token')
    localStorage.removeItem('velora_refresh')
    set({ user: null, isAuthenticated: false })
  },

  getProfile: async () => {
    try {
      const { data } = await authApi.getMyProfile()
      set({ user: data.data })
    } catch { get().logout() }
  },

  isAdmin: () => get().user?.role === 'ADMIN',
}))

export default useAuthStore
