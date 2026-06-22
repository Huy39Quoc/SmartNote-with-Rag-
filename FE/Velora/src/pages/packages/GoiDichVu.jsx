import { useEffect, useState } from 'react'
import packageApi from '../../lib/api/packageApi'
import Spinner from '../../components/ui/Spinner'
import useAuthStore from '../../service/authStore'

const FEATURE_ROWS = [
    {
        id: 'TAG_SUBJECT',
        label: 'Tag môn học / chủ đề / dự án',
        free: true,
        pro: true,
        plus: true,
    },
    {
        id: 'CHECKLIST_BASIC',
        label: 'Checklist công việc cơ bản',
        free: true,
        pro: true,
        plus: true,
    },
    {
        id: 'AI_NOTE_FORMAT',
        label: 'AI format ghi chú',
        free: '10 lần/tháng',
        pro: 'Vô hạn',
        plus: 'Vô hạn',
    },
    {
        id: 'AI_SUMMARY_BASIC',
        label: 'Tóm tắt AI cơ bản',
        free: true,
        pro: true,
        plus: true,
    },
    {
        id: 'AI_SUMMARY_ADVANCED',
        label: 'Tóm tắt & phân tích AI nâng cao',
        free: false,
        pro: true,
        plus: true,
    },
    {
        id: 'DOCUMENT_UPLOAD',
        label: 'Upload tài liệu',
        free: '1GB',
        pro: '2GB',
        plus: '10GB',
    },
    {
        id: 'EXTRACT_SCHEDULE',
        label: 'AI trích xuất deadline từ ghi chú',
        free: false,
        pro: true,
        plus: true,
    },
    {
        id: 'AI_FLASHCARD',
        label: 'Flashcard AI tự động',
        free: false,
        pro: true,
        plus: true,
    },
    {
        id: 'EXPORT_FILE',
        label: 'Export PDF / Word',
        free: false,
        pro: true,
        plus: true,
    },
    {
        id: 'TEAM_WORK',
        label: 'Học nhóm & chia sẻ ghi chú',
        free: false,
        pro: false,
        plus: true,
    },
    {
        id: 'TEAM_DASHBOARD',
        label: 'Dashboard tiến độ nhóm',
        free: false,
        pro: false,
        plus: true,
    },
    {
        id: 'GOOGLE_CALENDAR',
        label: 'Tích hợp Google Calendar',
        free: false,
        pro: false,
        plus: true,
    },
]

