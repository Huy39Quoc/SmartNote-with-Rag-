import { Navigate } from 'react-router-dom'
import useAuthStore from '../../service/authStore'

export function ProtectedRoute({ children }) {
  const { daXacThuc } = useAuthStore()
  return daXacThuc ? children : <Navigate to="/login" replace />
}

export function AdminRoute({ children }) {
  const { daXacThuc, laAdmin } = useAuthStore()
  if (!daXacThuc) return <Navigate to="/login" replace />
  if (!laAdmin()) return <Navigate to="/overview" replace />
  return children
}

export function PublicOnlyRoute({ children }) {
  const { daXacThuc } = useAuthStore()
  return daXacThuc ? <Navigate to="/notes" replace /> : children
}
