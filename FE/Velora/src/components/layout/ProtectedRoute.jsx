import { Navigate } from 'react-router-dom'
import useAuthStore from '../../service/authStore'

export function ProtectedRoute({ children }) {
  const { daXacThuc } = useAuthStore()
  return daXacThuc ? children : <Navigate to="/dang-nhap" replace />
}

export function AdminRoute({ children }) {
  const { daXacThuc, laAdmin } = useAuthStore()
  if (!daXacThuc) return <Navigate to="/dang-nhap" replace />
  if (!laAdmin()) return <Navigate to="/tong-quan" replace />
  return children
}

export function PublicOnlyRoute({ children }) {
  const { daXacThuc } = useAuthStore()
  return daXacThuc ? <Navigate to="/ghi-chu" replace /> : children
}
