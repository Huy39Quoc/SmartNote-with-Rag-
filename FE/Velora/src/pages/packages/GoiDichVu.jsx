import { useEffect, useState } from 'react'
import packageApi from '../../lib/api/packageApi'
import Spinner from '../../components/ui/Spinner'

export default function GoiDichVu() {
    const [danhSachGoi, setDanhSachGoi] = useState([])
    const [loading, setLoading] = useState(true)
    const [buyingId, setBuyingId] = useState(null)
    // Thêm bộ lọc chu kỳ: 'monthly' hoặc 'yearly' để người dùng lựa chọn
    const [billingCycle, setBillingCycle] = useState('monthly')

    const taiGoiDichVu = async () => {
        try {
            const { data } = await packageApi.layDanhSachGoiHoatDong()
            // data.data hoặc data tùy thuộc vào cấu trúc ApiResponse từ Backend
            setDanhSachGoi(data.data || data || [])
        } catch (error) {
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
            // Có thể truyền thêm billingCycle nếu backend hỗ trợ phân biệt mua tháng/năm
            const { data } = await packageApi.muaGoiDichVu(id)
            if (data.data?.paymentUrl) {
                window.location.href = data.data.paymentUrl
            } else if (data?.paymentUrl) {
                window.location.href = data.paymentUrl
            } else {
                alert('Không thể tạo liên kết thanh toán!');
            }
        } catch (error) {
            alert('Đã xảy ra lỗi khi kết nối tới cổng thanh toán')
        } finally {
            setBuyingId(null)
        }
    }

    // Hàm chuyển đổi các mã tính năng viết tắt sang nhãn hiển thị trực quan giống bên Admin
    const getFeatureLabel = (id) => {
        const featuresMap = {
            'TAG_SUBJECT': 'Tag môn học / chủ đề',
            'CHECKLIST_BASIC': 'Checklist công việc cơ bản',
            'AI_FORMAT': 'AI format ghi chú',
            'AI_SUMMARY_BASIC': 'Tóm tắt AI cơ bản',
            'AI_SUMMARY_ADVANCED': 'Tóm tắt & phân tích AI nâng cao',
            'AI_FLASHCARD': 'Flashcard AI tự động',
            'DEADLINE_MANAGEMENT': 'Quản lý deadline thông minh',
            'PRIORITY_SUGGESTION': 'Gợi ý ưu tiên công việc',
            'EXPORT_FILE': 'Export PDF / Word',
            'TEAM_WORK': 'Học nhóm & chia sẻ ghi chú',
            'AI_PROGRESS_ANALYTICS': 'AI phân tích tiến độ học tập',
            'TEAM_DASHBOARD': 'Dashboard tiến độ nhóm',
            'GOOGLE_CALENDAR': 'Tích hợp Google Calendar',
            'MANAGE_MEMBERS': 'Quản lý thành viên nhóm',
            'CUSTOM_WORKSPACE': 'Custom workspace theo nhóm',
            'PRIORITY_SUPPORT': 'Ưu tiên hỗ trợ khách hàng'
        };
        return featuresMap[id] || id;
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>Nâng cấp Velora Premium</h2>
            <p style={styles.subtitle}>Mở khóa các tính năng nâng cao và tối đa hóa năng suất của bạn</p>

            {/* Thanh chọn chu kỳ thanh toán */}
            <div style={styles.toggleContainer}>
                <button 
                    style={{...styles.toggleBtn, ...(billingCycle === 'monthly' ? styles.toggleActive : {})}}
                    onClick={() => setBillingCycle('monthly')}
                >
                    Thanh toán theo Tháng
                </button>
                <button 
                    style={{...styles.toggleBtn, ...(billingCycle === 'yearly' ? styles.toggleActive : {})}}
                    onClick={() => setBillingCycle('yearly')}
                >
                    Thanh toán theo Năm (Tiết kiệm)
                </button>
            </div>

            <div style={styles.grid}>
                {danhSachGoi.map((goi) => {
                    const price = billingCycle === 'monthly' ? goi.priceMonthly : goi.priceYearly;
                    const durationText = billingCycle === 'monthly' ? '/ tháng' : '/ năm';

                    return (
                        <div key={goi.id} style={styles.card}>
                            <div style={styles.cardTop}>
                                <h3 style={styles.packageName}>{goi.name}</h3>
                                <div style={styles.priceRow}>
                                    <span style={styles.price}>${price}</span>
                                    <span style={styles.duration}>{durationText}</span>
                                </div>
                            </div>
                            
                            <p style={styles.description}>{goi.description || 'Gói dịch vụ tiêu chuẩn'}</p>
                            
                            {/* Danh sách hạn ngạch tài nguyên */}
                            <div style={styles.specsList}>
                                <div style={styles.specItem}>📝 Ghi chú: <strong>{goi.maxNotes === -1 ? 'Vô hạn' : `${goi.maxNotes} file`}</strong></div>
                                <div style={styles.specItem}>🤖 AI Format: <strong>{goi.maxAiFormatsPerMonth === -1 ? 'Vô hạn' : `${goi.maxAiFormatsPerMonth} lần/tháng`}</strong></div>
                                <div style={styles.specItem}>💾 Lưu trữ: <strong>{goi.storageGb} GB</strong></div>
                                <div style={styles.specItem}>📱 Thiết bị: <strong>{goi.maxDevices === -1 ? 'Không giới hạn' : `${goi.maxDevices} máy`}</strong></div>
                            </div>

                            {/* Danh sách các đặc quyền tính năng bổ sung */}
                            {goi.features && (
                                <div style={styles.featuresSection}>
                                    <div style={styles.featuresTitle}>Tính năng bao gồm:</div>
                                    <ul style={styles.featuresList}>
                                        {goi.features.split(',').map((featId, idx) => (
                                            <li key={idx} style={styles.featureLi}>
                                                ✓ {getFeatureLabel(featId)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                style={styles.buyBtn}
                                disabled={buyingId === goi.id}
                                onClick={() => handleMuaGoi(goi.id)}
                            >
                                {buyingId === goi.id ? 'Đang chuyển hướng...' : 'Đăng ký ngay'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

const styles = {
    page: {
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    title: {
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '4px',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '32px',
        lineHeight: '1.5',
        textAlign: 'center'
    },
    toggleContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px'
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
        transition: 'all 0.2s'
    },
    toggleActive: {
        background: 'var(--accent-blue)',
        color: '#fff',
        borderColor: 'var(--accent-blue)'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
    },
    card: {
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    },
    cardTop: {
        borderBottom: '0.5px solid var(--border)',
        paddingBottom: '16px',
        textAlign: 'center'
    },
    packageName: {
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '12px'
    },
    priceRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '4px'
    },
    price: {
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--accent-blue)'
    },
    duration: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginLeft: '4px'
    },
    description: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        margin: '0',
        textAlign: 'center',
        minHeight: '40px'
    },
    specsList: {
        background: 'var(--bg-elevated)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    specItem: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between'
    },
    featuresSection: {
        flex: 1
    },
    featuresTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '8px'
    },
    featuresList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    featureLi: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.4'
    },
    buyBtn: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        marginTop: '12px',
        cursor: 'pointer'
    }
}