export default function GoiDichVu() {
    const { nguoiDung, layThongTin } = useAuthStore()

    const [danhSachGoi, setDanhSachGoi] = useState([])
    const [loading, setLoading] = useState(true)
    const [buyingId, setBuyingId] = useState(null)
    const [billingCycle, setBillingCycle] = useState('monthly')

    const taiGoiDichVu = async () => {
        try {
            const { data } = await packageApi.layDanhSachGoiHoatDong()
            setDanhSachGoi(data.data || data || [])
        } catch (error) {
            console.error(error)
            alert('Không thể tải danh sách gói dịch vụ')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        taiGoiDichVu()
    }, [])

    const handleMuaGoi = async (id) => {
        setBuyingId(id)

        try {
            const { data } = await packageApi.muaGoiDichVu(id, billingCycle)
            const responseData = data.data || data

            if (responseData?.activated) {
                alert(`Đã kích hoạt gói ${responseData.packageName}`)
                await layThongTin()
                return
            }

            if (responseData?.paymentUrl) {
                window.location.href = responseData.paymentUrl
                return
            }

            alert('Không thể tạo liên kết thanh toán!')
        } catch (error) {
            console.error(error)
            alert(error.response?.data?.message || 'Đã xảy ra lỗi khi kết nối tới cổng thanh toán')
        } finally {
            setBuyingId(null)
        }
    }

    const getFeatureLabel = (id) => {
        const featuresMap = {
            TAG_SUBJECT: 'Tag môn học / chủ đề',
            CHECKLIST_BASIC: 'Checklist công việc cơ bản',
            AI_NOTE_FORMAT: 'AI format ghi chú',
            AI_SUMMARY_BASIC: 'Tóm tắt AI cơ bản',
            AI_SUMMARY_ADVANCED: 'Tóm tắt & phân tích AI nâng cao',
            AI_CHAT: 'Hỏi đáp AI với ghi chú / tài liệu',
            AI_ANALYZE: 'AI phân tích tài liệu',
            DOCUMENT_UPLOAD: 'Upload tài liệu',
            EXTRACT_SCHEDULE: 'AI trích xuất deadline từ ghi chú',
            AI_FLASHCARD: 'Flashcard AI tự động',
            DEADLINE_MANAGEMENT: 'Quản lý deadline thông minh',
            PRIORITY_SUGGESTION: 'Gợi ý ưu tiên công việc',
            EXPORT_FILE: 'Export PDF / Word',
            TEAM_WORK: 'Học nhóm & chia sẻ ghi chú',
            AI_PROGRESS_ANALYTICS: 'AI phân tích tiến độ học tập',
            TEAM_DASHBOARD: 'Dashboard tiến độ nhóm',
            GOOGLE_CALENDAR: 'Tích hợp Google Calendar',
            MANAGE_MEMBERS: 'Quản lý thành viên nhóm',
            CUSTOM_WORKSPACE: 'Custom workspace theo nhóm',
            PRIORITY_SUPPORT: 'Ưu tiên hỗ trợ khách hàng',
        }

        return featuresMap[id?.trim()] || id
    }

    const hienThiGioiHan = (value, suffix = '') => {
        if (value === null || value === undefined || Number(value) < 0) {
            return 'Vô hạn'
        }

        return `${value}${suffix}`
    }

    const laGoiHienTai = (goi) => {
        const currentPackage = nguoiDung?.packageName || 'FREE'
        return currentPackage.toUpperCase() === goi.name?.toUpperCase()
    }

    const formatGia = (price) => {
        if (price === null || price === undefined) return '$0'
        if (Number(price) === 0) return '$0'
        return `$${price}`
    }

    const sapXepGoi = (packages) => {
        const order = {
            FREE: 1,
            PRO: 2,
            PLUS: 3,
        }

        return [...packages].sort((a, b) => {
            const aOrder = order[a.name?.toUpperCase()] || 99
            const bOrder = order[b.name?.toUpperCase()] || 99
            return aOrder - bOrder
        })
    }

    const formatBytes = (bytes) => {
        const value = Number(bytes || 0)

        if (value < 1024) return `${value} B`

        const kb = value / 1024
        if (kb < 1024) return `${kb.toFixed(1)} KB`

        const mb = kb / 1024
        if (mb < 1024) return `${mb.toFixed(1)} MB`

        const gb = mb / 1024
        return `${gb.toFixed(2)} GB`
    }

    const tinhPhanTram = (used, max) => {
        if (max === null || max === undefined || Number(max) < 0) {
            return 100
        }

        if (!max || Number(max) <= 0) {
            return 0
        }

        return Math.min(100, Math.round((Number(used || 0) / Number(max)) * 100))
    }

    const renderCompareValue = (value) => {
        if (value === true) {
            return <span style={styles.compareYes}>✓</span>
        }

        if (value === false) {
            return <span style={styles.compareNo}>—</span>
        }

        return <span style={styles.compareText}>{value}</span>
    }

    const currentPackageName = nguoiDung?.packageName || 'FREE'
    const usedAi = nguoiDung?.aiUsedThisMonth || 0
    const maxAi = nguoiDung?.maxAiFormatsPerMonth
    const noteCount = nguoiDung?.noteCount || 0
    const maxNotes = nguoiDung?.maxNotes
    const storageUsedBytes = nguoiDung?.storageUsedBytes || 0
    const storageGb = nguoiDung?.storageGb
    const maxStorageBytes = storageGb === null || storageGb === undefined || storageGb < 0
        ? null
        : storageGb * 1024 * 1024 * 1024

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Spinner />
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>Nâng cấp Velora Premium</h2>

            <p style={styles.subtitle}>
                Chọn gói phù hợp để mở khóa các tính năng AI, quản lý deadline,
                flashcard và học nhóm.
            </p>

            <section style={styles.usageCard}>
                <div style={styles.usageHeader}>
                    <div>
                        <div style={styles.usageLabel}>Gói hiện tại</div>
                        <div style={styles.usagePackage}>{currentPackageName}</div>
                    </div>

                    {nguoiDung?.packageExpiryDate && (
                        <div style={styles.expiryText}>
                            Hết hạn: {new Date(nguoiDung.packageExpiryDate).toLocaleDateString('vi-VN')}
                        </div>
                    )}
                </div>

                <div style={styles.usageGrid}>
                    <UsageItem
                        label="AI tháng này"
                        value={`${usedAi}/${maxAi === null || maxAi === undefined || maxAi < 0 ? '∞' : maxAi} lượt`}
                        percent={tinhPhanTram(usedAi, maxAi)}
                    />

                    <UsageItem
                        label="Ghi chú"
                        value={`${noteCount}/${maxNotes === null || maxNotes === undefined || maxNotes < 0 ? '∞' : maxNotes}`}
                        percent={tinhPhanTram(noteCount, maxNotes)}
                    />

                    <UsageItem
                        label="Dung lượng"
                        value={`${formatBytes(storageUsedBytes)}/${maxStorageBytes ? formatBytes(maxStorageBytes) : 'Vô hạn'}`}
                        percent={maxStorageBytes ? tinhPhanTram(storageUsedBytes, maxStorageBytes) : 100}
                    />
                </div>
            </section>

            <div style={styles.toggleContainer}>
                <button
                    type="button"
                    style={{
                        ...styles.toggleBtn,
                        ...(billingCycle === 'monthly' ? styles.toggleActive : {}),
                    }}
                    onClick={() => setBillingCycle('monthly')}
                >
                    Thanh toán theo tháng
                </button>

                <button
                    type="button"
                    style={{
                        ...styles.toggleBtn,
                        ...(billingCycle === 'yearly' ? styles.toggleActive : {}),
                    }}
                    onClick={() => setBillingCycle('yearly')}
                >
                    Thanh toán theo năm
                </button>
            </div>

            <div style={styles.grid}>
                {sapXepGoi(danhSachGoi).map((goi) => {
                    const price = billingCycle === 'monthly'
                        ? goi.priceMonthly
                        : goi.priceYearly

                    const durationText = billingCycle === 'monthly'
                        ? '/ tháng'
                        : '/ năm'

                    const current = laGoiHienTai(goi)
                    const isFree = Number(goi.priceMonthly) === 0

                    return (
                        <div
                            key={goi.id}
                            style={{
                                ...styles.card,
                                ...(current ? styles.currentCard : {}),
                            }}
                        >
                            {current && (
                                <div style={styles.currentBadge}>
                                    Gói hiện tại
                                </div>
                            )}

                            <div style={styles.cardTop}>
                                <h3 style={styles.packageName}>{goi.name}</h3>

                                <div style={styles.priceRow}>
                                    <span style={styles.price}>{formatGia(price)}</span>
                                    <span style={styles.duration}>{durationText}</span>
                                </div>
                            </div>

                            <p style={styles.description}>
                                {goi.description || 'Gói dịch vụ tiêu chuẩn'}
                            </p>

                            <div style={styles.specsList}>
                                <div style={styles.specItem}>
                                    <span>📝 Ghi chú</span>
                                    <strong>{hienThiGioiHan(goi.maxNotes, ' ghi chú')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>🤖 AI</span>
                                    <strong>{hienThiGioiHan(goi.maxAiFormatsPerMonth, ' lần/tháng')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>💾 Lưu trữ</span>
                                    <strong>{hienThiGioiHan(goi.storageGb, ' GB')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>📱 Thiết bị</span>
                                    <strong>{hienThiGioiHan(goi.maxDevices, ' thiết bị')}</strong>
                                </div>
                            </div>

                            {goi.features && (
                                <div style={styles.featuresSection}>
                                    <div style={styles.featuresTitle}>
                                        Tính năng bao gồm:
                                    </div>

                                    <ul style={styles.featuresList}>
                                        {goi.features
                                            .split(',')
                                            .map(f => f.trim())
                                            .filter(Boolean)
                                            .map((featId) => (
                                                <li key={featId} style={styles.featureLi}>
                                                    ✓ {getFeatureLabel(featId)}
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                style={{
                                    ...styles.buyBtn,
                                    ...(current ? styles.currentBtn : {}),
                                }}
                                disabled={buyingId === goi.id || current}
                                onClick={() => handleMuaGoi(goi.id)}
                            >
                                {current
                                    ? 'Gói hiện tại'
                                    : buyingId === goi.id
                                        ? 'Đang chuyển hướng...'
                                        : isFree
                                            ? 'Kích hoạt miễn phí'
                                            : 'Đăng ký ngay'}
                            </button>
                        </div>
                    )
                })}
            </div>

            <section style={styles.compareSection}>
                <h3 style={styles.compareTitle}>So sánh tính năng</h3>

                <div style={styles.compareTableWrap}>
                    <table style={styles.compareTable}>
                        <thead>
                        <tr>
                            <th style={styles.compareTh}>Tính năng</th>
                            <th style={styles.compareTh}>Free</th>
                            <th style={styles.compareTh}>Pro</th>
                            <th style={styles.compareTh}>Plus</th>
                        </tr>
                        </thead>

                        <tbody>
                        {FEATURE_ROWS.map(row => (
                            <tr key={row.id}>
                                <td style={styles.compareTdFeature}>{row.label}</td>
                                <td style={styles.compareTd}>{renderCompareValue(row.free)}</td>
                                <td style={styles.compareTd}>{renderCompareValue(row.pro)}</td>
                                <td style={styles.compareTd}>{renderCompareValue(row.plus)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

function UsageItem({ label, value, percent }) {
    return (
        <div style={styles.usageItem}>
            <div style={styles.usageItemTop}>
                <span>{label}</span>
                <strong>{value}</strong>
            </div>

            <div style={styles.progressTrack}>
                <div
                    style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                    }}
                />
            </div>
        </div>
    )
}

const styles = {
    page: {
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px',
        boxSizing: 'border-box',
    },

    inner: {
        maxWidth: '1200px',
        margin: '0 auto',
        paddingBottom: '48px',
    },
    title: {
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '4px',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '24px',
        lineHeight: '1.5',
        textAlign: 'center',
    },
    usageCard: {
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
    },
    usageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    usageLabel: {
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    usagePackage: {
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--accent-blue)',
        marginTop: 2,
    },
    expiryText: {
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    usageGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
    },
    usageItem: {
        background: 'var(--bg-elevated)',
        borderRadius: 10,
        padding: 12,
        border: '0.5px solid var(--border)',
    },
    usageItemTop: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 12,
        color: 'var(--text-secondary)',
        marginBottom: 10,
    },
    progressTrack: {
        height: 7,
        background: 'var(--bg-surface)',
        borderRadius: 999,
        overflow: 'hidden',
        border: '0.5px solid var(--border)',
    },
    progressFill: {
        height: '100%',
        background: 'var(--accent-blue)',
        borderRadius: 999,
        transition: 'width 0.2s',
    },
    toggleContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px',
        flexWrap: 'wrap',
    },
    toggleBtn: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    toggleActive: {
        background: 'var(--accent-blue)',
        color: '#fff',
        borderColor: 'var(--accent-blue)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
    },
    card: {
        position: 'relative',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    },
    currentCard: {
        borderColor: 'var(--accent-blue)',
        boxShadow: '0 0 0 1px var(--accent-blue)',
    },
    currentBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        border: '0.5px solid var(--accent-blue)',
        fontWeight: 600,
    },
    cardTop: {
        borderBottom: '0.5px solid var(--border)',
        paddingBottom: '16px',
        textAlign: 'center',
    },
    packageName: {
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '12px',
    },
    priceRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '4px',
    },
    price: {
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--accent-blue)',
    },
    duration: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginLeft: '4px',
    },
    description: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        margin: '0',
        textAlign: 'center',
        minHeight: '40px',
    },
    specsList: {
        background: 'var(--bg-elevated)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    specItem: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
    },
    featuresSection: {
        flex: 1,
    },
    featuresTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '8px',
    },
    featuresList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: 180,
        overflowY: 'auto',
        paddingRight: 4,
    },
    featureLi: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.4',
    },
    buyBtn: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        marginTop: '12px',
        cursor: 'pointer',
    },
    currentBtn: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        border: '0.5px solid var(--border)',
        cursor: 'not-allowed',
    },
    compareSection: {
        marginTop: 34,
        marginBottom: 40,
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 18,
    },
    compareTitle: {
        margin: '0 0 14px',
        fontSize: 18,
        color: 'var(--text-primary)',
    },
    compareTableWrap: {
        overflowX: 'auto',
    },
    compareTable: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: 760,
    },
    compareTh: {
        textAlign: 'center',
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-primary)',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-elevated)',
    },
    compareTdFeature: {
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid var(--border)',
        textAlign: 'left',
        width: '40%',
    },
    compareTd: {
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid var(--border)',
        textAlign: 'center',
    },
    compareYes: {
        color: 'var(--accent-green)',
        fontWeight: 700,
        fontSize: 15,
    },
    compareNo: {
        color: 'var(--text-muted)',
        fontWeight: 600,
    },
    compareText: {
        color: 'var(--text-secondary)',
        fontWeight: 500,
    },
}