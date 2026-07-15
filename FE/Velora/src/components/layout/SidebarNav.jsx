import { NavLink } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconFileText,
  IconMessages,
  IconCalendar,
  IconShield,
  IconUser,
  IconNotes,
  IconShare,
  IconBell,
  IconPackage,
} from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import { COMPACT_SIDEBAR_MENU } from '../../constants/layoutConstants'

export default function SidebarNav({ unreadNotificationCount = 0 }) {
  const { isAdmin } = useAuthStore()

  return (
    <nav style={styles.nav}>
      {COMPACT_SIDEBAR_MENU.map(({ to, icon: Icon, label }) => {
        const isNotification = to === '/notifications'

        return (
          <NavLink
            key={to}
            to={to}
            style={navStyle}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <Icon size={17} />
            <span style={styles.label}>{label}</span>

            {isNotification && unreadNotificationCount > 0 && (
              <span style={styles.badge}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </NavLink>
        )
      })}

      {isAdmin() && (
        <>
          <div style={styles.divider} />
          <NavLink to="/admin" style={navStyle} className={({ isActive }) => isActive ? 'active' : ''}>
            <IconShield size={17} />
            <span style={styles.label}>Quản trị</span>
          </NavLink>
          <NavLink to="/admin/service-packages" style={navStyle} className={({ isActive }) => isActive ? 'active' : ''}>
            <IconShield size={17} />
            <span style={styles.label}>Quản lý Gói</span>
          </NavLink>
        </>
      )}
    </nav>
  )
}

const navStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '8px 10px',
  borderRadius: 7,
  fontSize: 14,
  fontWeight: isActive ? 500 : 400,
  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
  background: isActive ? 'var(--bg-elevated)' : 'transparent',
  textDecoration: 'none',
  transition: 'all .12s',
})

const styles = {
  nav: {
    flex: 1,
    padding: '8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflowY: 'auto',
  },
  label: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    background: 'var(--accent-red)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  divider: {
    height: '.5px',
    background: 'var(--border)',
    margin: '6px 2px',
  },
}
