
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    IconBookmark,
    IconBookmarkFilled,
    IconCheck,
    IconPlus,
    IconSearch,
    IconSparkles,
    IconTag,
    IconTrash,
    IconDownload,
    IconShare,
    IconUserPlus,
    IconX,
    IconCards,
} from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import scheduleApi from '../../lib/api/scheduleApi'
import tagApi from '../../lib/api/tagApi'
import flashcardApi from '../../lib/api/flashcardApi'
import NoteCard from '../../components/notes/NoteCard'
import AiPanel from '../../components/notes/AiPanel'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { hasFeature, getUpgradeMessage } from '../../utils/packageFeatures'

export default function Notes() {
    const { id: idParam } = useParams()
    const navigate = useNavigate()
    const { nguoiDung } = useAuthStore()

    const coTinhNang = (featureCode) => hasFeature(nguoiDung, featureCode)

    const [danhSach, setDanhSach] = useState([])
    const [ghiChuHienTai, setGhiChuHienTai] = useState(null)

    const accessMode = ghiChuHienTai?.accessMode || 'OWNER'
    const laChuSoHuu = accessMode === 'OWNER'
    const coTheChinhSua = accessMode === 'OWNER' || accessMode === 'EDIT'
    const chiDuocXem = accessMode === 'VIEW'

    const [tags, setTags] = useState([])
    const [timKiem, setTimKiem] = useState('')
    const [dangTai, setDangTai] = useState(true)
    const [dangLuu, setDangLuu] = useState(false)

    const [hienAi, setHienAi] = useState(false)
    const [hienTag, setHienTag] = useState(false)
    const [hienShare, setHienShare] = useState(false)
    const [hienLichGoiY, setHienLichGoiY] = useState(false)

    const [dangTrichLich, setDangTrichLich] = useState(false)
    const [locTag, setLocTag] = useState(null)

    const [tenTagMoi, setTenTagMoi] = useState('')
    const [mauTagMoi, setMauTagMoi] = useState('#3B82F6')
    const [noteDaTaoLichIds, setNoteDaTaoLichIds] = useState(new Set())

    const [dangTaoFlashcard, setDangTaoFlashcard] = useState(false)

    const [hienChecklistModal, setHienChecklistModal] = useState(false)
    const [checklistItems, setChecklistItems] = useState([])
    const [checklistDeadline, setChecklistDeadline] = useState('')
    const [checklistPriority, setChecklistPriority] = useState('MEDIUM')
    const [dangTaoChecklistTask, setDangTaoChecklistTask] = useState(false)

    const [shareEmail, setShareEmail] = useState('')
    const [sharePermission, setSharePermission] = useState('VIEW')
    const [shareList, setShareList] = useState([])
    const [dangShare, setDangShare] = useState(false)

    const taiDanhSach = useCallback(async () => {
        setDangTai(true)

        try {
            const params = { page: 0, size: 50 }

            if (timKiem) params.keyword = timKiem
            if (locTag) params.tagIds = locTag

            const { data } = await noteApi.layTatCa(params)
            setDanhSach(data.data?.content || [])
        } catch {
            toast.error('Không tải được ghi chú')
        } finally {
            setDangTai(false)
        }
    }, [timKiem, locTag])

    useEffect(() => {
        taiDanhSach()
    }, [taiDanhSach])

    useEffect(() => {
        tagApi.layTatCa()
            .then(r => setTags(r.data.data || []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!idParam) return
        if (ghiChuHienTai?.id === idParam) return

        chonGhiChu(idParam)
    }, [idParam, ghiChuHienTai?.id])

    const chonGhiChu = async (id) => {
        try {
            const { data } = await noteApi.layTheoId(id)

            setGhiChuHienTai(data.data)
            setKetQuaDongPanel()
            navigate(`/notes/${id}`, { replace: true })
        } catch {
            toast.error('Không thể mở ghi chú')
        }
    }

    const setKetQuaDongPanel = () => {
        setHienAi(false)
        setHienTag(false)
        setHienShare(false)
        setShareEmail('')
        setSharePermission('VIEW')
        setShareList([])

        setHienChecklistModal(false)
        setChecklistItems([])
        setChecklistDeadline('')
        setChecklistPriority('MEDIUM')
    }

    const taiXuongGhiChu = async (format) => {
        if (!coTinhNang('EXPORT_FILE')) {
            toast.error(getUpgradeMessage('EXPORT_FILE'))
            navigate('/service-packages')
            return
        }

        if (!ghiChuHienTai?.id) {
            toast.error('Chưa chọn ghi chú để export')
            return
        }

        try {
            const response = format === 'pdf'
                ? await noteApi.xuatPdf(ghiChuHienTai.id)
                : await noteApi.xuatWord(ghiChuHienTai.id)

            const blob = new Blob([response.data], {
                type: response.headers['content-type'] || 'application/octet-stream',
            })

            const contentDisposition = response.headers['content-disposition']
            let fileName = `${ghiChuHienTai.title || 'ghi-chu'}.${format === 'pdf' ? 'pdf' : 'docx'}`

            if (contentDisposition) {
                const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)

                if (match?.[1]) {
                    fileName = decodeURIComponent(match[1])
                }
            }

            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')

            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()

            a.remove()
            window.URL.revokeObjectURL(url)

            toast.success(`Đã export ${format.toUpperCase()}`)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể export ghi chú')
        }
    }

    const handleTaoFlashcard = async () => {
        if (!coTinhNang('AI_FLASHCARD')) {
            toast.error(getUpgradeMessage('AI_FLASHCARD'))
            navigate('/service-packages')
            return
        }

        if (!ghiChuHienTai || !ghiChuHienTai.id) {
            toast.error('Không tìm thấy mã định danh ghi chú hợp lệ!')
            return
        }

        if (!ghiChuHienTai.content?.trim()) {
            toast.error('Vui lòng viết thêm nội dung kiến thức vào ghi chú để AI bóc tách!')
            return
        }

        setDangTaoFlashcard(true)

        const loadToast = toast.loading('Trợ lý AI đang phân tích dữ liệu và soạn trang ôn tập...')

        try {
            const response = await flashcardApi.generate(ghiChuHienTai.id)
            const cards = response.data?.data || response.data

            if (cards && cards.length > 0) {
                toast.success(`Đã biên soạn thành công ${cards.length} thẻ học tập!`, {
                    id: loadToast,
                })

                navigate(`/notes/${ghiChuHienTai.id}/flashcards`)
} else {
    toast.error('AI chưa tìm thấy đủ thông tin cốt lõi để tạo bộ câu hỏi.', {
        id: loadToast,
    })
}
} catch (error) {
    console.error(error)
    toast.error(error.response?.data?.message || 'Không thể kết nối với mô hình AI lúc này.', {
        id: loadToast,
    })
} finally {
    setDangTaoFlashcard(false)
}
}

const taoMoi = async () => {
    try {
        const { data } = await noteApi.taoMoi({
            title: 'Ghi chú mới',
            content: '',
        })

        const ghiChu = data.data

        setDanhSach(p => [ghiChu, ...p])
        setGhiChuHienTai(ghiChu)
        navigate(`/notes/${ghiChu.id}`, { replace: true })
    } catch {
        toast.error('Không thể tạo ghi chú')
    }
}

    const luu = async () => {
        if (!ghiChuHienTai) return
        if (!coTheChinhSua) return

    setDangLuu(true)

    try {
        const { data } = await noteApi.capNhat(ghiChuHienTai.id, {
            title: ghiChuHienTai.title,
            content: ghiChuHienTai.content,
            tagIds: ghiChuHienTai.tags?.map(t => t.id),
        })

        setDanhSach(p =>
            p.map(n => n.id === data.data.id ? { ...n, ...data.data } : n)
        )

        toast.success('Đã lưu')
    } catch {
        toast.error('Lưu thất bại')
    } finally {
        setDangLuu(false)
    }
}

const xoa = async () => {
    if (!ghiChuHienTai || !window.confirm('Xoá ghi chú này?')) return

    try {
        await noteApi.xoa(ghiChuHienTai.id)

        setDanhSach(p => p.filter(n => n.id !== ghiChuHienTai.id))
        setGhiChuHienTai(null)
        navigate('/notes', { replace: true })

        toast.success('Đã xoá')
    } catch {
        toast.error('Xoá thất bại')
    }
}

const danhDau = async () => {
    if (!ghiChuHienTai) return

    try {
        const { data } = await noteApi.danhDau(ghiChuHienTai.id)

        setGhiChuHienTai(data.data)
        setDanhSach(p =>
            p.map(n =>
                n.id === data.data.id
                    ? { ...n, isBookmarked: data.data.isBookmarked }
                    : n
            )
        )
    } catch {}
}

const homNayIso = () => {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
    return today.toISOString().split('T')[0]
}

const apDungAi = async (ketQua) => {
    if (!ketQua || !ghiChuHienTai) return

    if (ketQua.checklist?.length > 0) {
        if (!coTinhNang('CHECKLIST_BASIC')) {
            toast.error(getUpgradeMessage('CHECKLIST_BASIC'))
            navigate('/service-packages')
            return
        }

        const danhSachTask = ketQua.checklist
            .map(item => typeof item === 'string' ? item.trim() : '')
            .filter(Boolean)

        if (danhSachTask.length === 0) {
            toast.error('Checklist không có nội dung hợp lệ')
            return
        }

        setChecklistItems(danhSachTask)
        setChecklistDeadline('')
        setChecklistPriority('MEDIUM')
        setHienChecklistModal(true)

        return
    }

    setGhiChuHienTai(p => {
        if (!p) return p

        let noiDungMoi = p.content || ''
        let tieuDeMoi = p.title

        if (ketQua.suggestedTitle) {
            tieuDeMoi = ketQua.suggestedTitle
        }

        if (ketQua.improvedContent) {
            noiDungMoi = ketQua.improvedContent
        } else if (ketQua.summary) {
            noiDungMoi = noiDungMoi.trim() + '\n\n---\n\n## AI Summary\n' + ketQua.summary
        }

        return {
            ...p,
            title: tieuDeMoi,
            content: noiDungMoi,
        }
    })
}

const xacNhanTaoTaskTuChecklist = async () => {
    if (!ghiChuHienTai?.id) {
        toast.error('Chưa chọn ghi chú')
        return
    }

    if (checklistItems.length === 0) {
        toast.error('Checklist không có nội dung hợp lệ')
        return
    }

    if (checklistDeadline && checklistDeadline < homNayIso()) {
        toast.error('Deadline không được nằm trong quá khứ')
        return
    }

    setDangTaoChecklistTask(true)

    const toastId = toast.loading('Đang tạo task từ checklist AI...')

    try {
        await Promise.all(
            checklistItems.map(taskName =>
                scheduleApi.taoMoi({
                    taskName,
                    description: `Tạo từ checklist AI của ghi chú: ${ghiChuHienTai.title || 'Không có tiêu đề'}`,
                    deadline: checklistDeadline || null,
                    priority: checklistPriority,
                    noteId: ghiChuHienTai.id,
                })
            )
        )

        toast.success(`Đã tạo ${checklistItems.length} task từ checklist AI`, {
            id: toastId,
        })

        setChecklistItems([])
        setChecklistDeadline('')
        setChecklistPriority('MEDIUM')
        setHienChecklistModal(false)
    } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tạo task từ checklist AI', {
            id: toastId,
        })
    } finally {
        setDangTaoChecklistTask(false)
    }
}

