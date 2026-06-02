import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import useAuthStore from './service/authStore'
import MainLayout from './components/layout/MainLayout'
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute'

// Pages
import Landing    from './pages/landing/Landing'
import DangNhap   from './pages/auth/DangNhap'
import DangKy     from './pages/auth/DangKy'
import TongQuan   from './pages/TongQuan'
import GhiChu     from './pages/notes/GhiChu'
import Chat       from './pages/chat/Chat'
import TaiLieu    from './pages/documents/TaiLieu'
import Lich       from './pages/schedule/Lich'
import KienThuc   from './pages/knowledge/KienThuc'
import QuanTri    from './pages/admin/QuanTri'
import TaiKhoan   from './pages/profile/TaiKhoan'
import ThongBao   from './pages/notifications/ThongBao'


export default function App() {
  const { daXacThuc, layThongTin } = useAuthStore()

  useEffect(() => {
    if (daXacThuc) layThongTin()
  }, [daXacThuc])

  return (
    <Routes>
      {/* Public */}
      <Route path="/"          element={<Landing />} />
      <Route path="/dang-nhap" element={<PublicOnlyRoute><DangNhap /></PublicOnlyRoute>} />
      <Route path="/dang-ky"   element={<PublicOnlyRoute><DangKy /></PublicOnlyRoute>} />

      {/* Protected - có sidebar */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/tong-quan"  element={<TongQuan />} />
        <Route path="/ghi-chu"    element={<GhiChu />} />
        <Route path="/ghi-chu/:id" element={<GhiChu />} />
        <Route path="/chat"       element={<Chat />} />
        <Route path="/tai-lieu"   element={<TaiLieu />} />
        <Route path="/lich"       element={<Lich />} />
        <Route path="/kien-thuc"  element={<KienThuc />} />
        <Route path="/quan-tri"   element={<AdminRoute><QuanTri /></AdminRoute>} />
          <Route path="/tai-khoan" element={<TaiKhoan />} />
          <Route path="/thong-bao" element={<ThongBao />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={daXacThuc ? '/ghi-chu' : '/'} replace />} />
    </Routes>
  )
}
