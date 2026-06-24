import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    IconCards,
    IconFile,
    IconFileText,
    IconMessages,
    IconMusic,
    IconShare,
    IconSparkles,
    IconTrash,
    IconUserPlus,
    IconX,
} from '@tabler/icons-react'
import documentApi from '../../lib/api/documentApi'
import scheduleApi from '../../lib/api/scheduleApi'
import UploadZone from '../../components/documents/UploadZone'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { getUpgradeMessage, hasFeature } from '../../utils/packageFeatures'
import flashcardApi from '../../lib/api/flashcardApi'

const TRANG_THAI = {
    PENDING: {
        nhan: 'Chờ xử lý',
        mau: 'var(--text-muted)',
    },
    PROCESSING: {
        nhan: 'Đang xử lý',
        mau: 'var(--accent-amber)',
    },
    DONE: {
        nhan: 'Hoàn tất',
        mau: 'var(--accent-green)',
    },
    SUCCESS: {
        nhan: 'Hoàn tất',
        mau: 'var(--accent-green)',
    },
    FAILED: {
        nhan: 'Lỗi',
        mau: 'var(--accent-red)',
    },
}

export default function TaiLieu() {
    const { nguoiDung, layThongTin } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [danhSach, setDanhSach] = useState([])
    const [chon, setChon] = useState(null)

    const [dangTai, setDangTai] = useState(true)
    const [dangTaiLen, setDangTaiLen] = useState(false)

    const [ketQuaAi, setKetQuaAi] = useState(null)
    const [dangXuLyAi, setDangXuLyAi] = useState(false)

    const [cauHoi, setCauHoi] = useState('')
    const [phanHoiChat, setPhanHoiChat] = useState(null)
    const [lichSuChatTaiLieu, setLichSuChatTaiLieu] = useState([])

    const [lichGoiY, setLichGoiY] = useState(false)
    const [dangTrichLich, setDangTrichLich] = useState(false)

    const [dangTaoFlashcard, setDangTaoFlashcard] = useState(false)

    const [hienShareTaiLieu, setHienShareTaiLieu] = useState(false)
    const [documentShareEmail, setDocumentShareEmail] = useState('')
    const [documentSharePermission, setDocumentSharePermission] = useState('VIEW')
    const [documentShareList, setDocumentShareList] = useState([])
    const [dangShareDocument, setDangShareDocument] = useState(false)

    const dangHoiTaiLieuRef = useRef(false)

    const coUploadTaiLieu = hasFeature(nguoiDung, 'DOCUMENT_UPLOAD')
    const coAiAnalyze = hasFeature(nguoiDung, 'AI_ANALYZE')
    const coAiChat = hasFeature(nguoiDung, 'AI_CHAT')
    const coExtractSchedule = hasFeature(nguoiDung, 'EXTRACT_SCHEDULE')
    const coAiFlashcard = hasFeature(nguoiDung, 'AI_FLASHCARD')
    const coTeamWork = hasFeature(nguoiDung, 'TEAM_WORK')

    const selectedDocumentId = searchParams.get('documentId')

    const coDangTraLoiTaiLieu =
        dangXuLyAi ||
        dangHoiTaiLieuRef.current ||
        lichSuChatTaiLieu.some(item => item.loading)

    const isDocumentReady = (doc) => {
        return doc?.status === 'DONE' || doc?.status === 'SUCCESS'
    }

    const dungLuong = (bytes) => {
        const value = Number(bytes || 0)

        if (value < 1024) return `${value} B`

        const kb = value / 1024
        if (kb < 1024) return `${kb.toFixed(1)} KB`

        const mb = kb / 1024
        if (mb < 1024) return `${mb.toFixed(1)} MB`

        const gb = mb / 1024
        return `${gb.toFixed(2)} GB`
    }

    const getDocumentChatStorageKey = (documentId = chon?.id) => {
        const userKey = nguoiDung?.userId || nguoiDung?.id || 'me'
        return `velora_document_chat_${userKey}_${documentId}`
    }

    const resetRightPanel = () => {
        setKetQuaAi(null)
        setPhanHoiChat(null)
        setLichGoiY(false)
        setHienShareTaiLieu(false)
        setDocumentShareEmail('')
        setDocumentSharePermission('VIEW')
        setDocumentShareList([])
    }

    const chonTaiLieu = (doc) => {
        setChon(doc)
        resetRightPanel()
    }

    const tai = async () => {
        setDangTai(true)

        try {
            const { data } = await documentApi.layTatCa({
                page: 0,
                size: 30,
            })

            setDanhSach(data.data?.content || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách tài liệu')
        } finally {
            setDangTai(false)
        }
    }

    const taiTaiLieuTuLink = async () => {
        if (!selectedDocumentId) return

        try {
            const { data } = await documentApi.layTheoId(selectedDocumentId)
            const doc = {
                ...data.data,
                _shared: true,
            }

            setChon(doc)

            setDanhSach(prev => {
                const existed = prev.some(item => item.id === doc.id)

                if (existed) {
                    return prev.map(item =>
                        item.id === doc.id
                            ? {
                                ...item,
                                ...doc,
                            }
                            : item
                    )
                }

                return [doc, ...prev]
            })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể mở tài liệu được chia sẻ')
        }
    }

    const xoaLichSuChatTaiLieu = () => {
        if (!chon?.id) return

        localStorage.removeItem(getDocumentChatStorageKey(chon.id))
        setLichSuChatTaiLieu([])
        setPhanHoiChat(null)
        toast.success('Đã xóa lịch sử hỏi đáp')
    }

    useEffect(() => {
        tai()
    }, [])

    useEffect(() => {
        taiTaiLieuTuLink()
    }, [selectedDocumentId])

    useEffect(() => {
        if (!chon?.id) {
            setLichSuChatTaiLieu([])
            return
        }

        try {
            const raw = localStorage.getItem(getDocumentChatStorageKey(chon.id))
            const saved = raw ? JSON.parse(raw) : []

            setLichSuChatTaiLieu(Array.isArray(saved) ? saved : [])
        } catch {
            setLichSuChatTaiLieu([])
        }
    }, [chon?.id, nguoiDung?.userId, nguoiDung?.id])

    useEffect(() => {
        if (!chon?.id) return

        localStorage.setItem(
            getDocumentChatStorageKey(chon.id),
            JSON.stringify(lichSuChatTaiLieu)
        )
    }, [lichSuChatTaiLieu, chon?.id, nguoiDung?.userId, nguoiDung?.id])

    useEffect(() => {
        const xuLy = danhSach.filter(
            d => d.status === 'PROCESSING' || d.status === 'PENDING'
        )

        if (xuLy.length === 0) return undefined

        const id = setInterval(async () => {
            for (const d of xuLy) {
                try {
                    const { data } = await documentApi.layTheoId(d.id)

                    const nextDoc = {
                        ...data.data,
                        _shared: d._shared,
                    }

                    setDanhSach(prev =>
                        prev.map(item =>
                            item.id === d.id
                                ? nextDoc
                                : item
                        )
                    )

                    if (chon?.id === d.id) {
                        setChon(nextDoc)
                    }
                } catch {
                    // Bỏ qua lỗi polling tạm thời
                }
            }
        }, 3000)

        return () => clearInterval(id)
    }, [danhSach, chon?.id])

    useEffect(() => {
        if (hienShareTaiLieu && chon?.id && !chon?._shared) {
            taiDanhSachShareTaiLieu()
        }
    }, [hienShareTaiLieu, chon?.id])

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

    const taiLen = async (file) => {
        if (!coUploadTaiLieu) {
            toast.error(getUpgradeMessage('DOCUMENT_UPLOAD'))
            return
        }

        setDangTaiLen(true)

        try {
            const { data } = await documentApi.taiLen(file, null)

            setDanhSach(prev => [data.data, ...prev])
            await layThongTin?.()

            toast.success(`Đã tải lên "${file.name}"`)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Tải lên thất bại')
        } finally {
            setDangTaiLen(false)
        }
    }

    const phanTich = async () => {
        if (!coAiAnalyze) {
            toast.error(getUpgradeMessage('AI_ANALYZE'))
            return
        }

        if (!chon || !isDocumentReady(chon)) {
            toast.error('Tài liệu chưa xử lý xong')
            return
        }

        setDangXuLyAi(true)
        setKetQuaAi(null)
        setPhanHoiChat(null)

        try {
            const { data } = await documentApi.phanTich(chon.id)
            setKetQuaAi(data.data || data)
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

        if (!chon || !isDocumentReady(chon)) {
            toast.error('Tài liệu chưa xử lý xong')
            return
        }

        setDangXuLyAi(true)
        setKetQuaAi(null)
        setPhanHoiChat(null)

        try {
            const { data } = await documentApi.phanTichAmThanh(chon.id, {
                createNote: true,
            })

            setKetQuaAi({
                summary: data.data?.structuredNote,
                keyPoints: [],
                amThanh: true,
                noteTitle: data.data?.noteTitle,
            })

            toast.success('Đã phân tích âm thanh và tạo ghi chú!')
            await layThongTin?.()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Phân tích âm thanh thất bại')
        } finally {
            setDangXuLyAi(false)
        }
    }

    const taoFlashcardTuTaiLieu = async () => {
        if (!coAiFlashcard) {
            toast.error(getUpgradeMessage('AI_FLASHCARD'))
            return
        }

        if (!chon || !isDocumentReady(chon)) {
            toast.error('Tài liệu chưa xử lý xong')
            return
        }

        setDangTaoFlashcard(true)

        const toastId = toast.loading('AI đang tạo flashcard từ tài liệu...')

        try {
            const { data } = await flashcardApi.generateFromDocument(chon.id)
            const result = data.data || data
            const total = result.total || result.cards?.length || 0

            if (total <= 0) {
                toast.error('AI chưa tìm thấy đủ nội dung để tạo flashcard', {
                    id: toastId,
                })

                if (result.noteId) {
                    navigate(`/notes/${result.noteId}/flashcards`)
                }

                return
            }

            toast.success(`Đã tạo ${total} flashcard`, {
                id: toastId,
            })

            if (result.noteId) {
                navigate(`/notes/${result.noteId}/flashcards`)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo flashcard từ tài liệu', {
                id: toastId,
            })
        } finally {
            setDangTaoFlashcard(false)
        }
    }

    const hoiDap = async () => {
        if (!coAiChat) {
            toast.error(getUpgradeMessage('AI_CHAT'))
            return
        }

        if (dangHoiTaiLieuRef.current || lichSuChatTaiLieu.some(item => item.loading)) {
            toast.error('Vui lòng đợi AI trả lời xong câu trước')
            return
        }

        if (!chon || !cauHoi.trim()) return

        dangHoiTaiLieuRef.current = true

        const question = cauHoi.trim()
        const tempId = `${Date.now()}-${Math.random()}`

        const pendingMessage = {
            id: tempId,
            question,
            answer: '',
            loading: true,
            error: false,
            createdAt: new Date().toISOString(),
        }

        setLichSuChatTaiLieu(prev => [...prev, pendingMessage])
        setCauHoi('')
        setDangXuLyAi(true)

        try {
            const { data } = await documentApi.hoiDap(chon.id, {
                question,
            })

            const result = data.data || data

            setPhanHoiChat(result)

            setLichSuChatTaiLieu(prev =>
                prev.map(item =>
                    item.id === tempId
                        ? {
                            ...item,
                            answer: result.answer || 'AI chưa có câu trả lời',
                            sourceParagraphs: result.sourceParagraphs || [],
                            confidence: result.confidence,
                            loading: false,
                            error: false,
                        }
                        : item
                )
            )
        } catch (error) {
            const message = error.response?.data?.message || 'AI không phản hồi'

            setLichSuChatTaiLieu(prev =>
                prev.map(item =>
                    item.id === tempId
                        ? {
                            ...item,
                            answer: message,
                            loading: false,
                            error: true,
                        }
                        : item
                )
            )

            toast.error(message)
        } finally {
            dangHoiTaiLieuRef.current = false
            setDangXuLyAi(false)
        }
    }

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
        const doc = danhSach.find(item => item.id === id)

        if (doc?._shared) {
            toast.error('Bạn không thể xóa tài liệu được chia sẻ')
            return
        }

        if (!window.confirm('Xoá tài liệu này?')) return

        try {
            await documentApi.xoa(id)

            setDanhSach(prev => prev.filter(d => d.id !== id))
            await layThongTin?.()

            if (chon?.id === id) {
                setChon(null)
                resetRightPanel()
            }

            toast.success('Đã xoá')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa tài liệu thất bại')
        }
    }

    const taiDanhSachShareTaiLieu = async () => {
        if (!chon?.id) return

        try {
            const { data } = await documentApi.layDanhSachChiaSe(chon.id)
            setDocumentShareList(data.data || [])
        } catch {
            setDocumentShareList([])
        }
    }

    const chiaSeTaiLieu = async () => {
        if (!coTeamWork) {
            toast.error(getUpgradeMessage('TEAM_WORK'))
            return
        }

        if (!chon?.id) return

        if (chon?._shared) {
            toast.error('Bạn không thể chia sẻ lại tài liệu của người khác')
            return
        }

        const email = documentShareEmail.trim().toLowerCase()

        if (!email) {
            toast.error('Vui lòng nhập email người nhận')
            return
        }

        setDangShareDocument(true)

        try {
            await documentApi.chiaSe(chon.id, {
                email,
                permission: documentSharePermission,
            })

            toast.success('Đã chia sẻ tài liệu')
            setDocumentShareEmail('')
            setDocumentSharePermission('VIEW')
            taiDanhSachShareTaiLieu()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Chia sẻ tài liệu thất bại')
        } finally {
            setDangShareDocument(false)
        }
    }

    const huyChiaSeTaiLieu = async (shareId) => {
        try {
            await documentApi.huyChiaSe(shareId)

            toast.success('Đã hủy chia sẻ')
            taiDanhSachShareTaiLieu()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Hủy chia sẻ thất bại')
        }
    }

    return (
        <div style={styles.wrap}>
            <div style={styles.left}>
                <div style={styles.uploadHeader}>
                    <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                        Tải lên tài liệu
                    </p>

                    {coUploadTaiLieu ? (
                        <UploadZone
                            onUpload={taiLen}
                            dangTaiLen={dangTaiLen}
                        />
                    ) : (
                        <div style={styles.lockedBox}>
                            Gói hiện tại chưa hỗ trợ upload tài liệu.
                            Vui lòng nâng cấp để sử dụng tính năng này.
                        </div>
                    )}
                </div>

                <div style={styles.listArea}>
                    {dangTai ? (
                        <div style={styles.centerBox}>
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
                                    onClick={() => chonTaiLieu(d)}
                                    style={{
                                        ...styles.docRow,
                                        ...(chon?.id === d.id ? styles.docRowActive : {}),
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
                                        <div style={styles.docName}>
                                            {d.originalName}
                                        </div>

                                        <div style={styles.docMeta}>
                                            <span style={{ color: tt.mau }}>
                                                {tt.nhan}
                                            </span>

                                            {d.fileSize && (
                                                <span style={{ color: 'var(--text-faint)' }}>
                                                    {dungLuong(d.fileSize)}
                                                </span>
                                            )}

                                            {d._shared && (
                                                <span style={{ color: 'var(--accent-blue-dim)' }}>
                                                    Được chia sẻ
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {!d._shared && (
                                        <button
                                            className="btn-ghost"
                                            onClick={e => {
                                                e.stopPropagation()
                                                xoa(d.id)
                                            }}
                                            style={{ padding: 3 }}
                                            title="Xóa tài liệu"
                                        >
                                            <IconTrash size={11} />
                                        </button>
                                    )}
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
                                <IconMusic
                                    size={18}
                                    style={{ color: 'var(--accent-purple)' }}
                                />
                            ) : (
                                <IconFileText
                                    size={18}
                                    style={{ color: 'var(--accent-blue-dim)' }}
                                />
                            )}

                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>
                                    {chon.originalName}
                                </div>

                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {TRANG_THAI[chon.status]?.nhan || chon.status}
                                    {' · '}
                                    {dungLuong(chon.fileSize)}
                                    {chon._shared ? ' · Được chia sẻ với bạn' : ''}
                                </div>
                            </div>

                            {isDocumentReady(chon) && coAiAnalyze && (
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

                            {isDocumentReady(chon) && coAiFlashcard && (
                                <button
                                    className="btn-ghost"
                                    onClick={taoFlashcardTuTaiLieu}
                                    disabled={dangTaoFlashcard}
                                    style={{ gap: 4 }}
                                    title="Tạo flashcard từ tài liệu"
                                >
                                    <IconCards
                                        size={13}
                                        className={dangTaoFlashcard ? 'animate-spin' : ''}
                                    />
                                    {dangTaoFlashcard ? 'Đang tạo...' : 'Flashcard AI'}
                                </button>
                            )}

                            {isDocumentReady(chon) && coTeamWork && !chon._shared && (
                                <button
                                    className={hienShareTaiLieu ? 'btn-ai' : 'btn-ghost'}
                                    onClick={() => setHienShareTaiLieu(prev => !prev)}
                                    style={{ gap: 4 }}
                                    title="Chia sẻ tài liệu"
                                >
                                    <IconShare size={13} />
                                    Chia sẻ
                                </button>
                            )}

                            {isDocumentReady(chon) && !coAiAnalyze && (
                                <div style={styles.smallLockedText}>
                                    Gói hiện tại chưa hỗ trợ phân tích AI
                                </div>
                            )}

                            {(chon.status === 'PENDING' || chon.status === 'PROCESSING') && (
                                <div style={styles.processingText}>
                                    <Spinner size={12} />
                                    Đang xử lý tài liệu...
                                </div>
                            )}
                        </div>

                        <div style={styles.contentArea}>
                            {hienShareTaiLieu && !chon._shared && (
                                <div style={styles.sharePanel}>
                                    <div style={styles.sharePanelHeader}>
                                        <div style={styles.panelTitle}>
                                            <IconShare
                                                size={13}
                                                style={{ color: 'var(--accent-blue-dim)' }}
                                            />

                                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                                                Chia sẻ tài liệu
                                            </span>
                                        </div>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setHienShareTaiLieu(false)}
                                            style={{ padding: 3 }}
                                            title="Đóng"
                                        >
                                            <IconX size={13} />
                                        </button>
                                    </div>

                                    <div style={styles.sharePanelBody}>
                                        <div style={styles.shareBox}>
                                            <input
                                                value={documentShareEmail}
                                                onChange={e => setDocumentShareEmail(e.target.value)}
                                                placeholder="Email người nhận..."
                                                style={styles.shareInput}
                                            />

                                            <select
                                                value={documentSharePermission}
                                                onChange={e => setDocumentSharePermission(e.target.value)}
                                                style={styles.shareSelect}
                                            >
                                                <option value="VIEW">Chỉ xem</option>
                                                <option value="EDIT">Có thể chỉnh sửa</option>
                                            </select>

                                            <button
                                                className="btn-primary"
                                                onClick={chiaSeTaiLieu}
                                                disabled={dangShareDocument}
                                                style={styles.shareButton}
                                            >
                                                <IconUserPlus size={12} />
                                                {dangShareDocument ? 'Đang chia sẻ...' : 'Chia sẻ'}
                                            </button>
                                        </div>

                                        <div style={styles.shareListBox}>
                                            <div style={styles.tagSectionTitle}>
                                                Đã chia sẻ
                                            </div>

                                            {documentShareList.length === 0 ? (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    Chưa chia sẻ cho ai
                                                </div>
                                            ) : (
                                                documentShareList.map(item => (
                                                    <div
                                                        key={item.id}
                                                        style={styles.shareItem}
                                                    >
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={styles.shareEmail}>
                                                                {item.sharedWithEmail}
                                                            </div>

                                                            <div style={styles.shareMeta}>
                                                                {item.permission === 'EDIT'
                                                                    ? 'Có thể chỉnh sửa'
                                                                    : 'Chỉ xem'}
                                                            </div>
                                                        </div>

                                                        <button
                                                            className="btn-ghost"
                                                            onClick={() => huyChiaSeTaiLieu(item.id)}
                                                            style={{ padding: 4 }}
                                                            title="Hủy chia sẻ"
                                                        >
                                                            <IconX size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {ketQuaAi && (
                                <div style={styles.aiResult}>
                                    <div style={styles.aiLabel}>
                                        <IconSparkles
                                            size={12}
                                            style={{ color: 'var(--accent-blue-dim)' }}
                                        />
                                        {ketQuaAi.amThanh ? 'Ghi chú từ âm thanh' : 'Phân tích AI'}
                                    </div>

                                    {ketQuaAi.noteTitle && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>
                                                Tiêu đề ghi chú
                                            </div>

                                            <p style={{ fontWeight: 500 }}>
                                                {ketQuaAi.noteTitle}
                                            </p>
                                        </div>
                                    )}

                                    {ketQuaAi.summary && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>
                                                Tóm tắt
                                            </div>

                                            <p style={styles.summaryText}>
                                                {ketQuaAi.summary}
                                            </p>
                                        </div>
                                    )}

                                    {ketQuaAi.keyPoints?.length > 0 && (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={styles.subLabel}>
                                                Điểm chính
                                            </div>

                                            {ketQuaAi.keyPoints.map((item, index) => (
                                                <p key={index} style={{ padding: '2px 0' }}>
                                                    • {item}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {ketQuaAi.keywords?.length > 0 && (
                                        <div>
                                            <div style={styles.subLabel}>
                                                Từ khoá
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {ketQuaAi.keywords.map((item, index) => (
                                                    <span key={index} className="tag tag-blue">
                                                        {item}
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

                            {isDocumentReady(chon) && !ketQuaAi && coAiAnalyze && (
                                <div style={styles.hintText}>
                                    Nhấn "Phân tích AI" để xem tóm tắt, hoặc hỏi trực tiếp bên dưới.
                                </div>
                            )}

                            {isDocumentReady(chon) && !coAiAnalyze && coAiChat && (
                                <div style={styles.hintText}>
                                    Gói hiện tại chưa hỗ trợ phân tích AI, nhưng bạn vẫn có thể hỏi đáp với tài liệu bên dưới.
                                </div>
                            )}

                            {isDocumentReady(chon) && !coAiAnalyze && !coAiChat && (
                                <div style={styles.lockedBox}>
                                    Gói hiện tại chưa hỗ trợ các tính năng AI cho tài liệu.
                                    Vui lòng nâng cấp để phân tích và hỏi đáp với tài liệu.
                                </div>
                            )}

                            {lichSuChatTaiLieu.length > 0 && (
                                <div style={styles.chatHistoryBox}>
                                    <div style={styles.chatHistoryHeader}>
                                        <div style={styles.aiLabel}>
                                            <IconMessages
                                                size={12}
                                                style={{ color: 'var(--accent-blue-dim)' }}
                                            />
                                            Lịch sử hỏi đáp
                                        </div>

                                        <button
                                            className="btn-ghost"
                                            onClick={xoaLichSuChatTaiLieu}
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                        >
                                            Xóa lịch sử
                                        </button>
                                    </div>

                                    <div style={styles.chatHistoryList}>
                                        {lichSuChatTaiLieu.map(item => (
                                            <div key={item.id} style={styles.chatTurn}>
                                                <div style={styles.questionBubble}>
                                                    <div style={styles.bubbleLabel}>
                                                        Bạn hỏi
                                                    </div>

                                                    <div style={styles.bubbleText}>
                                                        {item.question}
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        ...styles.answerBubble,
                                                        ...(item.error ? styles.answerBubbleError : {}),
                                                    }}
                                                >
                                                    <div style={styles.bubbleLabel}>
                                                        AI trả lời
                                                    </div>

                                                    <div style={styles.bubbleText}>
                                                        {item.loading ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                                <Spinner size={12} />
                                                                Đang suy nghĩ...
                                                            </span>
                                                        ) : (
                                                            item.answer
                                                        )}
                                                    </div>

                                                    {!item.loading && item.sourceParagraphs?.length > 0 && (
                                                        <details style={styles.sourceDetails}>
                                                            <summary style={styles.sourceSummary}>
                                                                Xem đoạn tài liệu liên quan
                                                            </summary>

                                                            <div style={styles.sourceList}>
                                                                {item.sourceParagraphs.map((source, index) => (
                                                                    <p
                                                                        key={index}
                                                                        style={styles.sourceItem}
                                                                    >
                                                                        {source}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isDocumentReady(chon) && coAiChat && (
                            <div style={styles.chatInput}>
                                <textarea
                                    value={cauHoi}
                                    onChange={e => setCauHoi(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()

                                            if (
                                                dangHoiTaiLieuRef.current ||
                                                lichSuChatTaiLieu.some(item => item.loading)
                                            ) {
                                                toast.error('Vui lòng đợi AI trả lời xong câu trước')
                                                return
                                            }

                                            hoiDap()
                                        }
                                    }}
                                    placeholder={
                                        coDangTraLoiTaiLieu
                                            ? 'Đợi AI trả lời xong rồi hỏi tiếp...'
                                            : `Hỏi về "${chon.originalName}"...`
                                    }
                                    disabled={coDangTraLoiTaiLieu}
                                    rows={3}
                                    style={styles.chatTextarea}
                                />

                                <button
                                    className="btn-primary"
                                    onClick={hoiDap}
                                    disabled={!cauHoi.trim() || coDangTraLoiTaiLieu}
                                    style={{
                                        padding: '8px 14px',
                                        flexShrink: 0,
                                        alignSelf: 'flex-end',
                                    }}
                                >
                                    {coDangTraLoiTaiLieu ? <Spinner size={12} /> : 'Hỏi'}
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
        height: '100%',
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
    centerBox: {
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
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
    docRowActive: {
        background: 'var(--bg-elevated)',
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
        flexWrap: 'wrap',
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
        flexWrap: 'wrap',
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
        marginBottom: 12,
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
        gap: 10,
        padding: '12px 16px',
        borderTop: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
        alignItems: 'flex-end',
    },
    chatTextarea: {
        flex: 1,
        minHeight: 72,
        maxHeight: 150,
        resize: 'vertical',
        borderRadius: 10,
        border: '.5px solid var(--border)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '10px 12px',
        fontSize: 13,
        lineHeight: 1.5,
        outline: 'none',
        fontFamily: 'inherit',
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
        marginTop: 8,
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
    chatHistoryBox: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },
    chatHistoryHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
    },
    chatHistoryList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    chatTurn: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    questionBubble: {
        alignSelf: 'flex-end',
        maxWidth: '78%',
        background: 'var(--accent-blue)',
        color: '#fff',
        borderRadius: '12px 12px 4px 12px',
        padding: '9px 11px',
        fontSize: 13,
    },
    answerBubble: {
        alignSelf: 'flex-start',
        maxWidth: '86%',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: '12px 12px 12px 4px',
        padding: '9px 11px',
        fontSize: 13,
        color: 'var(--text-primary)',
    },
    answerBubbleError: {
        borderColor: 'var(--accent-red)',
        color: 'var(--accent-red)',
    },
    bubbleLabel: {
        fontSize: 10,
        opacity: 0.75,
        marginBottom: 4,
        fontWeight: 600,
    },
    bubbleText: {
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    sourceDetails: {
        marginTop: 8,
        fontSize: 11,
    },
    sourceSummary: {
        cursor: 'pointer',
        color: 'var(--accent-blue-dim)',
    },
    sourceList: {
        marginTop: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    sourceItem: {
        margin: 0,
        padding: 8,
        borderRadius: 6,
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    sharePanel: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    sharePanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    panelTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    sharePanelBody: {
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 300px) 1fr',
        gap: 12,
    },
    shareBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    shareInput: {
        fontSize: 12,
        height: 30,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        padding: '0 8px',
    },
    shareSelect: {
        fontSize: 12,
        height: 30,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        padding: '0 8px',
    },
    shareButton: {
        width: '100%',
        justifyContent: 'center',
        fontSize: 12,
    },
    shareListBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    tagSectionTitle: {
        fontSize: 11,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        fontWeight: 600,
    },
    shareItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 8,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
    },
    shareEmail: {
        fontSize: 12,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    shareMeta: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginTop: 2,
    },
}