const taoTagMoi = async () => {
    const name = tenTagMoi.trim()

    if (!name) {
        toast.error('Vui lòng nhập tên tag')
        return
    }

    try {
        const { data } = await tagApi.taoMoi({
            name,
            color: mauTagMoi,
        })

        const tagMoi = data.data

        setTags(p => [...p, tagMoi])
        setTenTagMoi('')
        setMauTagMoi('#3B82F6')

        setGhiChuHienTai(p => {
            if (!p) return p

            const currentTags = p.tags || []
            const daCo = currentTags.some(t => t.id === tagMoi.id)

            return {
                ...p,
                tags: daCo ? currentTags : [...currentTags, tagMoi],
            }
        })

        toast.success('Đã tạo tag mới')
    } catch {
        toast.error('Không thể tạo tag')
    }
}

const toggleTagChoGhiChu = (tag) => {
    if (!ghiChuHienTai) return

    setGhiChuHienTai(p => {
        const currentTags = p.tags || []
        const daCo = currentTags.some(t => t.id === tag.id)

        return {
            ...p,
            tags: daCo
                ? currentTags.filter(t => t.id !== tag.id)
                : [...currentTags, tag],
        }
    })
}

const taiDanhSachShare = async () => {
    if (!ghiChuHienTai?.id) return

    try {
        const { data } = await noteApi.layDanhSachChiaSe(ghiChuHienTai.id)
        setShareList(data.data || [])
    } catch {
        setShareList([])
    }
}

