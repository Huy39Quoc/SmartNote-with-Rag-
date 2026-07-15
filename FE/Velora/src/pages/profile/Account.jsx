import { useEffect, useState } from 'react'
import {
    IconUser,
    IconMail,
    IconShield,
    IconLock,
    IconCheck,
    IconLoader2,
} from '@tabler/icons-react'
import toast from 'react-hot-toast'
import authApi from '../../lib/api/authApi'
import useAuthStore from '../../service/authStore'

export default function Account() {
    const { user, getProfile } = useAuthStore()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('')
    const [isSavingProfile, setSavingProfile] = useState(false)

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '')
            setEmail(user.email || '')
            setRole(user.role || '')
        }
    }, [user])

    const updateProfile = async () => {
        const name = fullName.trim()

        if (!name) {
            toast.error('Họ tên không được để trống')
            return
        }

        setSavingProfile(true)

        try {
            await authApi.updateProfile({
                fullName: name,
            })

            await getProfile()
            toast.success('Đã cập nhật thông message')
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Không thể cập nhật thông message')
        } finally {
            setSavingProfile(false)
        }
    }

    const changePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error('Vui lòng nhập đầy đủ thông message mật khẩu')
            return
        }

        if (newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp')
            return
        }

        if (newPassword !== newPassword.trim()) {
            toast.error('Mật khẩu mới không được bắt đầu hoặc kết thúc bằng khoảng trắng')
            return
        }

        if (oldPassword === newPassword) {
            toast.error('Mật khẩu mới không được trùng mật khẩu hiện tại')
            return
        }

        setChangingPassword(true)

        try {
            await authApi.changePassword({
                oldPassword,
                newPassword,
            })

            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            toast.success('Đã đổi mật khẩu')
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu')
        } finally {
            setChangingPassword(false)
        }
    }

    return (
        <div style={styles.wrap}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Tài khoản</h1>
                    <p style={styles.desc}>
                        Quản lý thông message cá nhân và bảo mật tài khoản của bạn.
                    </p>
                </div>
            </div>

            <div style={styles.grid}>
                <section style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox}>
                            <IconUser size={18} />
                        </div>
                        <div>
                            <h2 style={styles.cardTitle}>Thông message cá nhân</h2>
                            <p style={styles.cardDesc}>Cập nhật tên hiển thị của bạn.</p>
                        </div>
                    </div>

                    <div style={styles.form}>
                        <label style={styles.label}>
                            Họ tên
                            <input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Nhập họ tên..."
                                style={styles.input}
                            />
                        </label>

                        <label style={styles.label}>
                            Email
                            <div style={styles.readonlyRow}>
                                <IconMail size={14} />
                                <span>{email || 'Chưa có email'}</span>
                            </div>
                        </label>

                        <label style={styles.label}>
                            Vai trò
                            <div style={styles.readonlyRow}>
                                <IconShield size={14} />
                                <span>{role || 'USER'}</span>
                            </div>
                        </label>

                        <button
                            className="btn-primary"
                            onClick={updateProfile}
                            disabled={isSavingProfile}
                            style={styles.button}
                        >
                            {isSavingProfile ? (
                                <>
                                    <IconLoader2 size={14} /> Đang lưu...
                                </>
                            ) : (
                                <>
                                    <IconCheck size={14} /> Lưu thông message
                                </>
                            )}
                        </button>
                    </div>
                </section>

                <section style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.iconBox}>
                            <IconLock size={18} />
                        </div>
                        <div>
                            <h2 style={styles.cardTitle}>Đổi mật khẩu</h2>
                            <p style={styles.cardDesc}>
                                Mật khẩu mới nên có ít nhất 6 ký tự.
                            </p>
                        </div>
                    </div>

                    <div style={styles.form}>
                        <label style={styles.label}>
                            Mật khẩu hiện tại
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="Nhập mật khẩu hiện tại..."
                                style={styles.input}
                            />
                        </label>

                        <label style={styles.label}>
                            Mật khẩu mới
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới..."
                                style={styles.input}
                            />
                        </label>

                        <label style={styles.label}>
                            Xác nhận mật khẩu mới
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới..."
                                style={styles.input}
                            />
                        </label>

                        <button
                            className="btn-primary"
                            onClick={changePassword}
                            disabled={isChangingPassword}
                            style={styles.button}
                        >
                            {isChangingPassword ? (
                                <>
                                    <IconLoader2 size={14} /> Đang đổi...
                                </>
                            ) : (
                                <>
                                    <IconCheck size={14} /> Đổi mật khẩu
                                </>
                            )}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}

const styles = {
    wrap: {
        padding: 24,
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    header: {
        marginBottom: 20,
    },
    title: {
        margin: 0,
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    desc: {
        margin: '6px 0 0',
        fontSize: 13,
        color: 'var(--text-muted)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
        maxWidth: 900,
    },
    card: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 18,
    },
    cardHeader: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 18,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    cardTitle: {
        margin: 0,
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    cardDesc: {
        margin: '4px 0 0',
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 12,
        color: 'var(--text-secondary)',
    },
    input: {
        height: 36,
        fontSize: 13,
    },
    readonlyRow: {
        minHeight: 36,
        padding: '0 11px',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: 'var(--text-muted)',
        background: 'var(--bg-elevated)',
    },
    button: {
        marginTop: 4,
        justifyContent: 'center',
        height: 36,
    },
}
