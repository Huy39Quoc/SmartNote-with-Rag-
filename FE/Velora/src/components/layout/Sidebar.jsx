import { NavLink, useNavigate } from 'react-router-dom'
import {
    IconLayoutDashboard,
    IconFileText,
    IconMessages,
    IconCalendar,
    IconShield,
    IconLogout,
    IconUser,
    IconNotes,
    IconShare,
    IconBell,
} from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'

const menu = [
    { to: '/tong-quan', label: 'Tổng quan', icon: IconLayoutDashboard },
    { to: '/ghi-chu', label: 'Ghi chú', icon: IconNotes },
    { to: '/chat', label: 'Hỏi đáp AI', icon: IconMessages },
    { to: '/tai-lieu', label: 'Tài liệu', icon: IconFileText },
    { to: '/lich', label: 'Lịch & Deadline', icon: IconCalendar },
    { to: '/kien-thuc', label: 'Kiến thức', icon: IconShare },
    { to: '/tai-khoan', label: 'Tài khoản', icon: IconUser },
    { to: '/thong-bao', label: 'Thông báo', icon: IconBell },
]

export default function Sidebar() {
    const { nguoiDung, dangXuat, laAdmin } = useAuthStore()
    const navigate = useNavigate()

    const handleDangXuat = async () => {
        await dangXuat()
        navigate('/dang-nhap')
    }

    return (
        <aside style={styles.sidebar}>
            <div style={styles.logo}>
                <img src={logo} alt="Velora" style={{ height: 22 }} />
            </div>

            <nav style={styles.nav}>
                {menu.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        style={navStyle}
                        className={({ isActive }) => isActive ? 'active' : ''}
                    >
                        <Icon size={15} />
                        <span>{label}</span>
                    </NavLink>
                ))}

                {laAdmin() && (
                    <NavLink
                        to="/quan-tri"
                        style={navStyle}
                        className={({ isActive }) => isActive ? 'active' : ''}
                    >
                        <IconShield size={15} />
                        <span>Quản trị</span>
                    </NavLink>
                )}
            </nav>

            <div style={styles.bottom}>
                <div style={styles.userRow}>
                    <div style={styles.avatar}>
                        {nguoiDung?.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {nguoiDung?.fullName || 'Người dùng'}
                        </div>

                        <div
                            style={{
                                fontSize: 10,
                                color: 'var(--text-faint)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {nguoiDung?.email}
                        </div>
                    </div>
                </div>

                <button
                    className="btn-ghost"
                    onClick={handleDangXuat}
                    style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        padding: '6px 8px',
                        marginTop: 2,
                    }}
                >
                    <IconLogout size={13} />
                    <span style={{ fontSize: 12 }}>Đăng xuất</span>
                </button>
            </div>
        </aside>
    )
}

const navStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
    background: isActive ? 'var(--bg-elevated)' : 'transparent',
    textDecoration: 'none',
    transition: 'all .12s',
})

const styles = {
    sidebar: {
        width: 'var(--sidebar-w)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
    },
    logo: {
        padding: '14px 12px 10px',
        borderBottom: '.5px solid var(--border)',
    },
    nav: {
        flex: 1,
        padding: '8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
    },
    bottom: {
        padding: '8px',
        borderTop: '.5px solid var(--border)',
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
    },
    avatar: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
    },
}