useEffect(() => {
    if (hienShare && ghiChuHienTai?.id) {
        taiDanhSachShare()
    }
}, [hienShare, ghiChuHienTai?.id])

const chiaSeGhiChu = async () => {
    if (!coTinhNang('TEAM_WORK')) {
        toast.error(getUpgradeMessage('TEAM_WORK'))
        navigate('/service-packages')
        return
    }

    if (!ghiChuHienTai?.id) {
        toast.error('Chưa chọn ghi chú để chia sẻ')
        return
    }

    const email = shareEmail.trim().toLowerCase()

    if (!email) {
        toast.error('Vui lòng nhập email người nhận')
        return
    }

    setDangShare(true)

    try {
        await noteApi.chiaSe(ghiChuHienTai.id, {
            email,
            permission: sharePermission,
        })

        toast.success('Đã chia sẻ ghi chú')
        setShareEmail('')
        setSharePermission('VIEW')

        await taiDanhSachShare()
    } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể chia sẻ ghi chú')
    } finally {
        setDangShare(false)
    }
}

const huyChiaSe = async (shareId) => {
    if (!window.confirm('Hủy chia sẻ người này?')) return

    try {
        await noteApi.huyChiaSe(shareId)

        toast.success('Đã hủy chia sẻ')
        await taiDanhSachShare()
    } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể hủy chia sẻ')
    }
}

