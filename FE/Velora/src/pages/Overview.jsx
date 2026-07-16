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
import documentApi from '../lib/api/documentApi'
import { parseLocalDate } from '../utils/formatters'
export default function Overview() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [recentNotes, setRecentNotes] = useState([])
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [keyword, setKeyword] = useState('')
    const [recentDocuments, setRecentDocuments] = useState([])
    useEffect(() => {
        const download = async () => {
            setLoading(true)

            try {
                const [notesResult, schedulesResult, documentsResult] = await Promise.allSettled([
                    noteApi.getAll({ page: 0, size: 8 }),
                    scheduleApi.getPriority(),
                    documentApi.getAll({ page: 0, size: 4 }),
                ])

                if (notesResult.status === 'fulfilled') {
                    setRecentNotes(notesResult.value.data.data?.content || [])
                }

                if (documentsResult.status === 'fulfilled') {
                    setRecentDocuments(documentsResult.value.data.data?.content || [])
                }

                if (schedulesResult.status === 'fulfilled') {
                    const schedules = schedulesResult.value.data.data
                    const all = [
                        ...(schedules?.urgent || []),
                        ...(schedules?.high || []),
                        ...(schedules?.medium || []),
                    ]

                    setUpcomingDeadlines(all.slice(0, 5))
                }
            } catch {

            } finally {
                setLoading(false)
            }
        }

        download()
    }, [])

    const getGreeting = () => {
        const h = new Date().getHours()

        if (h < 12) return 'Chào buổi sáng'
        if (h < 18) return 'Chào buổi chiều'
        return 'Chào buổi tối'
    }

    const getPriorityDisplay = p => {
        const m = {
            URGENT: { label: 'Khẩn', cls: 'tag-amber' },
            HIGH: { label: 'Cao', cls: 'tag-amber' },
            MEDIUM: { label: 'Vừa', cls: 'tag-blue' },
            LOW: { label: 'Thấp', cls: 'tag-dim' },
        }

        return m[p] || m.MEDIUM
    }

    const displayedNotes = useMemo(() => {
        if (!keyword.trim()) return recentNotes.slice(0, 5)

        const q = keyword.toLowerCase().trim()

        return recentNotes
            .filter(n =>
                `${n.title || ''} ${n.contentPreview || ''}`
                    .toLowerCase()
                    .includes(q)
            )
            .slice(0, 5)
    }, [recentNotes, keyword])

    const pinnedNotes = recentNotes.slice(0, 3)

    const formatDocumentTime = (raw) => {
        const date = parseLocalDate(raw)

        if (!date) return 'Vừa upload'

        const diff = Math.max(0, Date.now() - date.getTime())
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (minutes < 1) return 'Vừa upload'
        if (minutes < 60) return `Upload ${minutes} phút trước`
        if (hours < 24) return `Upload ${hours} giờ trước`
        if (days < 7) return `Upload ${days} ngày trước`

        return `Upload ${date.toLocaleDateString('vi-VN')}`
    }

    const getDocumentStatus = (status) => {
        switch (status) {
            case 'DONE':
                return { label: 'Đã phân tích', type: 'success' }
            case 'PROCESSING':
            case 'PENDING':
                return { label: 'Đang xử lý', type: 'processing' }
            case 'FAILED':
                return { label: 'Lỗi xử lý', type: 'muted' }
            default:
                return { label: 'Chưa phân tích', type: 'muted' }
        }
    }

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

    if (isLoading) {
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
                        {getGreeting()}, {user?.fullName?.split(' ').pop() || 'bạn'} 👋
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
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
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

                    {displayedNotes.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có ghi chú nào</p>
                    ) : (
                        displayedNotes.map(n => (
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

                    {pinnedNotes.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có ghi chú đã ghim</p>
                    ) : (
                        pinnedNotes.map(n => (
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

                    {upcomingDeadlines.length === 0 ? (
                        <p style={styles.emptyText}>Không có deadline nào</p>
                    ) : (
                        upcomingDeadlines.map(t => (
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

                                <span className={`tag ${getPriorityDisplay(t.priority).cls}`}>
                                    {getPriorityDisplay(t.priority).label}
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

                    {recentDocuments.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có tài liệu nào</p>
                    ) : (
                        <div style={styles.documentGrid}>
                            {recentDocuments.map(d => {
                                const status = getDocumentStatus(d.status)

                                return (
                                    <div
                                        key={d.id}
                                        style={styles.documentRow}
                                        onClick={() => navigate('/documents')}
                                    >
                                        <div style={styles.documentIcon}>
                                            <IconFileText size={15} />
                                        </div>

                                        <div style={styles.rowContent}>
                                            <div style={styles.rowTitle}>
                                                {d.originalName || 'Tài liệu không tên'}
                                            </div>

                                            <div style={styles.rowSub}>
                                                {formatDocumentTime(d.uploadedAt)}
                                            </div>
                                        </div>

                                        <span style={{ ...styles.statusBadge, ...styles[`statusBadge_${status.type}`] }}>
                        {status.label}
                    </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
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
