import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    IconBookmark,
    IconBookmarkFilled,
    IconCalendarEvent,
    IconCards,
    IconCheck,
    IconChevronRight,
    IconDownload,
    IconFileText,
    IconFilter,
    IconHistory,
    IconPlus,
    IconRestore,
    IconSearch,
    IconShare,
    IconSparkles,
    IconTag,
    IconTrash,
    IconUserPlus,
    IconX,
} from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import NoteDiagramGenerator from './NoteDiagramGenerator'
import scheduleApi from '../../lib/api/scheduleApi'
import tagApi from '../../lib/api/tagApi'
import flashcardApi from '../../lib/api/flashcardApi'
import AiPanel from '../../components/notes/AiPanel'
import RichTextEditor from '../../components/notes/RichTextEditor'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { hasFeature, getUpgradeMessage } from '../../utils/packageFeatures'
import { hasRichTextContent, richTextToPlainText } from '../../utils/richText'

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

    const [tags, setTags] = useState([])
    const [timKiem, setTimKiem] = useState('')
    const [dangTai, setDangTai] = useState(true)
    const [dangLuu, setDangLuu] = useState(false)

    const [hienAi, setHienAi] = useState(false)
    const [hienSoDo, setHienSoDo] = useState(false)
    const [hienTag, setHienTag] = useState(false)
    const [hienShare, setHienShare] = useState(false)
    const [hienLichSu, setHienLichSu] = useState(false)
    const [hienLichGoiY, setHienLichGoiY] = useState(false)

    const [dangTrichLich, setDangTrichLich] = useState(false)
    const [locTag, setLocTag] = useState(null)
    const [locNhanh, setLocNhanh] = useState('ALL')

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
    const [dangDoiQuyenShareId, setDangDoiQuyenShareId] = useState(null)
    const [lichSuPhienBan, setLichSuPhienBan] = useState([])
    const [dangTaiLichSu, setDangTaiLichSu] = useState(false)
    const [dangKhoiPhucVersionId, setDangKhoiPhucVersionId] = useState(null)

    const banDaLuuRef = useRef('')
    const idParamRef = useRef(idParam)
    const ghiChuHienTaiRef = useRef(ghiChuHienTai)
    const richTextEditorRef = useRef(null)
    const autoTitleXuLyRef = useRef(new Set())
    const editorSessionIdRef = useRef(
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    )

    useEffect(() => {
        idParamRef.current = idParam
    }, [idParam])

    useEffect(() => {
        ghiChuHienTaiRef.current = ghiChuHienTai
    }, [ghiChuHienTai])

    const taoDauMocGhiChu = useCallback((note) => {
        if (!note) return ''

        const tagIds = (note.tags || [])
            .map(t => t.id)
            .filter(Boolean)
            .sort()

        return JSON.stringify({
            id: note.id || '',
            title: note.title || '',
            content: note.content || '',
            tagIds,
        })
    }, [])

    const layPlainText = (html) => {
        try {
            return richTextToPlainText(html || '')
        } catch {
            return String(html || '').replace(/<[^>]*>/g, ' ')
        }
    }

    const layPreview = (note) => {
        const text = layPlainText(note?.content || '').trim()
        if (!text) return 'Chưa có nội dung'
        return text.length > 110 ? `${text.slice(0, 110)}...` : text
    }

    const parseNgayTuApi = (raw) => {
        if (!raw) return null

        if (raw instanceof Date) return raw

        const value = String(raw)
        const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
        const normalized = hasTimezone ? value : `${value}Z`
        const date = new Date(normalized)

        return Number.isNaN(date.getTime()) ? null : date
    }

    const layNgayCapNhat = (note) => {
        const raw = note?.updatedAt || note?.createdAt

        if (!raw) return 'Vừa xong'

        const date = parseNgayTuApi(raw)

        if (!date) return 'Vừa xong'

        const diff = Math.max(0, Date.now() - date.getTime())
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (minutes < 1) return 'Vừa xong'
        if (minutes < 60) return `${minutes} phút trước`
        if (hours < 24) return `${hours} giờ trước`
        if (days < 7) return `${days} ngày trước`

        return date.toLocaleDateString('vi-VN')
    }

    const demTu = (html) => {
        const text = layPlainText(html || '').trim()
        if (!text) return 0
        return text.split(/\s+/).filter(Boolean).length
    }

    const capNhatTruongGhiChu = (field, value) => {
        if (!coTheChinhSua) return

        setGhiChuHienTai(p => ({
            ...p,
            [field]: value,
        }))
    }

    const taiDanhSach = useCallback(async () => {
        setDangTai(true)

        try {
            const params = { page: 0, size: 50 }

            if (timKiem) params.keyword = timKiem
            if (locTag) params.tagIds = locTag

            const { data } = await noteApi.layTatCa(params)
            const list = data.data?.content || []

            setDanhSach(list)

            if (!idParamRef.current && !ghiChuHienTaiRef.current && list.length > 0) {
                setGhiChuHienTai(list[0])
                banDaLuuRef.current = taoDauMocGhiChu(list[0])
                navigate(`/notes/${list[0].id}`, { replace: true })
            }
        } catch {
            toast.error('Không tải được ghi chú')
        } finally {
            setDangTai(false)
        }
    }, [timKiem, locTag, navigate, taoDauMocGhiChu])

    useEffect(() => {
        taiDanhSach()
    }, [taiDanhSach])

    useEffect(() => {
        tagApi.layTatCa()
            .then(r => setTags(r.data.data || []))
            .catch(() => { })
    }, [])

    useEffect(() => {
        if (!idParam) return
        if (ghiChuHienTai?.id === idParam) return

        chonGhiChu(idParam)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idParam, ghiChuHienTai?.id])

    const chonGhiChu = async (id) => {
        try {
            const { data } = await noteApi.layTheoId(id)

            banDaLuuRef.current = taoDauMocGhiChu(data.data)
            setGhiChuHienTai(data.data)
            setKetQuaDongPanel()
            navigate(`/notes/${id}`, { replace: true })
        } catch {
            toast.error('Không thể mở ghi chú')
        }
    }

    const setKetQuaDongPanel = () => {
        setHienAi(false)
        setHienSoDo(false)
        setHienTag(false)
        setHienShare(false)
        setHienLichSu(false)
        setShareEmail('')
        setSharePermission('VIEW')
        setShareList([])
        setLichSuPhienBan([])

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

        if (!hasRichTextContent(ghiChuHienTai.content)) {
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
                title: DEFAULT_TITLE,
                content: '',
            })

            const ghiChu = data.data

            banDaLuuRef.current = taoDauMocGhiChu(ghiChu)
            setDanhSach(p => [ghiChu, ...p])
            setGhiChuHienTai(ghiChu)
            navigate(`/notes/${ghiChu.id}`, { replace: true })
            toast.success('Đã tạo ghi chú mới')
        } catch {
            toast.error('Không thể tạo ghi chú')
        }
    }

    const DEFAULT_TITLE = 'Ghi chú mới'

    const tuDongDeXuatTieuDe = async (noteId, currentTitle, contentHtml) => {
        const plainText = richTextToPlainText(contentHtml || '').trim()
        if (plainText.length < 20) return

        try {
            const { data } = await noteApi.caiThienAi(noteId, {
                content: plainText,
                title: currentTitle,
                action: 'SUGGEST_TITLE',
            })

            const suggestedTitle = data?.data?.suggestedTitle?.trim()
            if (!suggestedTitle) return

            // Nếu người dùng đã chuyển sang ghi chú khác trong lúc chờ AI, bỏ qua
            // để tránh ghi đè nhầm tiêu đề của ghi chú không còn đang mở.
            if (ghiChuHienTaiRef.current?.id !== noteId) return
            if (ghiChuHienTaiRef.current?.title?.trim() !== DEFAULT_TITLE) return

            const { data: updated } = await noteApi.capNhat(noteId, {
                title: suggestedTitle,
                content: ghiChuHienTaiRef.current.content,
                tagIds: ghiChuHienTaiRef.current.tags?.map(t => t.id),
                editorSessionId: editorSessionIdRef.current,
            })

            setGhiChuHienTai(updated.data)
            setDanhSach(p => p.map(n => (n.id === updated.data.id ? { ...n, ...updated.data } : n)))
            banDaLuuRef.current = taoDauMocGhiChu(updated.data)

            toast.success(`Đã tự động đặt tiêu đề: "${suggestedTitle}"`)
        } catch {
            // Tính năng nền, không làm phiền người dùng nếu AI không phản hồi được.
        }
    }

    const luu = async () => {
        if (!ghiChuHienTai) return
        if (!coTheChinhSua) return

        const dauMocHienTai = taoDauMocGhiChu(ghiChuHienTai)
        if (dauMocHienTai === banDaLuuRef.current) return

        setDangLuu(true)

        try {
            const { data } = await noteApi.capNhat(ghiChuHienTai.id, {
                title: ghiChuHienTai.title,
                content: ghiChuHienTai.content,
                tagIds: ghiChuHienTai.tags?.map(t => t.id),
                editorSessionId: editorSessionIdRef.current,
            })

            setGhiChuHienTai(data.data)

            setDanhSach(p =>
                p.map(n => n.id === data.data.id ? { ...n, ...data.data } : n)
            )

            banDaLuuRef.current = taoDauMocGhiChu(data.data)

            // Ghi chú mới, chưa từng đặt tên, vừa có nội dung thật sự lần đầu
            // -> tự động đề xuất và áp dụng tiêu đề (không cần bấm nút thủ công).
            if (
                data.data.title?.trim() === DEFAULT_TITLE &&
                !autoTitleXuLyRef.current.has(data.data.id)
            ) {
                autoTitleXuLyRef.current.add(data.data.id)
                tuDongDeXuatTieuDe(data.data.id, data.data.title, data.data.content)
            }
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

            const listMoi = danhSach.filter(n => n.id !== ghiChuHienTai.id)

            setDanhSach(listMoi)
            banDaLuuRef.current = ''

            if (listMoi.length > 0) {
                setGhiChuHienTai(listMoi[0])
                banDaLuuRef.current = taoDauMocGhiChu(listMoi[0])
                navigate(`/notes/${listMoi[0].id}`, { replace: true })
            } else {
                setGhiChuHienTai(null)
                navigate('/notes', { replace: true })
            }

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
        } catch { }
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

        let noiDungMoiApDung = null

        setGhiChuHienTai(p => {
            if (!p) return p

            let tieuDeMoi = p.title

            if (ketQua.suggestedTitle) {
                tieuDeMoi = ketQua.suggestedTitle
            }

            if (ketQua.improvedContent) {
                noiDungMoiApDung = ketQua.improvedContent
            } else if (ketQua.summary) {
                noiDungMoiApDung = `${(p.content || '').trim()}\n\n---\n\n## AI Summary\n${ketQua.summary}`
            }

            return {
                ...p,
                title: tieuDeMoi,
                content: noiDungMoiApDung !== null ? noiDungMoiApDung : p.content,
            }
        })

        // Nội dung ghi chú đang được soạn thảo real-time qua Yjs, nên phải đẩy
        // thẳng vào editor đang chạy (qua ref) thì mới thực sự đổi trên màn hình
        // và được lưu lại — chỉ đổi state React của component cha là không đủ.
        if (noiDungMoiApDung !== null) {
            richTextEditorRef.current?.setContentHtml(noiDungMoiApDung)
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hienShare, ghiChuHienTai?.id])

    const taiLichSuPhienBan = async () => {
        if (!ghiChuHienTai?.id) return

        setDangTaiLichSu(true)

        try {
            const { data } = await noteApi.layPhienBan(ghiChuHienTai.id)
            setLichSuPhienBan(data.data || [])
        } catch {
            toast.error('Không tải được lịch sử phiên bản')
        } finally {
            setDangTaiLichSu(false)
        }
    }

    useEffect(() => {
        if (hienLichSu && ghiChuHienTai?.id) {
            taiLichSuPhienBan()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hienLichSu, ghiChuHienTai?.id])

    useEffect(() => {
        const token = localStorage.getItem('velora_token')

        if (!ghiChuHienTai?.id || !token) return undefined

        const source = new EventSource(noteApi.taoRealtimeUrl(ghiChuHienTai.id, token))

        source.addEventListener('note-updated', event => {
            try {
                const payload = JSON.parse(event.data)

                if (payload.editorSessionId === editorSessionIdRef.current) return
                if (!payload.note || payload.note.id !== ghiChuHienTaiRef.current?.id) return

                const noteMoi = {
                    ...payload.note,
                    accessMode: ghiChuHienTaiRef.current?.accessMode || payload.note.accessMode,
                }

                banDaLuuRef.current = taoDauMocGhiChu(noteMoi)
                setGhiChuHienTai(noteMoi)
                setDanhSach(p => p.map(n => n.id === noteMoi.id ? { ...n, ...noteMoi } : n))

                if (hienLichSu) {
                    taiLichSuPhienBan()
                }
            } catch {
                // Bỏ qua event không đúng định dạng.
            }
        })

        return () => source.close()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ghiChuHienTai?.id, hienLichSu, taoDauMocGhiChu])

    const khoiPhucPhienBan = async (version) => {
        if (!ghiChuHienTai?.id) return
        if (!window.confirm(`Khôi phục phiên bản #${version.versionNumber}?`)) return

        setDangKhoiPhucVersionId(version.id)

        try {
            const { data } = await noteApi.khoiPhucPhienBan(ghiChuHienTai.id, version.id)
            const noteMoi = data.data

            banDaLuuRef.current = taoDauMocGhiChu(noteMoi)
            setGhiChuHienTai(noteMoi)
            setDanhSach(p => p.map(n => n.id === noteMoi.id ? { ...n, ...noteMoi } : n))
            await taiLichSuPhienBan()
            toast.success('Đã khôi phục phiên bản')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể khôi phục phiên bản')
        } finally {
            setDangKhoiPhucVersionId(null)
        }
    }

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

    const capNhatQuyenChiaSe = async (shareId, permission) => {
        if (!coTinhNang('TEAM_WORK')) {
            toast.error(getUpgradeMessage('TEAM_WORK'))
            navigate('/service-packages')
            return
        }

        const current = shareList.find(item => item.id === shareId)
        if (!current || current.permission === permission) return

        setDangDoiQuyenShareId(shareId)

        try {
            const { data } = await noteApi.capNhatQuyenChiaSe(shareId, { permission })
            const itemMoi = data.data

            setShareList(p => p.map(item => item.id === shareId ? itemMoi : item))
            toast.success('Đã cập nhật quyền chia sẻ')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật quyền chia sẻ')
        } finally {
            setDangDoiQuyenShareId(null)
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

        return new RegExp(
            '\\b(?:' +
            // Giờ cụ thể: 14:30, 9.00, 20 giờ
            '\\d{1,2}[:.][0-5]\\d' +
            '|[0-2]?\\d\\s*(?:giờ|h)\\b' +
            // Ngày tương đối: hôm nay, ngày mai, ngày mốt/kia, hôm qua
            '|(?:ngày\\s*)?(?:hôm\\s*nay|hôm\\s*qua)' +
            '|ngày\\s*(?:mai|mốt|kia)' +
            // Tuần/tháng tương đối
            '|tuần\\s*(?:này|sau|tới|trước)' +
            '|tháng\\s*(?:này|sau|tới|trước)' +
            '|cuối\\s*tuần' +
            // Ngày cụ thể dạng số: ngày 20, 20/7, 20-07-2026, 20/07
            '|ngày\\s*\\d{1,2}' +
            '|\\d{1,2}[/\\-]\\d{1,2}(?:[/\\-]\\d{2,4})?' +
            '|tháng\\s*\\d{1,2}' +
            // Thứ trong tuần
            '|thứ\\s*(?:hai|ba|tư|năm|sáu|bảy)\\b' +
            '|chủ\\s*nhật' +
            // Từ khoá deadline/hạn chót trực tiếp
            '|deadline|hạn\\s*(?:chót|nộp)?|nộp\\s*(?:bài|báo\\s*cáo)' +
            ')',
            'i'
        ).test(text)
    }

    useEffect(() => {
        if (!ghiChuHienTai) return

        const daTaoLich = noteDaTaoLichIds.has(ghiChuHienTai.id)
        const duocTrichLich = coTinhNang('EXTRACT_SCHEDULE')

        setHienLichGoiY(
            duocTrichLich &&
            !daTaoLich &&
            coTheTrichLich(richTextToPlainText(ghiChuHienTai.content))
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
            .catch(() => { })
    }, [])

    const trichXuatLich = async () => {
        if (!coTinhNang('EXTRACT_SCHEDULE')) {
            toast.error(getUpgradeMessage('EXTRACT_SCHEDULE'))
            navigate('/service-packages')
            return
        }

        const plainContent = richTextToPlainText(ghiChuHienTai.content)

        if (!plainContent) return

        setDangTrichLich(true)

        try {
            const { data } = await scheduleApi.trichXuatTuGhiChu({
                content: plainContent,
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
        if (taoDauMocGhiChu(ghiChuHienTai) === banDaLuuRef.current) return

        const t = setTimeout(luu, 3000)

        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        ghiChuHienTai?.content,
        ghiChuHienTai?.title,
        ghiChuHienTai?.tags,
        coTheChinhSua,
        taoDauMocGhiChu,
    ])

    const danhSachHienThi = useMemo(() => {
        if (locNhanh === 'BOOKMARKED') {
            return danhSach.filter(n => n.isBookmarked)
        }

        return danhSach
    }, [danhSach, locNhanh])

    const collaborationUrl = useMemo(() => {
        const token = localStorage.getItem('velora_token')
        if (!ghiChuHienTai?.id || !token) return null

        return noteApi.taoCollabUrl(ghiChuHienTai.id, token)
    }, [ghiChuHienTai?.id])

    const capNhatQuyenTuCongTac = useCallback((nextAccessMode) => {
        setGhiChuHienTai(p => {
            if (!p) return p

            const nextNote = {
                ...p,
                accessMode: p.accessMode === 'OWNER' ? 'OWNER' : nextAccessMode,
            }

            ghiChuHienTaiRef.current = nextNote
            return nextNote
        })
    }, [])

    const tagDangChon = tags.find(t => t.id === locTag)
    const soTu = demTu(ghiChuHienTai?.content || '')
    const soKyTu = layPlainText(ghiChuHienTai?.content || '').length

    return (
        <div style={styles.wrap}>
            <aside style={styles.list}>
                <div style={styles.listHeader}>
                    <div style={styles.listTitleRow}>
                        <div>
                            <h1 style={styles.pageTitle}>Ghi chú</h1>
                            <p style={styles.pageSub}>Viết, lưu và ôn tập kiến thức</p>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={taoMoi}
                            style={styles.createButton}
                            title="Tạo ghi chú mới"
                        >
                            <IconPlus size={15} />
                        </button>
                    </div>

                    <div style={styles.searchRow}>
                        <div style={styles.searchWrap}>
                            <IconSearch size={15} style={styles.searchIcon} />

                            <input
                                placeholder="Tìm kiếm ghi chú..."
                                style={styles.searchInput}
                                value={timKiem}
                                onChange={e => setTimKiem(e.target.value)}
                            />
                        </div>

                        <button
                            className="btn-ghost"
                            style={styles.filterIconButton}
                            title="Bộ lọc"
                        >
                            <IconFilter size={15} />
                        </button>
                    </div>

                    <div style={styles.quickTabs}>
                        <button
                            className={locNhanh === 'ALL' ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setLocNhanh('ALL')}
                            style={styles.quickTab}
                        >
                            Tất cả
                        </button>

                        <button
                            className={locNhanh === 'BOOKMARKED' ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setLocNhanh('BOOKMARKED')}
                            style={styles.quickTab}
                        >
                            Đã ghim
                        </button>

                        <button
                            className={locTag ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setHienTag(p => !p)}
                            style={styles.quickTab}
                        >
                            {tagDangChon?.name || 'Tag'}
                        </button>
                    </div>

                    <div style={styles.tagFilter}>
                        <button
                            className={locTag ? 'btn-ghost' : 'btn-ai'}
                            onClick={() => setLocTag(null)}
                            style={styles.tagFilterButton}
                        >
                            Tất cả
                        </button>

                        {tags.slice(0, 8).map(t => (
                            <button
                                key={t.id}
                                style={{
                                    ...styles.tagFilterButton,
                                    background: locTag === t.id
                                        ? 'var(--bg-ai)'
                                        : 'transparent',
                                }}
                                className={locTag === t.id ? 'btn-ai' : 'btn-ghost'}
                                onClick={() => setLocTag(locTag === t.id ? null : t.id)}
                            >
                                <span
                                    style={{
                                        ...styles.tagDot,
                                        background: t.color || '#3B82F6',
                                    }}
                                />
                                {t.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.listBody}>
                    {dangTai ? (
                        <div style={styles.loadingBox}>
                            <Spinner />
                        </div>
                    ) : danhSachHienThi.length === 0 ? (
                        <div style={styles.emptyList}>
                            <EmptyState
                                icon={IconSearch}
                                title="Không tìm thấy ghi chú"
                                desc="Thử tạo ghi chú mới hoặc đổi bộ lọc"
                                action={
                                    <button className="btn-primary" onClick={taoMoi}>
                                        <IconPlus size={13} />
                                        Ghi chú mới
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        danhSachHienThi.map(n => {
                            const active = ghiChuHienTai?.id === n.id
                            const firstTag = n.tags?.[0]

                            return (
                                <button
                                    key={n.id}
                                    style={{
                                        ...styles.noteItem,
                                        ...(active ? styles.noteItemActive : {}),
                                    }}
                                    onClick={() => chonGhiChu(n.id)}
                                >
                                    <div style={styles.noteItemTop}>
                                        <div style={styles.noteIconWrap}>
                                            <IconFileText size={15} />
                                        </div>

                                        <div style={styles.noteInfo}>
                                            <div style={styles.noteTitle}>
                                                {n.title || 'Không có tiêu đề'}
                                            </div>

                                            <div style={styles.noteTime}>
                                                {layNgayCapNhat(n)}
                                            </div>
                                        </div>

                                        {n.isBookmarked && (
                                            <IconBookmarkFilled
                                                size={15}
                                                style={{ color: 'var(--accent-amber)' }}
                                            />
                                        )}
                                    </div>

                                    <p style={styles.notePreview}>
                                        {layPreview(n)}
                                    </p>

                                    <div style={styles.noteMeta}>
                                        {firstTag ? (
                                            <span style={styles.noteTag}>
                                                <span
                                                    style={{
                                                        ...styles.tagDot,
                                                        background: firstTag.color || '#3B82F6',
                                                    }}
                                                />
                                                {firstTag.name}
                                            </span>
                                        ) : (
                                            <span style={styles.noteTagMuted}>Chưa có tag</span>
                                        )}

                                        <IconChevronRight size={13} style={styles.chevron} />
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </aside>

            <main style={styles.editor}>
                {!ghiChuHienTai ? (
                    <div style={styles.emptyEditor}>
                        <EmptyState
                            icon={IconPlus}
                            title="Chọn hoặc tạo ghi chú"
                            desc="Ghi chú của bạn sẽ xuất hiện tại đây"
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
                            <div style={styles.titleArea}>
                                <input
                                    value={ghiChuHienTai.title || ''}
                                    onChange={e => capNhatTruongGhiChu('title', e.target.value)}
                                    readOnly={!coTheChinhSua}
                                    placeholder="Tiêu đề ghi chú..."
                                    style={{
                                        ...styles.tieuDe,
                                        cursor: coTheChinhSua ? 'text' : 'default',
                                        color: coTheChinhSua ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    }}
                                />

                                <div style={styles.titleMeta}>
                                    <span style={styles.metaPill}>
                                        {accessMode === 'VIEW'
                                            ? 'Chỉ xem'
                                            : accessMode === 'EDIT'
                                                ? 'Được chỉnh sửa'
                                                : 'Chủ sở hữu'}
                                    </span>

                                    <span>{soTu} từ</span>
                                    <span>·</span>
                                    <span>{soKyTu} ký tự</span>
                                    <span>·</span>
                                    <span>{layNgayCapNhat(ghiChuHienTai)}</span>

                                    {dangLuu ? (
                                        <span style={styles.savingPill}>Đang lưu...</span>
                                    ) : (
                                        <span style={styles.savedPill}>
                                            <IconCheck size={12} />
                                            Đã lưu
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={styles.toolbarRight}>
                                {laChuSoHuu && (
                                    <button
                                        className="btn-ghost"
                                        onClick={danhDau}
                                        title={ghiChuHienTai.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                                        style={styles.iconButton}
                                    >
                                        {ghiChuHienTai.isBookmarked ? (
                                            <IconBookmarkFilled
                                                size={16}
                                                style={{ color: 'var(--accent-amber)' }}
                                            />
                                        ) : (
                                            <IconBookmark size={16} />
                                        )}
                                    </button>
                                )}

                                {laChuSoHuu && coTinhNang('AI_FLASHCARD') && (
                                    <button
                                        className="btn-ghost"
                                        onClick={handleTaoFlashcard}
                                        disabled={dangTaoFlashcard}
                                        style={styles.actionButton}
                                        title="Tạo bộ câu hỏi ôn tập chuyển trang"
                                    >
                                        <IconCards
                                            size={14}
                                            className={dangTaoFlashcard ? 'animate-spin' : ''}
                                        />
                                        Flashcard
                                    </button>
                                )}

                                {laChuSoHuu && coTinhNang('EXPORT_FILE') && (
                                    <>
                                        <button
                                            className="btn-ghost"
                                            onClick={() => taiXuongGhiChu('pdf')}
                                            style={styles.actionButton}
                                            title="Export ghi chú ra PDF"
                                        >
                                            <IconDownload size={14} />
                                            PDF
                                        </button>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => taiXuongGhiChu('docx')}
                                            style={styles.actionButton}
                                            title="Export ghi chú ra Word"
                                        >
                                            <IconDownload size={14} />
                                            Word
                                        </button>
                                    </>
                                )}

                                {laChuSoHuu && coTinhNang('TEAM_WORK') && (
                                    <button
                                        className={hienShare ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setHienShare(p => !p)
                                            setHienAi(false)
                                            setHienSoDo(false)
                                            setHienTag(false)
                                            setHienLichSu(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Chia sẻ ghi chú"
                                    >
                                        <IconShare size={14} />
                                        Chia sẻ
                                    </button>
                                )}

                                {ghiChuHienTai?.id && (
                                    <button
                                        className={hienLichSu ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setHienLichSu(p => !p)
                                            setHienAi(false)
                                            setHienSoDo(false)
                                            setHienTag(false)
                                            setHienShare(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Lịch sử phiên bản"
                                    >
                                        <IconHistory size={14} />
                                        Lịch sử
                                    </button>
                                )}

                                {coTheChinhSua && (
                                    <button
                                        className={hienAi ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setHienAi(p => !p)
                                            setHienSoDo(false)
                                            setHienTag(false)
                                            setHienShare(false)
                                            setHienLichSu(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Trợ lý AI"
                                    >
                                        <IconSparkles size={14} />
                                        AI
                                    </button>
                                )}

                                {ghiChuHienTai?.id && (
                                    <button
                                        className={hienSoDo ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setHienSoDo(p => !p)
                                            setHienAi(false)
                                            setHienTag(false)
                                            setHienShare(false)
                                            setHienLichSu(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Tạo sơ đồ từ ghi chú"
                                    >
                                        <IconSparkles size={14} />
                                        Sơ đồ
                                    </button>
                                )}

                                {coTheChinhSua && (
                                    <button
                                        className={hienTag ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setHienTag(p => !p)
                                            setHienAi(false)
                                            setHienSoDo(false)
                                            setHienShare(false)
                                            setHienLichSu(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Gắn tag"
                                    >
                                        <IconTag size={14} />
                                        Tag
                                    </button>
                                )}

                                {laChuSoHuu && (
                                    <button
                                        className="btn-danger btn-ghost"
                                        onClick={xoa}
                                        title="Xoá"
                                        style={styles.iconButton}
                                    >
                                        <IconTrash size={14} />
                                    </button>
                                )}

                                {coTheChinhSua && (
                                    <button
                                        className="btn-primary"
                                        onClick={luu}
                                        style={styles.saveButton}
                                    >
                                        <IconCheck size={13} /> Lưu
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={styles.editorBody}>
                            <div style={styles.editorPaper}>
                                <div style={styles.editorTagsRow}>
                                    {(ghiChuHienTai.tags || []).length > 0 ? (
                                        ghiChuHienTai.tags.map(tag => (
                                            <span key={tag.id} style={styles.editorTag}>
                                                <span
                                                    style={{
                                                        ...styles.tagDot,
                                                        background: tag.color || '#3B82F6',
                                                    }}
                                                />
                                                {tag.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={styles.editorTagMuted}>Chưa có tag</span>
                                    )}

                                    {coTheChinhSua && (
                                        <button
                                            className="btn-ghost"
                                            style={styles.addTagButton}
                                            onClick={() => setHienTag(true)}
                                        >
                                            <IconPlus size={12} />
                                            Thêm tag
                                        </button>
                                    )}
                                </div>

                                <RichTextEditor
                                    ref={richTextEditorRef}
                                    key={ghiChuHienTai.id}
                                    noteId={ghiChuHienTai.id}
                                    collaborationUrl={collaborationUrl}
                                    currentUser={nguoiDung}
                                    value={ghiChuHienTai.content || ''}
                                    onChange={content => capNhatTruongGhiChu('content', content)}
                                    onPermissionChange={capNhatQuyenTuCongTac}
                                    readOnly={!coTheChinhSua}
                                    placeholder={coTheChinhSua ? 'Bắt đầu ghi chú...' : 'Bạn chỉ có quyền xem ghi chú này'}
                                />
                            </div>

                            {hienLichGoiY && (
                                <div style={styles.schedulePrompt}>
                                    <div style={styles.scheduleIcon}>
                                        <IconCalendarEvent size={18} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={styles.scheduleTitle}>
                                            AI phát hiện thông tin thời gian
                                        </div>

                                        <div style={styles.scheduleDesc}>
                                            Bạn có muốn trích xuất lịch / công việc từ ghi chú này?
                                        </div>

                                        <div style={styles.scheduleActions}>
                                            <button
                                                className="btn-primary"
                                                onClick={trichXuatLich}
                                                disabled={dangTrichLich}
                                                style={styles.scheduleButton}
                                            >
                                                {dangTrichLich ? 'Đang xử lý...' : 'Có, tạo lịch'}
                                            </button>

                                            <button
                                                className="btn-ghost"
                                                onClick={() => setHienLichGoiY(false)}
                                                style={styles.scheduleButton}
                                            >
                                                Để sau
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {hienTag && (
                                <div style={styles.tagPanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconTag size={15} />
                                            Tag ghi chú
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setHienTag(false)}
                                            style={styles.closeButton}
                                        >
                                            <IconX size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.sidePanelBody}>
                                        <div style={styles.tagCreateBox}>
                                            <div style={styles.miniLabel}>Tạo tag mới</div>

                                            <input
                                                value={tenTagMoi}
                                                onChange={e => setTenTagMoi(e.target.value)}
                                                placeholder="Tên tag mới..."
                                                style={styles.panelInput}
                                            />

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={mauTagMoi}
                                                    onChange={e => setMauTagMoi(e.target.value)}
                                                    style={styles.colorInput}
                                                />

                                                <button
                                                    className="btn-primary"
                                                    onClick={taoTagMoi}
                                                    style={styles.panelPrimaryButton}
                                                >
                                                    <IconPlus size={12} /> Tạo tag
                                                </button>
                                            </div>
                                        </div>

                                        <div style={styles.tagListBox}>
                                            <div style={styles.miniLabel}>Tag hiện có</div>

                                            {tags.length === 0 ? (
                                                <div style={styles.emptyPanelText}>
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
                                                                    ...styles.tagDot,
                                                                    background: tag.color || '#3B82F6',
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
                                            style={styles.panelWideButton}
                                        >
                                            Lưu tag cho ghi chú
                                        </button>
                                    </div>
                                </div>
                            )}

                            {hienShare && (
                                <div style={styles.sharePanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconShare size={15} />
                                            Chia sẻ ghi chú
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setHienShare(false)}
                                            style={styles.closeButton}
                                        >
                                            <IconX size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.sidePanelBody}>
                                        <div style={styles.shareBox}>
                                            <div style={styles.miniLabel}>Người nhận</div>

                                            <input
                                                value={shareEmail}
                                                onChange={e => setShareEmail(e.target.value)}
                                                placeholder="Email người nhận..."
                                                style={styles.panelInput}
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
                                                style={styles.panelWideButton}
                                            >
                                                <IconUserPlus size={12} />
                                                {dangShare ? 'Đang chia sẻ...' : 'Chia sẻ'}
                                            </button>
                                        </div>

                                        <div style={styles.shareListBox}>
                                            <div style={styles.miniLabel}>Đã chia sẻ</div>

                                            {shareList.length === 0 ? (
                                                <div style={styles.emptyPanelText}>
                                                    Chưa chia sẻ cho ai
                                                </div>
                                            ) : (
                                                shareList.map(item => (
                                                    <div key={item.id} style={styles.shareItem}>
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={styles.shareEmail}>
                                                                {item.sharedWithEmail}
                                                            </div>

                                                            <select
                                                                value={item.permission}
                                                                onChange={e => capNhatQuyenChiaSe(item.id, e.target.value)}
                                                                disabled={dangDoiQuyenShareId === item.id}
                                                                style={styles.sharePermissionSelect}
                                                            >
                                                                <option value="VIEW">Chỉ xem</option>
                                                                <option value="EDIT">Có thể chỉnh sửa</option>
                                                            </select>
                                                        </div>

                                                        <button
                                                            className="btn-ghost"
                                                            onClick={() => huyChiaSe(item.id)}
                                                            style={styles.shareRemoveButton}
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

                            {hienLichSu && (
                                <div style={styles.historyPanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconHistory size={15} />
                                            Lịch sử phiên bản
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setHienLichSu(false)}
                                            style={styles.closeButton}
                                        >
                                            <IconX size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.sidePanelBody}>
                                        {dangTaiLichSu ? (
                                            <div style={styles.loadingBox}>
                                                <Spinner />
                                            </div>
                                        ) : lichSuPhienBan.length === 0 ? (
                                            <div style={styles.emptyPanelText}>
                                                Chưa có phiên bản nào
                                            </div>
                                        ) : (
                                            <div style={styles.versionList}>
                                                {lichSuPhienBan.map(version => {
                                                    const preview = layPlainText(version.content || '').trim()
                                                    const versionDate = parseNgayTuApi(version.createdAt)
                                                    const createdAt = versionDate
                                                        ? versionDate.toLocaleString('vi-VN')
                                                        : 'Vừa xong'

                                                    return (
                                                        <div key={version.id} style={styles.versionItem}>
                                                            <div style={styles.versionTop}>
                                                                <div style={styles.versionTitle}>
                                                                    Phiên bản #{version.versionNumber}
                                                                </div>

                                                                <button
                                                                    className="btn-ghost"
                                                                    onClick={() => khoiPhucPhienBan(version)}
                                                                    disabled={!coTheChinhSua || dangKhoiPhucVersionId === version.id}
                                                                    style={styles.restoreButton}
                                                                    title="Khôi phục phiên bản này"
                                                                >
                                                                    <IconRestore size={12} />
                                                                </button>
                                                            </div>

                                                            <div style={styles.versionMeta}>
                                                                {createdAt}
                                                            </div>

                                                            <div style={styles.versionMeta}>
                                                                {version.editedByName || version.editedByEmail || 'Không rõ người sửa'}
                                                            </div>

                                                            <div style={styles.versionNoteTitle}>
                                                                {version.title || 'Không có tiêu đề'}
                                                            </div>

                                                            <p style={styles.versionPreview}>
                                                                {preview || 'Chưa có nội dung'}
                                                            </p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {hienAi && (
                                <AiPanel
                                    noteId={ghiChuHienTai.id}
                                    content={richTextToPlainText(ghiChuHienTai.content)}
                                    title={ghiChuHienTai.title}
                                    onApply={apDungAi}
                                    onInsertChecklist={(html) => {
                                        if (!coTheChinhSua) {
                                            toast.error('Bạn không có quyền chỉnh sửa ghi chú này')
                                            return
                                        }
                                        richTextEditorRef.current?.insertHtmlAtEnd(html)
                                    }}
                                    onDong={() => setHienAi(false)}
                                />
                            )}

                            {hienSoDo && (
                                <NoteDiagramGenerator
                                    noteId={ghiChuHienTai.id}
                                    onDong={() => setHienSoDo(false)}
                                    onChenVaoGhiChu={(html) => {
                                        if (!coTheChinhSua) {
                                            toast.error('Bạn không có quyền chỉnh sửa ghi chú này')
                                            return
                                        }
                                        richTextEditorRef.current?.insertHtmlAtEnd(html)
                                        toast.success('Đã chèn sơ đồ vào ghi chú')
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}
            </main>

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
                                style={styles.closeButton}
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
        display: 'grid',
        gridTemplateColumns: '320px minmax(0, 1fr)',
        flex: 1,
        overflow: 'hidden',
        height: '100%',
        background: 'var(--bg-base)',
    },
    list: {
        minWidth: 0,
        borderRight: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
    },
    listHeader: {
        padding: '18px 14px 12px',
        borderBottom: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    listTitleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '-.45px',
        color: 'var(--text-primary)',
        margin: 0,
    },
    pageSub: {
        margin: '3px 0 0',
        color: 'var(--text-muted)',
        fontSize: 12,
    },
    createButton: {
        width: 34,
        height: 34,
        padding: 0,
        justifyContent: 'center',
        flexShrink: 0,
    },
    searchRow: {
        display: 'flex',
        gap: 8,
    },
    searchWrap: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        color: 'var(--text-muted)',
        pointerEvents: 'none',
    },
    searchInput: {
        width: '100%',
        height: 40,
        paddingLeft: 36,
        paddingRight: 12,
        fontSize: 13,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        color: 'var(--text-primary)',
        boxShadow: 'none',
    },
    filterIconButton: {
        width: 40,
        height: 40,
        padding: 0,
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: 12,
    },
    quickTabs: {
        display: 'flex',
        gap: 7,
        overflowX: 'auto',
    },
    quickTab: {
        fontSize: 12,
        padding: '6px 10px',
        whiteSpace: 'nowrap',
        borderRadius: 999,
    },
    tagFilter: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        maxHeight: 74,
        overflow: 'auto',
    },
    tagFilterButton: {
        fontSize: 11,
        padding: '4px 8px',
        gap: 5,
        borderRadius: 999,
    },
    tagDot: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        display: 'inline-block',
        flexShrink: 0,
    },
    listBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px 10px 16px',
    },
    loadingBox: {
        display: 'flex',
        justifyContent: 'center',
        padding: 30,
    },
    emptyList: {
        paddingTop: 40,
    },
    noteItem: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        textAlign: 'left',
        padding: 12,
        border: '.5px solid var(--border-light)',
        borderRadius: 14,
        background: 'var(--bg-surface)',
        marginBottom: 10,
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'border-color .15s, background .15s, transform .15s, box-shadow .15s',
    },
    noteItemActive: {
        background: 'linear-gradient(135deg, var(--bg-ai), var(--bg-surface))',
        borderColor: 'var(--border-blue)',
        boxShadow: '0 8px 20px rgba(37, 99, 235, .08)',
    },
    noteItemTop: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minWidth: 0,
    },
    noteIconWrap: {
        width: 31,
        height: 31,
        borderRadius: 10,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    noteInfo: {
        flex: 1,
        minWidth: 0,
    },
    noteTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    noteTime: {
        marginTop: 2,
        fontSize: 11,
        color: 'var(--text-muted)',
    },
    notePreview: {
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        margin: 0,
        minHeight: 36,
        maxHeight: 38,
        overflow: 'hidden',
    },
    noteMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    noteTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        maxWidth: '80%',
        fontSize: 11,
        color: 'var(--text-secondary)',
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        padding: '4px 8px',
        borderRadius: 999,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    noteTagMuted: {
        fontSize: 11,
        color: 'var(--text-faint)',
    },
    chevron: {
        color: 'var(--text-faint)',
        flexShrink: 0,
    },

    editor: {
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-base)',
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
        gap: 14,
        padding: '14px 18px',
        borderBottom: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
    },
    titleArea: {
        flex: 1,
        minWidth: 0,
    },
    tieuDe: {
        width: '100%',
        background: 'transparent',
        border: 'none',
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '-.45px',
        color: 'var(--text-primary)',
        padding: 0,
        outline: 'none',
        boxShadow: 'none',
    },
    titleMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        flexWrap: 'wrap',
        color: 'var(--text-muted)',
        fontSize: 11.5,
        marginTop: 8,
    },
    metaPill: {
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        border: '.5px solid var(--border-blue)',
        padding: '3px 8px',
        borderRadius: 999,
        fontWeight: 500,
    },
    savedPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--accent-green)',
        background: 'rgba(22, 163, 74, .08)',
        border: '.5px solid rgba(22, 163, 74, .14)',
        padding: '3px 8px',
        borderRadius: 999,
        fontWeight: 500,
    },
    savingPill: {
        color: 'var(--accent-amber)',
        background: 'rgba(245, 158, 11, .10)',
        border: '.5px solid rgba(245, 158, 11, .16)',
        padding: '3px 8px',
        borderRadius: 999,
        fontWeight: 500,
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        flexShrink: 0,
        flexWrap: 'wrap',
        maxWidth: '54%',
    },
    iconButton: {
        width: 34,
        height: 34,
        padding: 0,
        justifyContent: 'center',
        borderRadius: 10,
    },
    actionButton: {
        gap: 5,
        fontSize: 12,
        padding: '7px 9px',
        borderRadius: 10,
    },
    saveButton: {
        padding: '7px 12px',
        fontSize: 12,
        borderRadius: 10,
    },

    editorBody: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
        padding: 18,
        gap: 14,
    },
    editorPaper: {
        flex: 1,
        minWidth: 0,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 10px 28px rgba(15, 23, 42, .035)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    editorTagsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '12px 16px',
        borderBottom: '.5px solid var(--border-light)',
        minHeight: 50,
    },
    editorTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        color: 'var(--text-secondary)',
        padding: '5px 9px',
        borderRadius: 999,
        fontSize: 11.5,
    },
    editorTagMuted: {
        color: 'var(--text-muted)',
        fontSize: 12,
    },
    addTagButton: {
        fontSize: 11.5,
        padding: '5px 8px',
        borderColor: 'transparent',
        color: 'var(--accent-blue)',
    },

    schedulePrompt: {
        width: 320,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        padding: 14,
        display: 'flex',
        alignSelf: 'flex-start',
        gap: 10,
        boxShadow: '0 10px 28px rgba(15, 23, 42, .04)',
    },
    scheduleIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    scheduleTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 4,
    },
    scheduleDesc: {
        color: 'var(--text-muted)',
        fontSize: 12,
        lineHeight: 1.45,
        marginBottom: 10,
    },
    scheduleActions: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
    },
    scheduleButton: {
        justifyContent: 'center',
        fontSize: 12,
        padding: '7px 8px',
    },

    tagPanel: {
        width: 300,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(15, 23, 42, .04)',
    },
    sharePanel: {
        width: 320,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(15, 23, 42, .04)',
    },
    historyPanel: {
        width: 340,
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(15, 23, 42, .04)',
    },
    sidePanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 14px',
        borderBottom: '.5px solid var(--border)',
    },
    panelTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        color: 'var(--text-primary)',
        fontSize: 13,
        fontWeight: 600,
    },
    closeButton: {
        width: 28,
        height: 28,
        padding: 0,
        justifyContent: 'center',
    },
    sidePanelBody: {
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
        flex: 1,
    },
    tagCreateBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
    },
    miniLabel: {
        fontSize: 11,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
    },
    panelInput: {
        fontSize: 12,
        height: 34,
        border: '.5px solid var(--border)',
        borderRadius: 10,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        padding: '0 10px',
    },
    colorInput: {
        width: 40,
        height: 34,
        padding: 0,
        border: '.5px solid var(--border)',
        borderRadius: 10,
        background: 'transparent',
        flexShrink: 0,
    },
    panelPrimaryButton: {
        flex: 1,
        justifyContent: 'center',
        fontSize: 12,
    },
    panelWideButton: {
        width: '100%',
        justifyContent: 'center',
        fontSize: 12,
        padding: '8px',
    },
    tagListBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
    },
    emptyPanelText: {
        fontSize: 12,
        color: 'var(--text-muted)',
        padding: '8px 0',
    },
    tagSelectItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'flex-start',
        fontSize: 12,
        padding: '8px 10px',
        border: '.5px solid var(--border)',
        borderRadius: 10,
    },
    shareBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
    },
    shareSelect: {
        height: 34,
        fontSize: 12,
        border: '.5px solid var(--border)',
        borderRadius: 10,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        padding: '0 10px',
    },
    shareListBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
    },
    shareItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        border: '.5px solid var(--border)',
        borderRadius: 12,
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
        fontSize: 10.5,
        color: 'var(--text-muted)',
        marginTop: 2,
    },
    sharePermissionSelect: {
        height: 28,
        marginTop: 6,
        fontSize: 11,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        padding: '0 8px',
        maxWidth: '100%',
    },
    shareRemoveButton: {
        width: 28,
        height: 28,
        padding: 0,
        justifyContent: 'center',
    },
    versionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    versionItem: {
        padding: 12,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
    },
    versionTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 6,
    },
    versionTitle: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    versionMeta: {
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 3,
    },
    versionNoteTitle: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginTop: 10,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    versionPreview: {
        margin: '6px 0 0',
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.45,
        maxHeight: 54,
        overflow: 'hidden',
    },
    restoreButton: {
        width: 28,
        height: 28,
        padding: 0,
        justifyContent: 'center',
        flexShrink: 0,
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
        width: 540,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        padding: 18,
        borderBottom: '.5px solid var(--border)',
    },
    modalTitle: {
        fontSize: 16,
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
        padding: 18,
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
        fontWeight: 600,
    },
    checklistPreview: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: 12,
    },
    checklistPreviewItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 12,
        color: 'var(--text-secondary)',
        padding: '6px 0',
        lineHeight: 1.5,
    },
    checkIndex: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
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
        height: 36,
        fontSize: 12,
        border: '.5px solid var(--border)',
        borderRadius: 10,
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
        padding: 18,
        borderTop: '.5px solid var(--border)',
    },
}
