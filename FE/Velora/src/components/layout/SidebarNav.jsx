/**
 * SidebarNav — Navigation links in the middle of the sidebar
 * Tách riêng để dễ quản lý menu items, badges, admin links
 */
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

const menu = [
  { to: '/overview',         label: 'Tổng quan',           icon: IconLayoutDashboard },
  { to: '/service-packages', label: 'Gói Premium',          icon: IconPackage },
  { to: '/notes',            label: 'Ghi chú',             icon: IconNotes },
  { to: '/shared-notes',     label: 'Được chia sẻ',        icon: IconShare },
  { to: '/chat',             label: 'Hỏi đáp AI',          icon: IconMessages },
  { to: '/documents',        label: 'Tài liệu',            icon: IconFileText },
  { to: '/shared-documents', label: 'TL được chia sẻ',    icon: IconShare },
  { to: '/schedule',         label: 'Lịch & Deadline',     icon: IconCalendar },
  { to: '/knowledge',        label: 'Kiến thức',           icon: IconShare },
  { to: '/account',          label: 'Tài khoản',           icon: IconUser },
  { to: '/notifications',    label: 'Thông báo',           icon: IconBell },
]

export default function SidebarNav({ soThongBaoChuaDoc = 0 }) {
  const { laAdmin } = useAuthStore()

  return (
    <nav style={styles.nav}>
      {menu.map(({ to, icon: Icon, label }) => {
        const laThongBao = to === '/notifications'

        return (
          <NavLink
            key={to}
            to={to}
            style={navStyle}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <Icon size={17} />
            <span style={styles.label}>{label}</span>

            {laThongBao && soThongBaoChuaDoc > 0 && (
              <span style={styles.badge}>
                {soThongBaoChuaDoc > 99 ? '99+' : soThongBaoChuaDoc}
              </span>
            )}
          </NavLink>
        )
      })}

      {laAdmin() && (
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
  fontSize: 14,            // tăng từ 13px
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
