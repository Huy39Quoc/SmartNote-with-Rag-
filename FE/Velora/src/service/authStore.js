import { create } from 'zustand'
import authApi from '../lib/api/authApi'
import toast from 'react-hot-toast'

const useAuthStore = create((set, get) => ({
  nguoiDung: null,
  dangTai: false,
  daXacThuc: !!localStorage.getItem('velora_token'),

  dangNhap: async (email, matKhau) => {
    set({ dangTai: true })
    try {
      const { data } = await authApi.dangNhap({ email, password: matKhau })
      const { accessToken, refreshToken, user } = data.data
      localStorage.setItem('velora_token', accessToken)
      localStorage.setItem('velora_refresh', refreshToken)
      set({ nguoiDung: user, daXacThuc: true, dangTai: false })
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại')
      set({ dangTai: false })
      return false
    }
  },

  dangKy: async (email, matKhau, hoTen) => {
    set({ dangTai: true })
    try {
      const { data } = await authApi.dangKy({ email, password: matKhau, fullName: hoTen })
      const { accessToken, refreshToken, user } = data.data
      localStorage.setItem('velora_token', accessToken)
      localStorage.setItem('velora_refresh', refreshToken)
      set({ nguoiDung: user, daXacThuc: true, dangTai: false })
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại')
      set({ dangTai: false })
      return false
    }
  },

  dangXuat: async () => {
    try {
      const refreshToken = localStorage.getItem('velora_refresh')
      if (refreshToken) await authApi.dangXuat({ refreshToken })
    } catch {}
    localStorage.removeItem('velora_token')
    localStorage.removeItem('velora_refresh')
    set({ nguoiDung: null, daXacThuc: false })
  },

  layThongTin: async () => {
    try {
      const { data } = await authApi.layThongTinToi()
      set({ nguoiDung: data.data })
    } catch { get().dangXuat() }
  },

  laAdmin: () => get().nguoiDung?.role === 'ADMIN',
}))

export default useAuthStore
