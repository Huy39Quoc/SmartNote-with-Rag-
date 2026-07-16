import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
    IconSun,
    IconMoon,
    IconFolderShare,
    IconBrain,
    IconPlus,
    IconSparkles,
} from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'
import notificationApi from '../../lib/api/notificationApi'
import useThemeStore from '../../service/themeStore'
import { SIDEBAR_MENU } from '../../constants/layoutConstants'

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
    const { isDark, toggleTheme } = useThemeStore()
    const ThemeIcon = isDark ? IconSun : IconMoon

    const handleLogout = async () => {
        await logout()
        setUnreadNotificationCount(0)
        navigate('/login')
    }

    const loadUnreadNotificationCount = async () => {
        if (!localStorage.getItem('velora_token')) {
            setUnreadNotificationCount(0)
            return
        }

        try {
            const { data } = await notificationApi.unreadCount()
            setUnreadNotificationCount(data.data?.count || 0)
        } catch (error) {
            setUnreadNotificationCount(0)
        }
    }

    useEffect(() => {
        loadUnreadNotificationCount()
    }, [location.pathname, user?.id])

    useEffect(() => {
        loadUnreadNotificationCount()

        const interval = setInterval(loadUnreadNotificationCount, 30000)

        const handleFocus = () => loadUnreadNotificationCount()
        const handleNotificationChanged = () => loadUnreadNotificationCount()

        window.addEventListener('focus', handleFocus)
        window.addEventListener('velora:notifications-changed', handleNotificationChanged)

        return () => {
            clearInterval(interval)
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('velora:notifications-changed', handleNotificationChanged)
        }
    }, [user?.id])

    return (
        <aside
            className="flex flex-col h-screen shrink-0 overflow-hidden"
            style={{
                width: 'var(--sidebar-w)',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border)',
            }}
        >

            <div
                className="flex items-center gap-2 px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <img src={logo} alt="Velora" style={{ height: 24 }} />
            </div>

            <div className="px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate('/notes')}
                    className="w-full justify-center py-2.5 rounded-xl font-semibold text-[13px]"
                    style={{ background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)' }}
                >
                    <IconPlus size={16} />
                    Tạo ghi chú mới
                </button>
            </div>

            <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
                {SIDEBAR_MENU.map(({ to, icon: Icon, label }) => {
                    const isNotification = to === '/notifications'

                    return (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] no-underline transition-colors ${
                                    isActive ? 'font-semibold' : 'font-normal'
                                }`
                            }
                            style={({ isActive }) => ({
                                color: isActive ? 'var(--accent-blue-dim)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--bg-selected)' : 'transparent',
                            })}
                        >
                            <Icon size={17} style={{ flexShrink: 0 }} />
                            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>

                            {isNotification && unreadNotificationCount > 0 && (
                                <span
                                    className="flex items-center justify-center rounded-full text-[10px] font-semibold"
                                    style={{
                                        minWidth: 18,
                                        height: 18,
                                        padding: '0 5px',
                                        background: 'var(--accent-red)',
                                        color: '#fff',
                                        lineHeight: 1,
                                    }}
                                >
                                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                </span>
                            )}
                        </NavLink>
                    )
                })}

                {isAdmin() && (
                    <>
                        <div className="my-1.5 mx-1" style={{ height: 1, background: 'var(--border)' }} />
                        <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] no-underline transition-colors ${isActive ? 'font-semibold' : 'font-normal'}`
                            }
                            style={({ isActive }) => ({
                                color: isActive ? 'var(--accent-blue-dim)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--bg-selected)' : 'transparent',
                            })}
                        >
                            <IconShield size={17} />
                            <span>Quản trị</span>
                        </NavLink>
                        <NavLink
                            to="/admin/service-packages"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] no-underline transition-colors ${isActive ? 'font-semibold' : 'font-normal'}`
                            }
                            style={({ isActive }) => ({
                                color: isActive ? 'var(--accent-blue-dim)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--bg-selected)' : 'transparent',
                            })}
                        >
                            <IconShield size={17} />
                            <span>Quản lý Gói</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                    <div
                        className="flex items-center justify-center rounded-full font-semibold shrink-0"
                        style={{ width: 32, height: 32, background: 'var(--bg-ai)', color: 'var(--accent-blue-dim)', fontSize: 13 }}
                    >
                        {user?.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div
                            className="overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}
                        >
                            {user?.fullName || 'Người dùng'}
                        </div>
                        <div
                            className="overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ fontSize: 10.5, color: 'var(--text-faint)' }}
                        >
                            {user?.email}
                        </div>
                    </div>
                </div>

                <div
                    className="rounded-2xl px-3 py-2.5 mb-2"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                    <div
                        className="font-bold uppercase tracking-wide"
                        style={{ fontSize: 10, color: 'var(--text-muted)' }}
                    >
                        PLUS
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                        AI không giới hạn • 10GB
                    </p>
                </div>

                <button
                    className="btn-ghost w-full justify-start"
                    onClick={toggleTheme}
                    style={{ padding: '7px 10px', marginBottom: 2 }}
                >
                    <ThemeIcon size={15} />
                    <span style={{ fontSize: 13 }}>{isDark ? 'Giao diện sáng' : 'Giao diện tối'}</span>
                </button>

                <button
                    className="btn-ghost w-full justify-start"
                    onClick={handleLogout}
                    style={{ padding: '7px 10px' }}
                >
                    <IconLogout size={15} />
                    <span style={{ fontSize: 13 }}>Đăng xuất</span>
                </button>
            </div>
        </aside>
    )
}
