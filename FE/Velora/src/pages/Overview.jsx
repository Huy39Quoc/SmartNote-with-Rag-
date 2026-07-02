import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    IconFileText,
    IconUpload,
    IconCalendar,
    IconSitemap,
    IconPlus,
    IconAlertTriangle,
    IconCards,
    IconSearch,
    IconSparkles,
    IconCloudUpload,
    IconPin,
    IconCalendarEvent,
} from '@tabler/icons-react'
import useAuthStore from '../service/authStore'
import noteApi from '../lib/api/noteApi'
import scheduleApi from '../lib/api/scheduleApi'
import Spinner from '../components/ui/Spinner'

export default function Overview() {
    const { nguoiDung } = useAuthStore()
    const navigate = useNavigate()

    const [ghiChuGanDay, setGhiChuGanDay] = useState([])
    const [deadlineGanDay, setDeadlineGanDay] = useState([])
    const [dangTai, setDangTai] = useState(true)
    const [tuKhoa, setTuKhoa] = useState('')

    useEffect(() => {
        const tai = async () => {
            setDangTai(true)

            try {
                const [rc, sc] = await Promise.all([
                    noteApi.layTatCa({ page: 0, size: 8 }),
                    scheduleApi.layUuTien(),
                ])

                setGhiChuGanDay(rc.data.data?.content || [])

                const ds = sc.data.data
                const tatCa = [
                    ...(ds?.urgent || []),
                    ...(ds?.high || []),
                    ...(ds?.medium || []),
                ]

                setDeadlineGanDay(tatCa.slice(0, 5))
            } catch {
                // Không chặn màn tổng quan nếu một API lỗi
            } finally {
                setDangTai(false)
            }
        }

        tai()
    }, [])

    const buoiChao = () => {
        const h = new Date().getHours()

        if (h < 12) return 'Chào buổi sáng'
        if (h < 18) return 'Chào buổi chiều'
        return 'Chào buổi tối'
    }

    const mucUuTien = p => {
        const m = {
            URGENT: { nhan: 'Khẩn', cls: 'tag-amber' },
            HIGH: { nhan: 'Cao', cls: 'tag-amber' },
            MEDIUM: { nhan: 'Vừa', cls: 'tag-blue' },
            LOW: { nhan: 'Thấp', cls: 'tag-dim' },
        }

        return m[p] || m.MEDIUM
    }

    const ghiChuHienThi = useMemo(() => {
        if (!tuKhoa.trim()) return ghiChuGanDay.slice(0, 5)

        const q = tuKhoa.toLowerCase().trim()

        return ghiChuGanDay
            .filter(n =>
                `${n.title || ''} ${n.contentPreview || ''}`
                    .toLowerCase()
                    .includes(q)
            )
            .slice(0, 5)
    }, [ghiChuGanDay, tuKhoa])

    const ghiChuGhim = ghiChuGanDay.slice(0, 3)

    const taiLieuGanDay = [
        {
            ten: 'SWD392_PE.pdf',
            thoiGian: 'Upload lúc 10:20 hôm qua',
            trangThai: 'Đã phân tích',
            type: 'success',
        },
        {
            ten: 'Database_System_Design.pdf',
            thoiGian: 'Upload lúc 09:15 30/06',
            trangThai: 'Đã phân tích',
            type: 'success',
        },
        {
            ten: 'React_Handbook.pdf',
            thoiGian: 'Upload lúc 16:45 29/06',
            trangThai: 'Đang xử lý',
            type: 'processing',
        },
        {
            ten: 'System_Architecture.pptx',
            thoiGian: 'Upload lúc 14:20 28/06',
            trangThai: 'Chưa phân tích',
            type: 'muted',
        },
    ]

    const quickActions = [
        {
            label: 'Tạo ghi chú mới',
            icon: IconFileText,
            path: '/notes',
        },
        {
            label: 'Upload tài liệu',
            icon: IconCloudUpload,
            path: '/documents',
        },
        {
            label: 'Tạo flashcard',
            icon: IconCards,
            path: '/notes',
        },
        {
            label: 'Hỏi đáp AI',
            icon: IconSparkles,
            path: '/ai',
        },
    ]

    const shortcutCards = [
        {
            label: 'Ghi chú',
            icon: IconFileText,
            path: '/notes',
        },
        {
            label: 'Tài liệu',
            icon: IconUpload,
            path: '/documents',
        },
        {
            label: 'Lịch',
            icon: IconCalendar,
            path: '/schedule',
        },
        {
            label: 'Kiến thức',
            icon: IconSitemap,
            path: '/knowledge',
        },
        {
            label: 'Flashcard',
            icon: IconCards,
            path: '/notes',
        },
        {
            label: 'Hỏi đáp AI',
            icon: IconSparkles,
            path: '/ai',
        },
    ]

    if (dangTai) {
        return (
            <div style={styles.loadingPage}>
                <Spinner size={24} />
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.greeting}>
                        {buoiChao()}, {nguoiDung?.fullName?.split(' ').pop() || 'bạn'} 👋
                    </h1>

                    <p style={styles.dateText}>
                        {new Date().toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>

                <button className="btn-primary" onClick={() => navigate('/notes')}>
                    <IconPlus size={14} /> Ghi chú mới
                </button>
            </div>

            <div style={styles.searchRow}>
                <div style={styles.searchBox}>
                    <IconSearch size={18} style={styles.searchIcon} />

                    <input
                        value={tuKhoa}
                        onChange={e => setTuKhoa(e.target.value)}
                        placeholder="Tìm kiếm ghi chú, tài liệu, flashcard..."
                        style={styles.searchInput}
                    />
                </div>

                <button style={styles.aiSearchButton} onClick={() => navigate('/ai')}>
                    <IconSparkles size={16} />
                    Hỏi AI từ ghi chú của bạn
                </button>
            </div>

            <div style={styles.quickActionPanel}>
                <div style={styles.sectionTitle}>Hành động nhanh</div>

                <div style={styles.quickActionGrid}>
                    {quickActions.map(({ label, icon: Icon, path }) => (
                        <button
                            key={label}
                            style={styles.quickActionCard}
                            onClick={() => navigate(path)}
                        >
                            <span style={styles.quickActionIcon}>
                                <Icon size={19} />
                            </span>

                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.topContentGrid}>
                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>Ghi chú gần đây</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/notes')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {ghiChuHienThi.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có ghi chú nào</p>
                    ) : (
                        ghiChuHienThi.map(n => (
                            <div
                                key={n.id}
                                style={styles.noteRow}
                                onClick={() => navigate(`/notes/${n.id}`)}
                            >
                                <div style={styles.noteIcon}>
                                    <IconFileText size={15} />
                                </div>

                                <div style={styles.rowContent}>
                                    <div style={styles.rowTitle}>{n.title || 'Không có tiêu đề'}</div>
                                    <div style={styles.rowSub}>{n.contentPreview || 'Không có nội dung'}</div>
                                </div>

                                <span style={styles.noteBadge}>Note</span>
                            </div>
                        ))
                    )}
                </div>

                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>Ghi chú đã ghim</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/notes')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {ghiChuGhim.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có ghi chú đã ghim</p>
                    ) : (
                        ghiChuGhim.map(n => (
                            <div
                                key={n.id}
                                style={styles.noteRow}
                                onClick={() => navigate(`/notes/${n.id}`)}
                            >
                                <div style={styles.noteIcon}>
                                    <IconFileText size={15} />
                                </div>

                                <div style={styles.rowContent}>
                                    <div style={styles.rowTitle}>{n.title || 'Không có tiêu đề'}</div>
                                    <div style={styles.rowSub}>Ghim để truy cập nhanh</div>
                                </div>

                                <IconPin size={15} style={styles.pinIcon} />
                            </div>
                        ))
                    )}
                </div>

                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>Deadline sắp tới</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/schedule')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {deadlineGanDay.length === 0 ? (
                        <p style={styles.emptyText}>Không có deadline nào</p>
                    ) : (
                        deadlineGanDay.map(t => (
                            <div key={t.id} style={styles.deadlineRow}>
                                <div style={styles.deadlineIcon}>
                                    <IconCalendarEvent size={15} />
                                </div>

                                <div style={styles.rowContent}>
                                    <div style={styles.rowTitle}>{t.taskName}</div>

                                    <div
                                        style={{
                                            ...styles.rowSub,
                                            color: t.daysUntilDeadline < 2
                                                ? 'var(--accent-red)'
                                                : 'var(--text-muted)',
                                        }}
                                    >
                                        {t.daysUntilDeadline < 2 && (
                                            <IconAlertTriangle size={10} />
                                        )}
                                        {t.deadline || 'Chưa có ngày'}
                                    </div>
                                </div>

                                <span className={`tag ${mucUuTien(t.priority).cls}`}>
                                    {mucUuTien(t.priority).nhan}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div style={styles.bottomGrid}>
                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>Tài liệu gần đây</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/documents')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    <div style={styles.documentGrid}>
                        {taiLieuGanDay.map(d => (
                            <div key={d.ten} style={styles.documentRow}>
                                <div style={styles.documentIcon}>
                                    <IconFileText size={15} />
                                </div>

                                <div style={styles.rowContent}>
                                    <div style={styles.rowTitle}>{d.ten}</div>
                                    <div style={styles.rowSub}>{d.thoiGian}</div>
                                </div>

                                <span style={{ ...styles.statusBadge, ...styles[`statusBadge_${d.type}`] }}>
                                    {d.trangThai}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={styles.panelTitle}>Truy cập nhanh</span>
                    </div>

                    <div style={styles.shortcutGrid}>
                        {shortcutCards.map(({ label, icon: Icon, path }) => (
                            <button
                                key={label}
                                style={styles.shortcutItem}
                                onClick={() => navigate(path)}
                            >
                                <span style={styles.shortcutIcon}>
                                    <Icon size={19} />
                                </span>

                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles = {
    loadingPage: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    page: {
        flex: 1,
        overflow: 'auto',
        padding: '24px 28px',
        background: 'var(--bg-base)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: '-.25px',
        color: 'var(--text-primary)',
    },
    dateText: {
        color: 'var(--text-muted)',
        fontSize: 12,
        marginTop: 4,
    },

    searchRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 260px',
        gap: 14,
        marginBottom: 18,
    },
    searchBox: {
        height: 52,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        boxShadow: '0 4px 14px rgba(15, 23, 42, .025)',
    },
    searchIcon: {
        color: 'var(--text-muted)',
        marginRight: 10,
        flexShrink: 0,
    },
    searchInput: {
        border: 'none',
        background: 'transparent',
        padding: 0,
        height: '100%',
        fontSize: 13,
        color: 'var(--text-primary)',
        boxShadow: 'none',
    },
    aiSearchButton: {
        height: 52,
        justifyContent: 'center',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        fontWeight: 500,
        boxShadow: '0 4px 14px rgba(15, 23, 42, .025)',
    },

    quickActionPanel: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 4px 14px rgba(15, 23, 42, .025)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 14,
    },
    quickActionGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
    },
    quickActionCard: {
        height: 52,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        justifyContent: 'center',
        color: 'var(--text-primary)',
        fontWeight: 500,
        boxShadow: 'none',
    },
    quickActionIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },

    topContentGrid: {
        display: 'grid',
        gridTemplateColumns: '1.15fr 1fr 1.1fr',
        gap: 14,
        marginBottom: 16,
    },
    bottomGrid: {
        display: 'grid',
        gridTemplateColumns: '1.35fr 1fr',
        gap: 14,
    },
    panel: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 4px 14px rgba(15, 23, 42, .025)',
        minHeight: 0,
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: '.5px solid var(--border-light)',
    },
    panelTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
        letterSpacing: '-.15px',
    },

    noteRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 0',
        borderBottom: '.5px solid var(--border-light)',
        cursor: 'pointer',
    },
    deadlineRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 0',
        borderBottom: '.5px solid var(--border-light)',
    },
    documentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 20,
    },
    documentRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 0',
        borderBottom: '.5px solid var(--border-light)',
    },
    noteIcon: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    deadlineIcon: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    documentIcon: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    rowContent: {
        flex: 1,
        minWidth: 0,
    },
    rowTitle: {
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    rowSub: {
        fontSize: 11.5,
        color: 'var(--text-muted)',
        marginTop: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    pinIcon: {
        color: 'var(--text-muted)',
        flexShrink: 0,
    },
    noteBadge: {
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        border: '.5px solid var(--border-blue)',
    },

    shortcutGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 12,
        paddingTop: 6,
    },
    shortcutItem: {
        minHeight: 82,
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
        fontSize: 12,
        fontWeight: 500,
        gap: 9,
    },
    shortcutIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },

    statusBadge: {
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        border: '.5px solid transparent',
    },
    statusBadge_success: {
        background: 'rgba(22, 163, 74, .08)',
        color: '#15803d',
        borderColor: 'rgba(22, 163, 74, .14)',
    },
    statusBadge_processing: {
        background: 'rgba(37, 99, 235, .08)',
        color: 'var(--accent-blue)',
        borderColor: 'rgba(37, 99, 235, .14)',
    },
    statusBadge_muted: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        borderColor: 'var(--border)',
    },

    emptyText: {
        color: 'var(--text-faint)',
        padding: '18px 0',
        fontSize: 12,
    },
}