const coTheTrichLich = (text) => {
    if (!text) return false

    return /\b(?:\d{1,2}[:.][0-5]\d|[0-2]?\d\s*giờ|ngày\s*\d{1,2}|thứ\s*(?:hai|ba|tư|năm|sáu|bảy)|deadline|hẹn)\b/i.test(text)
}

useEffect(() => {
    if (!ghiChuHienTai) return

    const daTaoLich = noteDaTaoLichIds.has(ghiChuHienTai.id)
    const duocTrichLich = coTinhNang('EXTRACT_SCHEDULE')

    setHienLichGoiY(
        duocTrichLich &&
        !daTaoLich &&
        coTheTrichLich(ghiChuHienTai.content)
    )
}, [
    ghiChuHienTai?.id,
    ghiChuHienTai?.content,
    noteDaTaoLichIds,
    nguoiDung?.packageFeatures,
])

useEffect(() => {
    scheduleApi.layTatCa()
        .then(r => {
            const schedules = r.data.data || []
            const ids = new Set(
                schedules
                    .filter(s => s.noteId)
                    .map(s => s.noteId)
            )

            setNoteDaTaoLichIds(ids)
        })
        .catch(() => {})
}, [])

const trichXuatLich = async () => {
    if (!coTinhNang('EXTRACT_SCHEDULE')) {
        toast.error(getUpgradeMessage('EXTRACT_SCHEDULE'))
        navigate('/service-packages')
        return
    }

    if (!ghiChuHienTai?.content?.trim()) return

    setDangTrichLich(true)

    try {
        const { data } = await scheduleApi.trichXuatTuGhiChu({
            content: ghiChuHienTai.content,
            noteId: ghiChuHienTai.id,
        })

        const total = data.data?.totalFound || 0

        if (total > 0) {
            setNoteDaTaoLichIds(prev => {
                const next = new Set(prev)
                next.add(ghiChuHienTai.id)
                return next
            })

            setHienLichGoiY(false)
            toast.success(`Đã tạo ${total} công việc / lịch`)
        } else {
            toast.error('AI chưa tìm thấy lịch/deadline hợp lệ trong ghi chú')
        }
    } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể trích xuất lịch từ ghi chú')
    } finally {
        setDangTrichLich(false)
    }
}

    useEffect(() => {
        if (!ghiChuHienTai) return
        if (!coTheChinhSua) return

        const t = setTimeout(luu, 3000)

        return () => clearTimeout(t)
    }, [ghiChuHienTai?.content, ghiChuHienTai?.title, coTheChinhSua])

