import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    IconFileText,
    IconUpload,
    IconCalendar,
    IconSitemap,
    IconPlus,
    IconAlertTriangle,
    IconCards,
    IconChecklist,
    IconTrendingUp,
    IconClock,
    IconTargetArrow,
} from '@tabler/icons-react'
import useAuthStore from '../service/authStore'
import noteApi from '../lib/api/noteApi'
import scheduleApi from '../lib/api/scheduleApi'
import dashboardApi from '../lib/api/dashboardApi'
import Spinner from '../components/ui/Spinner'

export default function TongQuan() {
    const { nguoiDung } = useAuthStore()
    const navigate = useNavigate()

    const [ghiChuGanDay, setGhiChuGanDay] = useState([])
    const [deadlineGanDay, setDeadlineGanDay] = useState([])
    const [dashboard, setDashboard] = useState(null)
    const [dangTai, setDangTai] = useState(true)

    useEffect(() => {
        const tai = async () => {
            setDangTai(true)

            try {
                const [rc, sc, dc] = await Promise.all([
                    noteApi.layTatCa({ page: 0, size: 5 }),
                    scheduleApi.layUuTien(),
                    dashboardApi.layTienDoHocTap(),
                ])

                setGhiChuGanDay(rc.data.data?.content || [])

                const ds = sc.data.data
                const tatCa = [
                    ...(ds?.urgent || []),
                    ...(ds?.high || []),
                    ...(ds?.medium || []),
                ]

                setDeadlineGanDay(tatCa.slice(0, 5))
                setDashboard(dc.data.data)
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

    const metricCards = [
        {
            label: 'Ghi chú',
            value: dashboard?.totalNotes || 0,
            sub: `+${dashboard?.notesThisWeek || 0} trong 7 ngày`,
            icon: IconFileText,
            path: '/ghi-chu',
        },
        {
            label: 'Tài liệu',
            value: dashboard?.totalDocuments || 0,
            sub: `+${dashboard?.documentsThisWeek || 0} trong 7 ngày`,
            icon: IconUpload,
            path: '/tai-lieu',
        },
        {
            label: 'Flashcard',
            value: dashboard?.totalFlashcards || 0,
            sub: `+${dashboard?.flashcardsThisWeek || 0} trong 7 ngày`,
            icon: IconCards,
            path: '/ghi-chu',
        },
        {
            label: 'Task hoàn thành',
            value: `${dashboard?.doneTasks || 0}/${dashboard?.totalTasks || 0}`,
            sub: `${dashboard?.taskCompletionRate || 0}% hoàn thành`,
            icon: IconChecklist,
            path: '/lich',
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

                <button className="btn-primary" onClick={() => navigate('/ghi-chu')}>
                    <IconPlus size={14} /> Ghi chú mới
                </button>
            </div>

            <div style={styles.progressHero}>
                <div>
                    <div style={styles.heroLabel}>
                        <IconTrendingUp size={14} />
                        Tiến độ học tập
                    </div>

                    <div style={styles.heroScore}>
                        {dashboard?.productivityScore || 0}/100
                    </div>

                    <p style={styles.heroText}>
                        Điểm tiến độ được tính từ ghi chú, tài liệu, flashcard và mức độ hoàn thành task.
                    </p>
                </div>

                <div style={styles.circleWrap}>
                    <div style={styles.circle}>
                        <span>{dashboard?.taskCompletionRate || 0}%</span>
                    </div>

                    <div style={styles.circleLabel}>
                        Hoàn thành task
                    </div>
                </div>
            </div>

            <div style={styles.metricGrid}>
                {metricCards.map(({ label, value, sub, icon: Icon, path }) => (
                    <div key={label} style={styles.metricCard} onClick={() => navigate(path)}>
                        <div style={styles.metricIcon}>
                            <Icon size={18} />
                        </div>

                        <div>
                            <div style={styles.metricValue}>{value}</div>
                            <div style={styles.metricLabel}>{label}</div>
                            <div style={styles.metricSub}>{sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.statusGrid}>
                <div style={styles.statusCard}>
                    <div style={styles.statusTop}>
                        <IconAlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
                        <span>Quá hạn</span>
                    </div>

                    <strong>{dashboard?.overdueTasks || 0}</strong>
                    <p>Task chưa hoàn thành và đã qua deadline</p>
                </div>

                <div style={styles.statusCard}>
                    <div style={styles.statusTop}>
                        <IconClock size={16} style={{ color: 'var(--accent-amber)' }} />
                        <span>Sắp tới 7 ngày</span>
                    </div>

                    <strong>{dashboard?.upcomingTasks || 0}</strong>
                    <p>Task cần xử lý trong tuần này</p>
                </div>

                <div style={styles.statusCard}>
                    <div style={styles.statusTop}>
                        <IconTargetArrow size={16} style={{ color: 'var(--accent-blue-dim)' }} />
                        <span>Chưa có deadline</span>
                    </div>

                    <strong>{dashboard?.tasksWithoutDeadline || 0}</strong>
                    <p>Task cần bổ sung thời hạn rõ ràng</p>
                </div>
            </div>

            <div style={styles.shortcutGrid}>
                {[
                    { icon: IconFileText, nhan: 'Ghi chú', mau: '#1e2d3d', duong: '/ghi-chu', desc: 'Tạo và quản lý ghi chú' },
                    { icon: IconUpload, nhan: 'Tài liệu', mau: '#251e3d', duong: '/tai-lieu', desc: 'Upload PDF, DOCX, audio' },
                    { icon: IconCalendar, nhan: 'Lịch', mau: '#2d1e0a', duong: '/lich', desc: 'Deadline & ưu tiên' },
                    { icon: IconSitemap, nhan: 'Kiến thức', mau: '#1a2d1e', duong: '/kien-thuc', desc: 'Tổ chức theo chủ đề' },
                ].map(({ icon: Icon, nhan, mau, duong, desc }) => (
                    <div
                        key={duong}
                        style={{ ...styles.shortcutCard, background: mau }}
                        onClick={() => navigate(duong)}
                    >
                        <Icon size={20} style={{ color: 'var(--text-secondary)', marginBottom: 10 }} />

                        <div style={{ fontWeight: 500, marginBottom: 3 }}>
                            {nhan}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {desc}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.grid2}>
                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={{ fontWeight: 500 }}>Ghi chú gần đây</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/ghi-chu')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {ghiChuGanDay.length === 0 ? (
                        <p style={styles.emptyText}>Chưa có ghi chú nào</p>
                    ) : (
                        ghiChuGanDay.map(n => (
                            <div
                                key={n.id}
                                style={styles.noteRow}
                                onClick={() => navigate(`/ghi-chu/${n.id}`)}
                            >
                                <div style={styles.noteTitle}>{n.title}</div>
                                <div style={styles.notePreview}>{n.contentPreview || 'Không có nội dung'}</div>
                            </div>
                        ))
                    )}
                </div>

                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <span style={{ fontWeight: 500 }}>Deadline sắp tới</span>

                        <button
                            className="btn-ghost"
                            onClick={() => navigate('/lich')}
                            style={{ fontSize: 11 }}
                        >
                            Xem tất cả →
                        </button>
                    </div>

                    {deadlineGanDay.length === 0 ? (
                        <p style={styles.emptyText}>Không có deadline nào</p>
                    ) : (
                        deadlineGanDay.map(t => (
                            <div key={t.id} style={styles.taskRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={styles.taskName}>{t.taskName}</div>

                                    {t.deadline && (
                                        <div
                                            style={{
                                                ...styles.deadlineText,
                                                color: t.daysUntilDeadline < 2
                                                    ? 'var(--accent-red)'
                                                    : 'var(--text-muted)',
                                            }}
                                        >
                                            {t.daysUntilDeadline < 2 && <IconAlertTriangle size={10} />}
                                            {t.deadline}
                                        </div>
                                    )}
                                </div>

                                <span className={`tag ${mucUuTien(t.priority).cls}`}>
                                    {mucUuTien(t.priority).nhan}
                                </span>
                            </div>
                        ))
                    )}
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
        padding: 24,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 20,
        fontWeight: 600,
    },
    dateText: {
        color: 'var(--text-muted)',
        fontSize: 12,
        marginTop: 3,
    },
    progressHero: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
    },
    heroLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--accent-blue-dim)',
        marginBottom: 8,
        fontWeight: 600,
    },
    heroScore: {
        fontSize: 34,
        fontWeight: 800,
        color: 'var(--text-primary)',
        marginBottom: 4,
    },
    heroText: {
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        maxWidth: 520,
    },
    circleWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    circle: {
        width: 86,
        height: 86,
        borderRadius: '50%',
        border: '8px solid var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 800,
        color: 'var(--text-primary)',
        background: 'var(--bg-elevated)',
    },
    circleLabel: {
        fontSize: 11,
        color: 'var(--text-muted)',
    },
    metricGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 14,
    },
    metricCard: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
    },
    metricIcon: {
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
    metricValue: {
        fontSize: 19,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    metricLabel: {
        fontSize: 12,
        color: 'var(--text-secondary)',
        marginTop: 2,
    },
    metricSub: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginTop: 3,
    },
    statusGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 20,
    },
    statusCard: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: 14,
    },
    statusTop: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--text-secondary)',
        marginBottom: 8,
    },
    shortcutGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 10,
        marginBottom: 20,
    },
    shortcutCard: {
        padding: '16px',
        borderRadius: 8,
        cursor: 'pointer',
        border: '.5px solid var(--border)',
        transition: 'opacity .15s',
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
    },
    panel: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        padding: '14px 16px',
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '.5px solid var(--border)',
    },
    emptyText: {
        color: 'var(--text-faint)',
        padding: '16px 0',
        fontSize: 12,
    },
    noteRow: {
        padding: '7px 0',
        borderBottom: '.5px solid var(--border-light)',
        cursor: 'pointer',
    },
    noteTitle: {
        fontWeight: 500,
        fontSize: 12,
        marginBottom: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    notePreview: {
        fontSize: 11,
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    taskRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: '.5px solid var(--border-light)',
    },
    taskName: {
        fontSize: 12,
        fontWeight: 500,
        marginBottom: 2,
    },
    deadlineText: {
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
    },
}