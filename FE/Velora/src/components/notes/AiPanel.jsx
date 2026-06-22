import { useEffect, useMemo, useState } from 'react'
import { IconSparkles, IconX, IconCheck, IconLoader2 } from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { hasFeature } from '../../utils/packageFeatures'

const HANH_DONG = [
    {
        key: 'SUMMARIZE',
        nhan: 'Tóm tắt',
        features: ['AI_SUMMARY_BASIC'],
    },
    {
        key: 'STRUCTURE',
        nhan: 'Cải thiện cấu trúc',
        features: ['AI_NOTE_FORMAT'],
    },
    {
        key: 'CREATE_CHECKLIST',
        nhan: 'Tạo checklist',
        features: ['AI_NOTE_FORMAT', 'CHECKLIST_BASIC'],
    },
    {
        key: 'SUGGEST_TITLE',
        nhan: 'Đề xuất tiêu đề',
        features: ['AI_NOTE_FORMAT'],
    },
]

export default function AiPanel({ noteId, content, title, onApply, onDong }) {
    const { nguoiDung } = useAuthStore()

    const hanhDongKhaDung = useMemo(() => {
        return HANH_DONG.filter(action =>
            action.features.every(feature => hasFeature(nguoiDung, feature))
        )
    }, [nguoiDung?.packageFeatures, nguoiDung?.role])

    const [loading, setLoading] = useState(false)
    const [ketQua, setKetQua] = useState(null)
    const [hanhDong, setHanhDong] = useState('')

    const actionDangChon = hanhDongKhaDung.find(action => action.key === hanhDong)
        ? hanhDong
        : hanhDongKhaDung[0]?.key || ''

    useEffect(() => {
        if (!hanhDong && hanhDongKhaDung.length > 0) {
            setHanhDong(hanhDongKhaDung[0].key)
            return
        }

        const actionConHopLe = hanhDongKhaDung.some(action => action.key === hanhDong)

        if (!actionConHopLe) {
            setHanhDong(hanhDongKhaDung[0]?.key || '')
            setKetQua(null)
        }
    }, [hanhDong, hanhDongKhaDung])

    const xuLy = async () => {
        if (!content?.trim()) {
            toast.error('Ghi chú đang trống')
            return
        }

        if (!actionDangChon) {
            toast.error('Gói hiện tại chưa hỗ trợ tính năng AI ghi chú.')
            return
        }

        setLoading(true)
        setKetQua(null)

        try {
            const { data } = await noteApi.caiThienAi(noteId, {
                content,
                title,
                action: actionDangChon,
            })

            setKetQua(data.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI không phản hồi, thử lại sau')
        } finally {
            setLoading(false)
        }
    }

    const apDung = async () => {
        if (!ketQua) return

        try {
            await onApply?.(ketQua)
            onDong?.()
            toast.success('Đã áp dụng gợi ý AI')
        } catch (error) {
            toast.error(error?.message || 'Không thể áp dụng gợi ý AI')
        }
    }

    const boQua = () => {
        setKetQua(null)
    }

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconSparkles size={13} style={{ color: 'var(--accent-blue-dim)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Trợ lý AI</span>
        </span>

                <button className="btn-ghost" onClick={onDong} style={{ padding: 3 }}>
                    <IconX size={13} />
                </button>
            </div>

            <div style={styles.body}>
                {hanhDongKhaDung.length > 0 ? (
                    <div style={styles.actions}>
                        {hanhDongKhaDung.map(h => (
                            <button
                                key={h.key}
                                onClick={() => {
                                    setHanhDong(h.key)
                                    setKetQua(null)
                                }}
                                className={actionDangChon === h.key ? 'btn-ai' : 'btn-ghost'}
                                style={{ fontSize: 11, padding: '3px 9px' }}
                            >
                                {h.nhan}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={styles.lockedBox}>
                        Gói hiện tại chưa hỗ trợ AI ghi chú. Vui lòng nâng cấp gói để sử dụng các tính năng AI.
                    </div>
                )}

                <button
                    className="btn-primary"
                    onClick={xuLy}
                    disabled={loading || hanhDongKhaDung.length === 0}
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '7px',
                        fontSize: 12,
                        opacity: hanhDongKhaDung.length === 0 ? 0.6 : 1,
                        cursor: hanhDongKhaDung.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? (
                        <>
                            <IconLoader2 size={13} className="animate-spin" />
                            Đang xử lý...
                        </>
                    ) : (
                        '▶ Chạy AI'
                    )}
                </button>

                {ketQua && (
                    <div style={styles.result}>
                        {ketQua.suggestedTitle && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Tiêu đề gợi ý</div>
                                <div style={styles.resultText}>{ketQua.suggestedTitle}</div>
                            </div>
                        )}

                        {ketQua.summary && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Tóm tắt</div>
                                <div style={styles.resultText}>{ketQua.summary}</div>
                            </div>
                        )}

                        {ketQua.checklist?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Checklist</div>
                                {ketQua.checklist.map((c, i) => (
                                    <div key={i} style={styles.checkItem}>
                                        ☐ {c}
                                    </div>
                                ))}
                            </div>
                        )}

                        {ketQua.improvedContent && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Nội dung đã cải thiện</div>
                                <div style={{ ...styles.resultText, maxHeight: 120, overflow: 'auto' }}>
                                    {ketQua.improvedContent}
                                </div>
                            </div>
                        )}

                        {ketQua.improvedContent ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn-primary"
                                    onClick={apDung}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                >
                                    <IconCheck size={12} /> Chấp nhận AI
                                </button>

                                <button
                                    className="btn-ghost"
                                    onClick={boQua}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                >
                                    Giữ nguyên
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn-primary"
                                onClick={apDung}
                                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                            >
                                <IconCheck size={12} /> Áp dụng
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    panel: {
        width: 260,
        background: 'var(--bg-surface)',
        borderLeft: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)',
    },
    body: {
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
        flex: 1,
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
    },
    lockedBox: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    result: {
        background: 'var(--bg-elevated)',
        borderRadius: 6,
        padding: 10,
        border: '.5px solid var(--border)',
    },
    resultLabel: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    resultText: {
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    checkItem: {
        fontSize: 12,
        padding: '2px 0',
        color: 'var(--text-secondary)',
    },
}