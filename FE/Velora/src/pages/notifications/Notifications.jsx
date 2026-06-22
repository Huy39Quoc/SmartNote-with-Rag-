import { useEffect, useState } from 'react'
import {
    IconBell,
    IconCheck,
    IconInbox,
    IconLoader2,
    IconRefresh,
} from '@tabler/icons-react'
import toast from 'react-hot-toast'
import notificationApi from '../../lib/api/notificationApi.js'
import EmptyState from '../../components/ui/EmptyState'

export default function Notifications() {
    const [items, setItems] = useState([])
    const [dangTai, setDangTai] = useState(true)
    const [chiChuaDoc, setChiChuaDoc] = useState(false)
    const [dangXuLy, setDangXuLy] = useState(false)

    const taiThongBao = async () => {
        setDangTai(true)

        try {
            const { data } = await notificationApi.layTatCa({
                unreadOnly: chiChuaDoc,
            })

            setItems(data.data || [])
        } catch (error) {
            console.error(error)
            toast.error('Không tải được thông báo')
        } finally {
            setDangTai(false)
        }
    }

    useEffect(() => {
        taiThongBao()
    }, [chiChuaDoc])

    const danhDauDaDoc = async (id) => {
        try {
            const { data } = await notificationApi.danhDauDaDoc(id)
            const updated = data.data

            setItems(p => p.map(item => item.id === id ? updated : item))
            window.dispatchEvent(new Event('velora:notifications-changed'))
            toast.success('Đã đánh dấu đã đọc')
        } catch (error) {
            console.error(error)
            toast.error('Không thể cập nhật thông báo')
        }
    }

    const danhDauTatCa = async () => {
        setDangXuLy(true)

        try {
            await notificationApi.danhDauTatCaDaDoc()
            setItems(p => p.map(item => ({ ...item, isRead: true })))
            window.dispatchEvent(new Event('velora:notifications-changed'))
            toast.success('Đã đánh dấu tất cả là đã đọc')
        } catch (error) {
            console.error(error)
            toast.error('Không thể cập nhật thông báo')
        } finally {
            setDangXuLy(false)
        }
    }

    const formatTime = (value) => {
        if (!value) return ''
        try {
            return new Date(value).toLocaleString('vi-VN')
        } catch {
            return value
        }
    }

    const unreadCount = items.filter(item => !item.isRead).length

    return (
        <div style={styles.wrap}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Thông báo</h1>
                    <p style={styles.desc}>
                        Xem các thông báo từ hệ thống, admin và nhắc nhở học tập.
                    </p>
                </div>

                <div style={styles.actions}>
                    <button
                        className={chiChuaDoc ? 'btn-ai' : 'btn-ghost'}
                        onClick={() => setChiChuaDoc(p => !p)}
                    >
                        Chỉ chưa đọc
                    </button>

                    <button className="btn-ghost" onClick={taiThongBao}>
                        <IconRefresh size={14} /> Làm mới
                    </button>

                    <button
                        className="btn-primary"
                        onClick={danhDauTatCa}
                        disabled={dangXuLy || unreadCount === 0}
                    >
                        {dangXuLy ? (
                            <>
                                <IconLoader2 size={14} /> Đang xử lý...
                            </>
                        ) : (
                            <>
                                <IconCheck size={14} /> Đọc tất cả
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div style={styles.statRow}>
                <div style={styles.statCard}>
                    <IconBell size={18} />
                    <div>
                        <div style={styles.statNumber}>{items.length}</div>
                        <div style={styles.statLabel}>Tổng thông báo</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <IconInbox size={18} />
                    <div>
                        <div style={styles.statNumber}>{unreadCount}</div>
                        <div style={styles.statLabel}>Chưa đọc</div>
                    </div>
                </div>
            </div>

            <div style={styles.list}>
                {dangTai ? (
                    <div style={styles.loading}>
                        <IconLoader2 size={18} />
                        <span>Đang tải thông báo...</span>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={IconBell}
                        title="Chưa có thông báo"
                        desc="Khi admin gửi thông báo hoặc hệ thống tạo nhắc nhở, chúng sẽ xuất hiện ở đây."
                    />
                ) : (
                    items.map(item => (
                        <div
                            key={item.id}
                            style={{
                                ...styles.item,
                                opacity: item.isRead ? 0.68 : 1,
                                borderColor: item.isRead ? 'var(--border)' : 'var(--accent-blue-dim)',
                            }}
                        >
                            <div style={styles.itemIcon}>
                                <IconBell size={15} />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={styles.itemTop}>
                                    <h3 style={styles.itemTitle}>{item.title}</h3>

                                    {!item.isRead && (
                                        <span style={styles.unreadBadge}>Mới</span>
                                    )}
                                </div>

                                <p style={styles.message}>{item.message}</p>

                                <div style={styles.meta}>
                                    <span>{formatTime(item.createdAt)}</span>
                                    {item.isBroadcast && <span>Broadcast</span>}
                                </div>
                            </div>

                            {!item.isRead && (
                                <button
                                    className="btn-ghost"
                                    onClick={() => danhDauDaDoc(item.id)}
                                    style={{ flexShrink: 0 }}
                                >
                                    <IconCheck size={13} />
                                    Đã đọc
                                </button>
                            )}
                        </div>
                    ))
                )}
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
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
        marginBottom: 18,
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
    actions: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    statRow: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    statCard: {
        minWidth: 180,
        padding: 14,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: 'var(--accent-blue-dim)',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    statLabel: {
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    list: {
        maxWidth: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--text-muted)',
        fontSize: 13,
        padding: 20,
    },
    item: {
        display: 'flex',
        gap: 12,
        padding: 14,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
    },
    itemIcon: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    itemTop: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    itemTitle: {
        margin: 0,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    unreadBadge: {
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 999,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
    },
    message: {
        margin: 0,
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
    },
    meta: {
        display: 'flex',
        gap: 10,
        marginTop: 8,
        fontSize: 11,
        color: 'var(--text-faint)',
    },
}