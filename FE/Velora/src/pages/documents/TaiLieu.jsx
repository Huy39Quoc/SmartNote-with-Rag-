import { useEffect, useState } from 'react'
import {
    IconFileText,
    IconMusic,
    IconTrash,
    IconSparkles,
    IconMessages,
    IconFile,
} from '@tabler/icons-react'
import documentApi from '../../lib/api/documentApi'
import scheduleApi from '../../lib/api/scheduleApi'
import UploadZone from '../../components/documents/UploadZone'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { hasFeature, getUpgradeMessage } from '../../utils/packageFeatures'

const TRANG_THAI = {
    PENDING: { nhan: 'Chờ xử lý', mau: 'var(--text-muted)' },
    PROCESSING: { nhan: 'Đang xử lý', mau: 'var(--accent-amber)' },
    DONE: { nhan: 'Hoàn tất', mau: 'var(--accent-green)' },
    FAILED: { nhan: 'Lỗi', mau: 'var(--accent-red)' },
}

export default function TaiLieu() {
    const { nguoiDung } = useAuthStore()

    const [danhSach, setDanhSach] = useState([])
    const [chon, setChon] = useState(null)
    const [dangTai, setDangTai] = useState(true)
    const [dangTaiLen, setDangTaiLen] = useState(false)
    const [ketQuaAi, setKetQuaAi] = useState(null)
    const [dangXuLyAi, setDangXuLyAi] = useState(false)
    const [cauHoi, setCauHoi] = useState('')
    const [phanHoiChat, setPhanHoiChat] = useState(null)
    const [lichGoiY, setLichGoiY] = useState(false)
    const [dangTrichLich, setDangTrichLich] = useState(false)

    const coUploadTaiLieu = hasFeature(nguoiDung, 'DOCUMENT_UPLOAD')
    const coAiAnalyze = hasFeature(nguoiDung, 'AI_ANALYZE')
    const coAiChat = hasFeature(nguoiDung, 'AI_CHAT')
    const coExtractSchedule = hasFeature(nguoiDung, 'EXTRACT_SCHEDULE')

    const tai = async () => {
        setDangTai(true)

        try {
            const { data } = await documentApi.layTatCa({ page: 0, size: 30 })
            setDanhSach(data.data?.content || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách tài liệu')
        } finally {
            setDangTai(false)
        }
    }

    useEffect(() => {
        tai()
    }, [])

    useEffect(() => {
        const xuLy = danhSach.filter(
            d => d.status === 'PROCESSING' || d.status === 'PENDING'
        )

        if (xuLy.length === 0) return

        const id = setInterval(async () => {
            for (const d of xuLy) {
                try {
                    const { data } = await documentApi.layTheoId(d.id)

                    setDanhSach(p => p.map(x => x.id === d.id ? data.data : x))

                    if (chon?.id === d.id) {
                        setChon(data.data)
                    }
                } catch {
                    // Bỏ qua lỗi polling tạm thời
                }
            }
        }, 3000)

        return () => clearInterval(id)
    }, [danhSach, chon?.id])

    const taiLen = async (file) => {
        if (!coUploadTaiLieu) {
            toast.error(getUpgradeMessage('DOCUMENT_UPLOAD'))
            return
        }

        setDangTaiLen(true)

        try {
            const { data } = await documentApi.taiLen(file, null)
            setDanhSach(p => [data.data, ...p])
            toast.success(`Đã tải lên "${file.name}"`)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tải lên thất bại')
        } finally {
            setDangTaiLen(false)
        }
    }

    const phanTich = async () => {
        if (!coAiAnalyze) {
            toast.error(getUpgradeMessage('AI_ANALYZE'))
            return
        }

        if (!chon || chon.status !== 'DONE') return

        setDangXuLyAi(true)
        setKetQuaAi(null)
        setPhanHoiChat(null)

        try {
            const { data } = await documentApi.phanTich(chon.id)
            setKetQuaAi(data.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI không phản hồi')
        } finally {
            setDangXuLyAi(false)
        }
    }

    const phanTichAmThanh = async () => {
        if (!coAiAnalyze) {
            toast.error(getUpgradeMessage('AI_ANALYZE'))
            return
        }

        if (!chon || chon.status !== 'DONE') return

        setDangXuLyAi(true)
        setKetQuaAi(null)
        setPhanHoiChat(null)

        try {
            const { data } = await documentApi.phanTichAmThanh(chon.id, { createNote: true })

            setKetQuaAi({
                summary: data.data.structuredNote,
                keyPoints: [],
                amThanh: true,
                noteTitle: data.data.noteTitle,
            })

            toast.success('Đã phân tích âm thanh và tạo ghi chú!')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Phân tích âm thanh thất bại')
        } finally {
            setDangXuLyAi(false)
        }
    }

    const hoiDap = async () => {
        if (!coAiChat) {
            toast.error(getUpgradeMessage('AI_CHAT'))
            return
        }

        if (!chon || !cauHoi.trim()) return

        setDangXuLyAi(true)

        try {
            const { data } = await documentApi.hoiDap(chon.id, {
                question: cauHoi.trim(),
            })

            setPhanHoiChat(data.data)
            setCauHoi('')
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI không phản hồi')
        } finally {
            setDangXuLyAi(false)
        }
    }

    const coTheTrichLich = (text) => {
        if (!text) return false

        return /\b(?:\d{1,2}[:.][0-5]\d|[0-2]?\d\s*giờ|ngày\s*\d{1,2}|thứ\s*(?:hai|ba|tư|năm|sáu|bảy)|deadline|hẹn)\b/i.test(text)
    }

    useEffect(() => {
        const text = ketQuaAi?.summary || phanHoiChat?.answer || ''

        setLichGoiY(
            coExtractSchedule &&
            coTheTrichLich(text)
        )
    }, [ketQuaAi, phanHoiChat, coExtractSchedule])

    const trichXuatLich = async () => {
        if (!coExtractSchedule) {
            toast.error(getUpgradeMessage('EXTRACT_SCHEDULE'))
            return
        }

        const text = ketQuaAi?.summary || phanHoiChat?.answer || ''

        if (!text.trim()) return

        setDangTrichLich(true)

        try {
            const { data } = await scheduleApi.trichXuatTuGhiChu({
                content: text,
            })

            toast.success(`AI đã tìm ${data.data?.totalFound || 0} lịch / công việc`)
            setLichGoiY(false)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể trích xuất lịch từ nội dung tài liệu')
        } finally {
            setDangTrichLich(false)
        }
    }

    const xoa = async (id) => {
        if (!window.confirm('Xoá tài liệu này?')) return

        try {
            await documentApi.xoa(id)

            setDanhSach(p => p.filter(d => d.id !== id))

            if (chon?.id === id) {
                setChon(null)
                setKetQuaAi(null)
                setPhanHoiChat(null)
            }

            toast.success('Đã xoá')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa tài liệu thất bại')
        }
    }

    const dungLuong = bytes => {
        if (!bytes) return ''

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`
        }

        return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    return (
        <div style={styles.wrap}>
            <div style={styles.left}>
                <div style={styles.uploadHeader}>
                    <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                        Tải lên tài liệu
                    </p>

                    {coUploadTaiLieu ? (
                        <UploadZone onUpload={taiLen} dangTaiLen={dangTaiLen} />
                    ) : (
                        <div style={styles.lockedBox}>
                            Gói hiện tại chưa hỗ trợ upload tài liệu.
                            Vui lòng nâng cấp để sử dụng tính năng này.
                        </div>
                    )}
                </div>

                <div style={styles.listArea}>
                    {dangTai ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                            <Spinner />
                        </div>
                    ) : danhSach.length === 0 ? (
                        <EmptyState
                            icon={IconFile}
                            title="Chưa có tài liệu"
                            desc="Tải lên PDF, DOCX, TXT hoặc audio"
                        />
                    ) : (
                        danhSach.map(d => {
                            const DocIcon = d.fileType === 'AUDIO' ? IconMusic : IconFileText
                            const tt = TRANG_THAI[d.status] || TRANG_THAI.PENDING

                            return (
                                <div
                                    key={d.id}
                                    onClick={() => {
                                        setChon(d)
                                        setKetQuaAi(null)
                                        setPhanHoiChat(null)
                                        setLichGoiY(false)
                                    }}
                                    style={{
                                        ...styles.docRow,
                                        background: chon?.id === d.id
                                            ? 'var(--bg-selected)'
                                            : 'transparent',
                                    }}
                                >
                                    <DocIcon
                                        size={16}
                                        style={{
                                            color: d.fileType === 'AUDIO'
                                                ? 'var(--accent-purple)'
                                                : 'var(--accent-blue-dim)',
                                            flexShrink: 0,
                                        }}
                                    />

                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={styles.docName}>{d.originalName}</div>

                                        <div style={styles.docMeta}>
                                            <span style={{ color: tt.mau }}>{tt.nhan}</span>
                                            {d.fileSize && (
                                                <span style={{ color: 'var(--text-faint)' }}>
                          {dungLuong(d.fileSize)}
                        </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        className="btn-ghost"
                                        onClick={e => {
                                            e.stopPropagation()
                                            xoa(d.id)
                                        }}
                                        style={{ padding: 3 }}
                                    >
                                        <IconTrash size={11} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div style={styles.right}>
                {!chon ? (
                    <EmptyState
                        icon={IconFile}
                        title="Chọn tài liệu để xem"
                        desc="Phân tích nội dung bằng AI hoặc hỏi đáp trực tiếp"
                    />
                ) : (
                    <div style={styles.detailWrap}>
                        <div style={styles.docHeader}>
                            {chon.fileType === 'AUDIO' ? (
                                <IconMusic size={18} style={{ color: 'var(--accent-purple)' }} />
                            ) : (
                                <IconFileText size={18} style={{ color: 'var(--accent-blue-dim)' }} />
                            )}

                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>
                                    {chon.originalName}
                                </div>

                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {TRANG_THAI[chon.status]?.nhan} · {dungLuong(chon.fileSize)}
                                </div>
                            </div>

                            {chon.status === 'DONE' && coAiAnalyze && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {chon.fileType === 'AUDIO' ? (
                                        <button
                                            className="btn-ai"
                                            onClick={phanTichAmThanh}
                                            disabled={dangXuLyAi}
                                        >
                                            {dangXuLyAi ? <Spinner size={12} /> : <IconSparkles size={12} />}
                                            Phân tích & tạo ghi chú
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-ai"
                                            onClick={phanTich}
                                            disabled={dangXuLyAi}
                                        >
                                            {dangXuLyAi ? <Spinner size={12} /> : <IconSparkles size={12} />}
                                            Phân tích AI
                                        </button>
                                    )}
                                </div>
                            )}

                            {chon.status === 'DONE' && !coAiAnalyze && (
                                <div style={styles.smallLockedText}>
                                    Gói hiện tại chưa hỗ trợ phân tích AI
                                </div>
                            )}

                            {(chon.status === 'PENDING' || chon.status === 'PROCESSING') && (
                                <div style={styles.processingText}>
                                    <Spinner size={12} /> Đang xử lý tài liệu...
                                </div>
                            )}
                        </div>

                        <div style={styles.contentArea}>
                            {ketQuaAi && (
                                <div style={styles.aiResult}>
                                    <div style={styles.aiLabel}>
                                        <IconSparkles size={12} style={{ color: 'var(--accent-blue-dim)' }} />
                                        {ketQuaAi.amThanh ? 'Ghi chú từ âm thanh' : 'Phân tích AI'}
                                    </div>

                                    {ketQuaAi.noteTitle && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>Tiêu đề ghi chú</div>
                                            <p style={{ fontWeight: 500 }}>{ketQuaAi.noteTitle}</p>
                                        </div>
                                    )}

                                    {ketQuaAi.summary && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>Tóm tắt</div>
                                            <p style={styles.summaryText}>{ketQuaAi.summary}</p>
                                        </div>
                                    )}

                                    {ketQuaAi.keyPoints?.length > 0 && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>Điểm chính</div>
                                            {ketQuaAi.keyPoints.map((k, i) => (
                                                <p key={i} style={{ padding: '2px 0' }}>
                                                    • {k}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {ketQuaAi.keywords?.length > 0 && (
                                        <div>
                                            <div style={styles.subLabel}>Từ khoá</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {ketQuaAi.keywords.map((k, i) => (
                                                    <span key={i} className="tag tag-blue">
                            {k}
                          </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {lichGoiY && (
                                <div style={styles.schedulePrompt}>
                                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                                        AI phát hiện thông tin lịch / thời gian trong nội dung.
                                        Bạn có muốn tạo công việc / lịch từ nội dung này?
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            className="btn-primary"
                                            onClick={trichXuatLich}
                                            disabled={dangTrichLich}
                                            style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                        >
                                            {dangTrichLich ? 'Đang xử lý...' : 'Tạo lịch'}
                                        </button>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setLichGoiY(false)}
                                            style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                        >
                                            Không cần
                                        </button>
                                    </div>
                                </div>
                            )}

                            {chon.status === 'DONE' && !ketQuaAi && coAiAnalyze && (
                                <div style={styles.hintText}>
                                    Nhấn "Phân tích AI" để xem tóm tắt, hoặc hỏi trực tiếp bên dưới.
                                </div>
                            )}

                            {chon.status === 'DONE' && !coAiAnalyze && coAiChat && (
                                <div style={styles.hintText}>
                                    Gói hiện tại chưa hỗ trợ phân tích AI, nhưng bạn vẫn có thể hỏi đáp với tài liệu bên dưới.
                                </div>
                            )}

                            {chon.status === 'DONE' && !coAiAnalyze && !coAiChat && (
                                <div style={styles.lockedBox}>
                                    Gói hiện tại chưa hỗ trợ các tính năng AI cho tài liệu.
                                    Vui lòng nâng cấp để phân tích và hỏi đáp với tài liệu.
                                </div>
                            )}

                            {phanHoiChat && (
                                <div style={{ ...styles.aiResult, marginTop: 12 }}>
                                    <div style={styles.aiLabel}>
                                        <IconMessages size={12} style={{ color: 'var(--accent-blue-dim)' }} />
                                        Câu trả lời
                                    </div>

                                    <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                        {phanHoiChat.answer}
                                    </p>
                                </div>
                            )}
                        </div>

                        {chon.status === 'DONE' && coAiChat && (
                            <div style={styles.chatInput}>
                                <input
                                    value={cauHoi}
                                    onChange={e => setCauHoi(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && hoiDap()}
                                    placeholder={`Hỏi về "${chon.originalName}"...`}
                                    style={{ fontSize: 12 }}
                                />

                                <button
                                    className="btn-primary"
                                    onClick={hoiDap}
                                    disabled={!cauHoi.trim() || dangXuLyAi}
                                    style={{
                                        padding: '6px 12px',
                                        flexShrink: 0,
                                    }}
                                >
                                    {dangXuLyAi ? <Spinner size={12} /> : 'Hỏi'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    wrap: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    left: {
        width: 280,
        flexShrink: 0,
        borderRight: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    right: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    uploadHeader: {
        padding: '12px 12px 8px',
        borderBottom: '.5px solid var(--border)',
    },
    listArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '6px 8px',
    },
    docRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        marginBottom: 2,
    },
    docName: {
        fontSize: 12,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    docMeta: {
        fontSize: 10,
        display: 'flex',
        gap: 6,
        marginTop: 2,
    },
    detailWrap: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    docHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderBottom: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
    },
    contentArea: {
        flex: 1,
        overflowY: 'auto',
        padding: 16,
    },
    aiResult: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        padding: 14,
        fontSize: 13,
    },
    aiLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: 'var(--accent-blue-dim)',
        marginBottom: 10,
        fontWeight: 500,
    },
    subLabel: {
        fontSize: 10,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '.05em',
        marginBottom: 5,
    },
    summaryText: {
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
    },
    schedulePrompt: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
    },
    chatInput: {
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        borderTop: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
    },
    lockedBox: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    smallLockedText: {
        fontSize: 11,
        color: 'var(--text-muted)',
        padding: '5px 8px',
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
    },
    processingText: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--accent-amber)',
    },
    hintText: {
        color: 'var(--text-faint)',
        fontSize: 12,
        textAlign: 'center',
        padding: '20px 0',
    },
}