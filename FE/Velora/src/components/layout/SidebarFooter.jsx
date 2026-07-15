/**
 * SidebarFooter — User info + Logout section at the bottom of the sidebar
 * Tách riêng để dễ thay đổi profile, settings, logout độc lập
 */
import { IconLogout } from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import { useNavigate } from 'react-router-dom'

export default function SidebarFooter({ setUnreadNotificationCount }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    if (setUnreadNotificationCount) setUnreadNotificationCount(0)
    navigate('/login')
  }

  return (
    <div style={styles.footer}>
      <div style={styles.userRow}>
        <div style={styles.avatar}>
          {user?.fullName?.[0]?.toUpperCase() || 'U'}
        </div>

        <div style={styles.userInfo}>
          <div style={styles.userName}>
            {user?.fullName || 'Người dùng'}
          </div>
          <div style={styles.userEmail}>
            {user?.email}
          </div>
        </div>
      </div>

      <button
        className="btn-ghost"
        onClick={handleLogout}
        style={styles.logoutBtn}
      >
        <IconLogout size={15} />
        <span>Đăng xuất</span>
      </button>
    </div>
  )
}

const styles = {
  footer: {
    padding: '10px',
    borderTop: '.5px solid var(--border)',
    flexShrink: 0,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--bg-ai)',
    color: 'var(--accent-blue-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--text-primary)',
  },
  userEmail: {
    fontSize: 11,
    color: 'var(--text-faint)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 1,
  },
  logoutBtn: {
    width: '100%',
    justifyContent: 'flex-start',
    padding: '7px 10px',
    fontSize: 13,
  },
}