return (
    <div style={styles.wrap}>
        <div style={styles.list}>
            <div style={styles.listHeader}>
                <div style={styles.searchRow}>
                    <div style={styles.searchWrap}>
                        <IconSearch
                            size={12}
                            style={{
                                position: 'absolute',
                                left: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)',
                            }}
                        />

                        <input
                            placeholder="Tìm kiếm..."
                            style={{
                                paddingLeft: 26,
                                fontSize: 12,
                                height: 30,
                            }}
                            value={timKiem}
                            onChange={e => setTimKiem(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn-ghost"
                        onClick={taoMoi}
                        style={{ padding: 5, flexShrink: 0 }}
                        title="Tạo ghi chú mới"
                    >
                        <IconPlus size={15} />
                    </button>
                </div>

                <div style={styles.tagFilter}>
                    <button
                        className={locTag ? 'btn-ghost' : 'btn-ai'}
                        onClick={() => setLocTag(null)}
                        style={{
                            fontSize: 10,
                            padding: '2px 8px',
                        }}
                    >
                        Tất cả
                    </button>

                    {tags.map(t => (
                        <button
                            key={t.id}
                            style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                background: locTag === t.id
                                    ? 'var(--bg-ai)'
                                    : 'transparent',
                            }}
                            className={locTag === t.id ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setLocTag(locTag === t.id ? null : t.id)}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.listBody}>
                {dangTai ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                        <Spinner />
                    </div>
                ) : danhSach.length === 0 ? (
                    <EmptyState
                        icon={IconSearch}
                        title="Không tìm thấy ghi chú"
                        desc="Thử tạo ghi chú mới"
                    />
                ) : (
                    danhSach.map(n => (
                        <NoteCard
                            key={n.id}
                            note={n}
                            active={ghiChuHienTai?.id === n.id}
                            onClick={() => chonGhiChu(n.id)}
                        />
                    ))
                )}
            </div>
        </div>

        <div style={styles.editor}>
            {!ghiChuHienTai ? (
                <div style={styles.emptyEditor}>
                    <EmptyState
                        icon={IconPlus}
                        title="Chọn hoặc tạo ghi chú"
                        action={
                            <button className="btn-primary" onClick={taoMoi}>
                                <IconPlus size={13} />
                                Ghi chú mới
                            </button>
                        }
                    />
                </div>
            ) : (
                <>
                    <div style={styles.toolbar}>
                        <input
                            value={ghiChuHienTai.title}
                            onChange={e => {
                                if (!coTheChinhSua) return

                                setGhiChuHienTai(p => ({
                                    ...p,
                                    title: e.target.value,
                                }))
                            }}
                            readOnly={!coTheChinhSua}
                            placeholder="Tiêu đề ghi chú..."
                            style={{
                                ...styles.tieuDe,
                                cursor: coTheChinhSua ? 'text' : 'default',
                                color: coTheChinhSua ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                        />

                        <div style={styles.toolbarRight}>
                            {accessMode === 'VIEW' && (
                                <span className="tag tag-dim" style={{ fontSize: 10 }}>
        Chỉ xem
    </span>
                            )}

                            {accessMode === 'EDIT' && (
                                <span className="tag tag-blue" style={{ fontSize: 10 }}>
        Được chỉnh sửa
    </span>
                            )}

                            {laChuSoHuu && (
                                <button
                                    className="btn-ghost"
                                    onClick={danhDau}
                                    title={ghiChuHienTai.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                                >
                                    {ghiChuHienTai.isBookmarked ? (
                                        <IconBookmarkFilled
                                            size={14}
                                            style={{ color: 'var(--accent-amber)' }}
                                        />
                                    ) : (
                                        <IconBookmark size={14} />
                                    )}
                                </button>
                            )}

                            {laChuSoHuu && coTinhNang('AI_FLASHCARD') && (
                                <button
                                    className="btn-ghost"
                                    onClick={handleTaoFlashcard}
                                    disabled={dangTaoFlashcard}
                                    style={{ gap: 4 }}
                                    title="Tạo bộ câu hỏi ôn tập chuyển trang"
                                >
                                    <IconCards
                                        size={14}
                                        className={dangTaoFlashcard ? 'animate-spin' : ''}
                                    />

                                    <span style={{ fontSize: 11 }}>
                                            Flashcard AI
                                        </span>
                                </button>
                            )}

                            {laChuSoHuu && coTinhNang('EXPORT_FILE') && (
                                <>
                                    <button
                                        className="btn-ghost"
                                        onClick={() => taiXuongGhiChu('pdf')}
                                        style={{ gap: 4 }}
                                        title="Export ghi chú ra PDF"
                                    >
                                        <IconDownload size={14} />
                                        <span style={{ fontSize: 11 }}>PDF</span>
                                    </button>

                                    <button
                                        className="btn-ghost"
                                        onClick={() => taiXuongGhiChu('docx')}
                                        style={{ gap: 4 }}
                                        title="Export ghi chú ra Word"
                                    >
                                        <IconDownload size={14} />
                                        <span style={{ fontSize: 11 }}>Word</span>
                                    </button>
                                </>
                            )}

                            {laChuSoHuu && coTinhNang('TEAM_WORK') && (
                                <button
                                    className={hienShare ? 'btn-ai' : 'btn-ghost'}
                                    onClick={() => setHienShare(p => !p)}
                                    style={{ gap: 4 }}
                                    title="Chia sẻ ghi chú"
                                >
                                    <IconShare size={14} />
                                    <span style={{ fontSize: 11 }}>Chia sẻ</span>
                                </button>
                            )}

                            {coTheChinhSua && (
                                <button
                                    className={hienAi ? 'btn-ai' : 'btn-ghost'}
                                    onClick={() => setHienAi(p => !p)}
                                    title="Trợ lý AI"
                                >
                                    <IconSparkles size={14} />
                                    <span style={{ fontSize: 11 }}>AI</span>
                                </button>
                            )}

                            {coTheChinhSua && (
                                <button
                                    className={hienTag ? 'btn-ai' : 'btn-ghost'}
                                    onClick={() => setHienTag(p => !p)}
                                    title="Gắn tag"
                                >
                                    <IconTag size={14} />
                                    <span style={{ fontSize: 11 }}>Tag</span>
                                </button>
                            )}

                            {laChuSoHuu && (
                                <button
                                    className="btn-danger btn-ghost"
                                    onClick={xoa}
                                    title="Xoá"
                                >
                                    <IconTrash size={13} />
                                </button>
                            )}

                            {coTheChinhSua && (
                                <button
                                    className="btn-primary"
                                    onClick={luu}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: 12,
                                    }}
                                >
                                    <IconCheck size={12} /> Lưu
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={styles.editorBody}>
                           <textarea
                               value={ghiChuHienTai.content || ''}
                               onChange={e => {
                                   if (!coTheChinhSua) return

                                   setGhiChuHienTai(p => ({
                                       ...p,
                                       content: e.target.value,
                                   }))
                               }}
                               readOnly={!coTheChinhSua}
                               placeholder={coTheChinhSua ? 'Bắt đầu ghi chú... (hỗ trợ Markdown)' : 'Bạn chỉ có quyền xem ghi chú này'}
                               style={{
                                   ...styles.textarea,
                                   cursor: coTheChinhSua ? 'text' : 'default',
                                   color: coTheChinhSua ? 'var(--text-primary)' : 'var(--text-secondary)',
                               }}
                           />

                        {hienLichGoiY && (
                            <div style={styles.schedulePrompt}>
                                <div style={{ fontSize: 12, marginBottom: 8 }}>
                                    <strong>AI phát hiện thông tin thời gian.</strong>
                                    {' '}
                                    Bạn có muốn trích xuất lịch / công việc?
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        className="btn-primary"
                                        onClick={trichXuatLich}
                                        disabled={dangTrichLich}
                                        style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            fontSize: 12,
                                        }}
                                    >
                                        {dangTrichLich ? 'Đang xử lý...' : 'Có, tạo lịch'}
                                    </button>

                                    <button
                                        className="btn-ghost"
                                        onClick={() => setHienLichGoiY(false)}
                                        style={{
                                            flex: 1,
                                            justifyContent: 'center',
                                            fontSize: 12,
                                        }}
                                    >
                                        Không, để sau
                                    </button>
                                </div>
                            </div>
                        )}

                        {hienTag && (
                            <div style={styles.tagPanel}>
                                <div style={styles.tagPanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconTag
                                                size={13}
                                                style={{ color: 'var(--accent-blue-dim)' }}
                                            />

                                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                                                Tag ghi chú
                                            </span>
                                        </span>

                                    <button
                                        className="btn-ghost"
                                        onClick={() => setHienTag(false)}
                                        style={{ padding: 3 }}
                                    >
                                        <IconX size={13} />
                                    </button>
                                </div>

                                <div style={styles.tagPanelBody}>
                                    <div style={styles.tagCreateBox}>
                                        <input
                                            value={tenTagMoi}
                                            onChange={e => setTenTagMoi(e.target.value)}
                                            placeholder="Tên tag mới..."
                                            style={{
                                                fontSize: 12,
                                                height: 30,
                                            }}
                                        />

                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <input
                                                type="color"
                                                value={mauTagMoi}
                                                onChange={e => setMauTagMoi(e.target.value)}
                                                style={styles.colorInput}
                                            />

                                            <button
                                                className="btn-primary"
                                                onClick={taoTagMoi}
                                                style={{
                                                    flex: 1,
                                                    justifyContent: 'center',
                                                    fontSize: 12,
                                                }}
                                            >
                                                <IconPlus size={12} /> Tạo tag
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.tagListBox}>
                                        <div style={styles.tagSectionTitle}>
                                            Tag hiện có
                                        </div>

                                        {tags.length === 0 ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                Chưa có tag nào
                                            </div>
                                        ) : (
                                            tags.map(tag => {
                                                const selected = ghiChuHienTai.tags?.some(t => t.id === tag.id)

                                                return (
                                                    <button
                                                        key={tag.id}
                                                        className={selected ? 'btn-ai' : 'btn-ghost'}
                                                        onClick={() => toggleTagChoGhiChu(tag)}
                                                        style={{
                                                            ...styles.tagSelectItem,
                                                            borderColor: selected
                                                                ? tag.color
                                                                : 'var(--border)',
                                                        }}
                                                    >
                                                            <span
                                                                style={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    background: tag.color || '#3B82F6',
                                                                    flexShrink: 0,
                                                                }}
                                                            />

                                                        <span>{tag.name}</span>

                                                        {selected && <IconCheck size={12} />}
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>

                                    <button
                                        className="btn-primary"
                                        onClick={luu}
                                        style={{
                                            width: '100%',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                        }}
                                    >
                                        Lưu tag cho ghi chú
                                    </button>
                                </div>
                            </div>
                        )}

                        {hienShare && (
                            <div style={styles.sharePanel}>
                                <div style={styles.sharePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconShare
                                                size={13}
                                                style={{ color: 'var(--accent-blue-dim)' }}
                                            />

                                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                                                Chia sẻ ghi chú
                                            </span>
                                        </span>

                                    <button
                                        className="btn-ghost"
                                        onClick={() => setHienShare(false)}
                                        style={{ padding: 3 }}
                                    >
                                        <IconX size={13} />
                                    </button>
                                </div>

                                <div style={styles.sharePanelBody}>
                                    <div style={styles.shareBox}>
                                        <input
                                            value={shareEmail}
                                            onChange={e => setShareEmail(e.target.value)}
                                            placeholder="Email người nhận..."
                                            style={{
                                                fontSize: 12,
                                                height: 30,
                                            }}
                                        />

                                        <select
                                            value={sharePermission}
                                            onChange={e => setSharePermission(e.target.value)}
                                            style={styles.shareSelect}
                                        >
                                            <option value="VIEW">Chỉ xem</option>
                                            <option value="EDIT">Có thể chỉnh sửa</option>
                                        </select>

                                        <button
                                            className="btn-primary"
                                            onClick={chiaSeGhiChu}
                                            disabled={dangShare}
                                            style={{
                                                width: '100%',
                                                justifyContent: 'center',
                                                fontSize: 12,
                                            }}
                                        >
                                            <IconUserPlus size={12} />
                                            {dangShare ? 'Đang chia sẻ...' : 'Chia sẻ'}
                                        </button>
                                    </div>

                                    <div style={styles.shareListBox}>
                                        <div style={styles.tagSectionTitle}>
                                            Đã chia sẻ
                                        </div>

                                        {shareList.length === 0 ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                Chưa chia sẻ cho ai
                                            </div>
                                        ) : (
                                            shareList.map(item => (
                                                <div key={item.id} style={styles.shareItem}>
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
                                                        onClick={() => huyChiaSe(item.id)}
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

                        {hienAi && (
                            <AiPanel
                                noteId={ghiChuHienTai.id}
                                content={ghiChuHienTai.content}
                                title={ghiChuHienTai.title}
                                onApply={apDungAi}
                                onDong={() => setHienAi(false)}
                            />
                        )}
                    </div>
                </>
            )}
        </div>

        {hienChecklistModal && (
            <div style={styles.modalBackdrop}>
                <div style={styles.checklistModal}>
                    <div style={styles.modalHeader}>
                        <div>
                            <div style={styles.modalTitle}>
                                Tạo task từ checklist AI
                            </div>

                            <div style={styles.modalSubtitle}>
                                Chọn deadline và mức ưu tiên trước khi lưu vào Lịch.
                            </div>
                        </div>

                        <button
                            className="btn-ghost"
                            onClick={() => setHienChecklistModal(false)}
                            style={{ padding: 4 }}
                        >
                            <IconX size={14} />
                        </button>
                    </div>

                    <div style={styles.modalBody}>
                        <div style={styles.checklistPreview}>
                            <div style={styles.modalSectionTitle}>
                                Danh sách task sẽ tạo
                            </div>

                            {checklistItems.map((item, index) => (
                                <div key={`${item}-${index}`} style={styles.checklistPreviewItem}>
                                        <span style={styles.checkIndex}>
                                            {index + 1}
                                        </span>

                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>

                        <div style={styles.modalForm}>
                            <label style={styles.modalLabel}>
                                Deadline

                                <input
                                    type="date"
                                    value={checklistDeadline}
                                    min={homNayIso()}
                                    onChange={e => setChecklistDeadline(e.target.value)}
                                    style={styles.modalInput}
                                />
                            </label>

                            <div style={styles.modalHint}>
                                Để trống nếu task chưa có deadline.
                            </div>

                            <label style={styles.modalLabel}>
                                Mức ưu tiên

                                <select
                                    value={checklistPriority}
                                    onChange={e => setChecklistPriority(e.target.value)}
                                    style={styles.modalInput}
                                >
                                    <option value="LOW">Thấp</option>
                                    <option value="MEDIUM">Vừa</option>
                                    <option value="HIGH">Cao</option>
                                    <option value="URGENT">Khẩn</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div style={styles.modalFooter}>
                        <button
                            className="btn-ghost"
                            onClick={() => setHienChecklistModal(false)}
                            disabled={dangTaoChecklistTask}
                        >
                            Hủy
                        </button>

                        <button
                            className="btn-primary"
                            onClick={xacNhanTaoTaskTuChecklist}
                            disabled={dangTaoChecklistTask}
                        >
                            {dangTaoChecklistTask ? 'Đang tạo...' : 'Tạo task'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
)
}

const styles = {
    wrap: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: '100%',
    },
    list: {
        width: 260,
        flexShrink: 0,
        borderRight: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
    },
    listHeader: {
        padding: '10px 8px 6px',
        borderBottom: '.5px solid var(--border)',
    },
    searchRow: {
        display: 'flex',
        gap: 4,
        marginBottom: 6,
    },
    searchWrap: {
        flex: 1,
        position: 'relative',
    },
    tagFilter: {
        display: 'flex',
        gap: 3,
        flexWrap: 'wrap',
    },
    listBody: {
        flex: 1,
        overflowY: 'auto',
    },
    editor: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    emptyEditor: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderBottom: '.5px solid var(--border)',
    },
    tieuDe: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
        padding: 0,
        outline: 'none',
        width: 'auto',
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
    },
    editorBody: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    textarea: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        padding: '16px 20px',
        resize: 'none',
        fontSize: 13,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        outline: 'none',
        fontFamily: 'var(--font)',
        overflow: 'auto',
    },
    schedulePrompt: {
        width: 320,
        flexShrink: 0,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        marginLeft: 12,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    panelTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
    },
    tagPanel: {
        width: 280,
        background: 'var(--bg-surface)',
        borderLeft: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    tagPanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)',
    },
    tagPanelBody: {
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        flex: 1,
    },
    tagCreateBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
    },
    colorInput: {
        width: 36,
        height: 30,
        padding: 0,
        border: '.5px solid var(--border)',
        borderRadius: 6,
        background: 'transparent',
    },
    tagListBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    tagSectionTitle: {
        fontSize: 10,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 2,
    },
    tagSelectItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'flex-start',
        fontSize: 12,
        padding: '6px 8px',
        border: '.5px solid var(--border)',
        borderRadius: 6,
    },
    sharePanel: {
        width: 300,
        background: 'var(--bg-surface)',
        borderLeft: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    sharePanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)',
    },
    sharePanelBody: {
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        flex: 1,
    },
    shareBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
    },
    shareSelect: {
        height: 30,
        fontSize: 12,
        border: '.5px solid var(--border)',
        borderRadius: 6,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        padding: '0 8px',
    },
    shareListBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    shareItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        background: 'var(--bg-elevated)',
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
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
    },
    checklistModal: {
        width: 520,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        borderBottom: '.5px solid var(--border)',
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    modalSubtitle: {
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 4,
        lineHeight: 1.5,
    },
    modalBody: {
        padding: 16,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    },
    modalSectionTitle: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        marginBottom: 8,
    },
    checklistPreview: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        padding: 10,
    },
    checklistPreviewItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 12,
        color: 'var(--text-secondary)',
        padding: '5px 0',
        lineHeight: 1.5,
    },
    checkIndex: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
    },
    modalForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    modalLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 12,
        color: 'var(--text-secondary)',
        fontWeight: 500,
    },
    modalInput: {
        height: 34,
        fontSize: 12,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '0 10px',
    },
    modalHint: {
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: -4,
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        padding: 16,
        borderTop: '.5px solid var(--border)',
    },
}