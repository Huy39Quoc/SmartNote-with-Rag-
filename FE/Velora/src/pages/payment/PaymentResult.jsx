import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    IconCircleCheck,
    IconCircleX,
    IconAlertTriangle,
    IconArrowLeft,
    IconRefresh,
} from '@tabler/icons-react'

export default function PaymentResult() {
    const [params] = useSearchParams()
    const navigate = useNavigate()

    const status = params.get('status') || 'unknown'

    const result = useMemo(() => {
        if (status === 'success') {
            return {
                icon: IconCircleCheck,
                title: 'Thanh toán thành công',
                desc: 'Gói dịch vụ của bạn đã được kích hoạt. Bạn có thể quay lại hệ thống để sử dụng các tính năng mới.',
                color: 'var(--accent-green)',
                actionText: 'Về gói dịch vụ',
                actionPath: '/service-packages'
            }
        }

        if (status === 'failed') {
            return {
                icon: IconCircleX,
                title: 'Thanh toán chưa thành công',
                desc: 'Bạn đã hủy giao dịch hoặc ngân hàng từ chối thanh toán. Gói dịch vụ chưa được kích hoạt.',
                color: 'var(--accent-red)',
                actionText: 'Thử thanh toán lại',
                actionPath: '/service-packages'
            }
        }

        if (status === 'invalid_signature') {
            return {
                icon: IconAlertTriangle,
                title: 'Chữ ký thanh toán không hợp lệ',
                desc: 'VNPay trả về giao dịch nhưng hệ thống không xác thực được chữ ký. Vui lòng kiểm tra lại cấu hình TMN Code và Hash Secret.',
                color: 'var(--accent-amber)',
                actionText: 'Về gói dịch vụ',
                actionPath: '/service-packages'
            }
        }

        if (status === 'transaction_not_found') {
            return {
                icon: IconAlertTriangle,
                title: 'Không tìm thấy giao dịch',
                desc: 'Hệ thống không tìm thấy mã giao dịch tương ứng. Vui lòng tạo giao dịch mới.',
                color: 'var(--accent-amber)',
                actionText: 'Tạo giao dịch mới',
                actionPath: '/service-packages'
            }
        }

        return {
            icon: IconAlertTriangle,
            title: 'Không xác định được trạng thái thanh toán',
            desc: 'Vui lòng quay lại trang gói dịch vụ và kiểm tra lại trạng thái tài khoản.',
            color: 'var(--accent-amber)',
            actionText: 'Về gói dịch vụ',
            actionPath: '/service-packages'
        }
    }, [status])

    const Icon = result.icon

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={{ ...styles.iconBox, color: result.color }}>
                    <Icon size={46} />
                </div>

                <h2 style={styles.title}>
                    {result.title}
                </h2>

                <p style={styles.desc}>
                    {result.desc}
                </p>

                <div style={styles.statusBox}>
                    <span style={styles.statusLabel}>Trạng thái:</span>
                    <span style={styles.statusValue}>{status}</span>
                </div>

                <div style={styles.actions}>
                    <button
                        className="btn-primary"
                        onClick={() => navigate(result.actionPath)}
                    >
                        <IconRefresh size={14} />
                        {result.actionText}
                    </button>

                    <button
                        className="btn-ghost"
                        onClick={() => navigate('/overview')}
                    >
                        <IconArrowLeft size={14} />
                        Về tổng quan
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: 460,
        maxWidth: '100%',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        padding: 28,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
    },
    iconBox: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 10,
    },
    desc: {
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        marginBottom: 18,
    },
    statusBox: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
        fontSize: 12,
    },
    statusLabel: {
        color: 'var(--text-muted)',
    },
    statusValue: {
        color: 'var(--text-primary)',
        fontWeight: 700,
    },
    actions: {
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
}