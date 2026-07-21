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
import { DEFAULT_NOTE_TITLE } from '../../constants/noteConstants'

export default function Notes() {
    const { id: idParam } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const hasPackageFeature = (featureCode) => hasFeature(user, featureCode)

    const [items, setItems] = useState([])
    const [currentNote, setCurrentNote] = useState(null)

    const accessMode = currentNote?.accessMode || 'OWNER'
    const isOwner = accessMode === 'OWNER'
    const canEdit = accessMode === 'OWNER' || accessMode === 'EDIT'

    const [tags, setTags] = useState([])
    const [search, setSearch] = useState('')
    const [isLoading, setLoading] = useState(true)
    const [isSaving, setSaving] = useState(false)

    const [showAi, setShowAi] = useState(false)
    const [showDiagram, setShowDiagram] = useState(false)
    const [showTag, setShowTag] = useState(false)
    const [showShare, setShowShare] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showSuggestedSchedule, setShowSuggestedSchedule] = useState(false)

    const [isExtractingSchedule, setExtractingSchedule] = useState(false)
    const [tagFilter, setTagFilter] = useState(null)
    const [quickFilter, setQuickFilter] = useState('ALL')

    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState('#3B82F6')
    const [scheduledNoteIds, setScheduledNoteIds] = useState(new Set())
    const [dismissedScheduleNoteIds, setDismissedScheduleNoteIds] = useState(new Set())

    const [isCreatingFlashcards, setCreatingFlashcards] = useState(false)

    const [showChecklistModal, setShowChecklistModal] = useState(false)
    const [checklistItems, setChecklistItems] = useState([])
    const [checklistDeadline, setChecklistDeadline] = useState('')
    const [checklistPriority, setChecklistPriority] = useState('MEDIUM')
    const [isCreatingChecklistTask, setCreatingChecklistTask] = useState(false)

    const [shareEmail, setShareEmail] = useState('')
    const [sharePermission, setSharePermission] = useState('VIEW')
    const [shareList, setShareList] = useState([])
    const [isSharing, setSharing] = useState(false)
    const [changingSharePermissionId, setChangingSharePermissionId] = useState(null)
    const [versionHistory, setVersionHistory] = useState([])
    const [isLoadingHistory, setLoadingHistory] = useState(false)
    const [restoringVersionId, setRestoringVersionId] = useState(null)

    const savedVersionRef = useRef('')
    const idParamRef = useRef(idParam)
    const currentNoteRef = useRef(currentNote)
    const richTextEditorRef = useRef(null)
    const processedAutoTitleIdsRef = useRef(new Set())
    const editorSessionIdRef = useRef(
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    )

    useEffect(() => {
        idParamRef.current = idParam
    }, [idParam])

    useEffect(() => {
        currentNoteRef.current = currentNote
    }, [currentNote])

    const createNoteMilestone = useCallback((note) => {
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

    const getPlainText = (html) => {
        try {
            return richTextToPlainText(html || '')
        } catch {
            return String(html || '').replace(/<[^>]*>/g, ' ')
        }
    }

    const getPreview = (note) => {
        const previewFromApi = String(note?.contentPreview || '').trim()

        if (previewFromApi) {
            return previewFromApi.length > 110
                ? `${previewFromApi.slice(0, 110)}...`
                : previewFromApi
        }

        const text = getPlainText(note?.content || '').trim()

        if (text) {
            return text.length > 110 ? `${text.slice(0, 110)}...` : text
        }

        return 'Chưa có nội dung'
    }

    const parseApiDate = (raw) => {
        if (!raw) return null

        if (raw instanceof Date) return raw

        const value = String(raw)
        const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
        const normalized = hasTimezone ? value : `${value}Z`
        const date = new Date(normalized)

        return Number.isNaN(date.getTime()) ? null : date
    }

    const getUpdatedDate = (note) => {
        const raw = note?.updatedAt || note?.createdAt

        if (!raw) return 'Vừa xong'

        const date = parseApiDate(raw)

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

    const wordCount = (html) => {
        const text = getPlainText(html || '').trim()
        if (!text) return 0
        return text.split(/\s+/).filter(Boolean).length
    }

    const updateNoteField = (field, value) => {
        if (!canEdit) return

        setCurrentNote(p => ({
            ...p,
            [field]: value,
        }))
    }

    const loadItems = useCallback(async () => {
        setLoading(true)

        try {
            const params = { page: 0, size: 50 }

            if (search) params.keyword = search
            if (tagFilter) params.tagIds = tagFilter

            const { data } = await noteApi.getAll(params)
            const list = data.data?.content || []

            setItems(list)

            if (!idParamRef.current && !currentNoteRef.current && list.length > 0) {
                setCurrentNote(list[0])
                savedVersionRef.current = createNoteMilestone(list[0])
                navigate(`/notes/${list[0].id}`, { replace: true })
            }
        } catch {
            toast.error('Không tải được ghi chú')
        } finally {
            setLoading(false)
        }
    }, [search, tagFilter, navigate, createNoteMilestone])

    useEffect(() => {
        loadItems()
    }, [loadItems])

    useEffect(() => {
        tagApi.getAll()
            .then(r => setTags(r.data.data || []))
            .catch(() => { })
    }, [])

    useEffect(() => {
        if (!idParam) return
        if (currentNote?.id === idParam) return

        selectNote(idParam)

    }, [idParam, currentNote?.id])

    const selectNote = async (id) => {
        try {
            const { data } = await noteApi.getById(id)

            savedVersionRef.current = createNoteMilestone(data.data)
            setCurrentNote(data.data)
            setResultOnPanelClose()
            navigate(`/notes/${id}`, { replace: true })
        } catch {
            toast.error('Không thể mở ghi chú')
        }
    }

    const setResultOnPanelClose = () => {
        setShowAi(false)
        setShowDiagram(false)
        setShowTag(false)
        setShowShare(false)
        setShowHistory(false)
        setShareEmail('')
        setSharePermission('VIEW')
        setShareList([])
        setVersionHistory([])

        setShowChecklistModal(false)
        setChecklistItems([])
        setChecklistDeadline('')
        setChecklistPriority('MEDIUM')
    }

    const downloadNote = async (format) => {
        if (!hasPackageFeature('EXPORT_FILE')) {
            toast.error(getUpgradeMessage('EXPORT_FILE'))
            navigate('/service-packages')
            return
        }

        if (!currentNote?.id) {
            toast.error('Chưa chọn ghi chú để export')
            return
        }

        try {
            const response = format === 'pdf'
                ? await noteApi.exportPdf(currentNote.id)
                : await noteApi.exportWord(currentNote.id)

            const blob = new Blob([response.data], {
                type: response.headers['content-type'] || 'application/octet-stream',
            })

            const contentDisposition = response.headers['content-disposition']
            let fileName = `${currentNote.title || 'ghi-chu'}.${format === 'pdf' ? 'pdf' : 'docx'}`

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

    const handleCreateFlashcards = async () => {
        if (!hasPackageFeature('AI_FLASHCARD')) {
            toast.error(getUpgradeMessage('AI_FLASHCARD'))
            navigate('/service-packages')
            return
        }

        if (!currentNote || !currentNote.id) {
            toast.error('Không tìm thấy mã định danh ghi chú hợp lệ!')
            return
        }

        if (!hasRichTextContent(currentNote.content)) {
            toast.error('Vui lòng viết thêm nội dung kiến thức vào ghi chú để AI bóc tách!')
            return
        }

        setCreatingFlashcards(true)

        const loadToast = toast.loading('Trợ lý AI đang phân tích dữ liệu và soạn trang ôn tập...')

        try {
            const response = await flashcardApi.generate(currentNote.id)
            const cards = response.data?.data || response.data

            if (cards && cards.length > 0) {
                toast.success(`Đã biên soạn thành công ${cards.length} thẻ học tập!`, {
                    id: loadToast,
                })

                navigate(`/notes/${currentNote.id}/flashcards`)
            } else {
                toast.error('AI chưa tìm thấy đủ thông message cốt lõi để tạo bộ câu hỏi.', {
                    id: loadToast,
                })
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Không thể kết nối với mô hình AI lúc này.', {
                id: loadToast,
            })
        } finally {
            setCreatingFlashcards(false)
        }
    }

    const create = async () => {
        try {
            const { data } = await noteApi.create({
                title: DEFAULT_NOTE_TITLE,
                content: '',
            })

            const note = data.data

            savedVersionRef.current = createNoteMilestone(note)
            setItems(p => [note, ...p])
            setCurrentNote(note)
            navigate(`/notes/${note.id}`, { replace: true })
            toast.success('Đã tạo ghi chú mới')
        } catch {
            toast.error('Không thể tạo ghi chú')
        }
    }


    const autoSuggestTitle = async (noteId, currentTitle, contentHtml) => {
        const plainText = richTextToPlainText(contentHtml || '').trim()
        if (plainText.length < 20) return

        try {
            const { data } = await noteApi.improveWithAi(noteId, {
                content: plainText,
                title: currentTitle,
                action: 'SUGGEST_TITLE',
            })

            const suggestedTitle = data?.data?.suggestedTitle?.trim()
            if (!suggestedTitle) return

            if (currentNoteRef.current?.id !== noteId) return
            if (currentNoteRef.current?.title?.trim() !== DEFAULT_NOTE_TITLE) return

            const { data: updated } = await noteApi.update(noteId, {
                title: suggestedTitle,
                content: currentNoteRef.current.content,
                tagIds: currentNoteRef.current.tags?.map(t => t.id),
                editorSessionId: editorSessionIdRef.current,
            })

            setCurrentNote(updated.data)
            setItems(p => p.map(n => (n.id === updated.data.id ? { ...n, ...updated.data } : n)))
            savedVersionRef.current = createNoteMilestone(updated.data)

            toast.success(`Đã tự động đặt tiêu đề: "${suggestedTitle}"`)
        } catch {

        }
    }

    const save = async () => {
        if (!currentNote) return
        if (!canEdit) return

        const currentMilestone = createNoteMilestone(currentNote)
        if (currentMilestone === savedVersionRef.current) return

        setSaving(true)

        try {
            const { data } = await noteApi.update(currentNote.id, {
                title: currentNote.title,
                content: currentNote.content,
                tagIds: currentNote.tags?.map(t => t.id),
                editorSessionId: editorSessionIdRef.current,
            })

            setCurrentNote(data.data)

            setItems(p =>
                p.map(n => n.id === data.data.id ? { ...n, ...data.data } : n)
            )

            savedVersionRef.current = createNoteMilestone(data.data)

            if (
                data.data.title?.trim() === DEFAULT_NOTE_TITLE &&
                !processedAutoTitleIdsRef.current.has(data.data.id)
            ) {
                processedAutoTitleIdsRef.current.add(data.data.id)
                autoSuggestTitle(data.data.id, data.data.title, data.data.content)
            }
        } catch {
            toast.error('Lưu thất bại')
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!currentNote || !window.confirm('Xoá ghi chú này?')) return

        try {
            await noteApi.remove(currentNote.id)

            const newList = items.filter(n => n.id !== currentNote.id)

            setItems(newList)
            savedVersionRef.current = ''

            if (newList.length > 0) {
                setCurrentNote(newList[0])
                savedVersionRef.current = createNoteMilestone(newList[0])
                navigate(`/notes/${newList[0].id}`, { replace: true })
            } else {
                setCurrentNote(null)
                navigate('/notes', { replace: true })
            }

            toast.success('Đã xoá')
        } catch {
            toast.error('Xoá thất bại')
        }
    }

    const mark = async () => {
        if (!currentNote) return

        try {
            const { data } = await noteApi.mark(currentNote.id)

            setCurrentNote(data.data)
            setItems(p =>
                p.map(n =>
                    n.id === data.data.id
                        ? { ...n, isBookmarked: data.data.isBookmarked }
                        : n
                )
            )
        } catch { }
    }

    const getTodayIso = () => {
        const today = new Date()
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
        return today.toISOString().split('T')[0]
    }

    const applyAiResult = async (result) => {
        if (!result || !currentNote) return

        if (result.checklist?.length > 0) {
            if (!hasPackageFeature('CHECKLIST_BASIC')) {
                toast.error(getUpgradeMessage('CHECKLIST_BASIC'))
                navigate('/service-packages')
                return
            }

            const tasks = result.checklist
                .map(item => typeof item === 'string' ? item.trim() : '')
                .filter(Boolean)

            if (tasks.length === 0) {
                toast.error('Checklist không có nội dung hợp lệ')
                return
            }

            setChecklistItems(tasks)
            setChecklistDeadline('')
            setChecklistPriority('MEDIUM')
            setShowChecklistModal(true)

            return
        }

        let newAppliedContent = null

        setCurrentNote(p => {
            if (!p) return p

            let newTitle = p.title

            if (result.suggestedTitle) {
                newTitle = result.suggestedTitle
            }

            if (result.improvedContent) {
                newAppliedContent = result.improvedContent
            } else if (result.summary) {
                newAppliedContent = `${(p.content || '').trim()}\n\n---\n\n## AI Summary\n${result.summary}`
            }

            return {
                ...p,
                title: newTitle,
                content: newAppliedContent !== null ? newAppliedContent : p.content,
            }
        })

        if (newAppliedContent !== null) {
            richTextEditorRef.current?.setContentHtml(newAppliedContent)
        }
    }

    const confirmCreateTasksFromChecklist = async () => {
        if (!currentNote?.id) {
            toast.error('Chưa chọn ghi chú')
            return
        }

        if (checklistItems.length === 0) {
            toast.error('Checklist không có nội dung hợp lệ')
            return
        }

        if (checklistDeadline && checklistDeadline < getTodayIso()) {
            toast.error('Deadline không được nằm trong quá khứ')
            return
        }

        setCreatingChecklistTask(true)

        const toastId = toast.loading('Đang tạo task từ checklist AI...')

        try {
            await Promise.all(
                checklistItems.map(taskName =>
                    scheduleApi.create({
                        taskName,
                        description: `Tạo từ checklist AI của ghi chú: ${currentNote.title || 'Không có tiêu đề'}`,
                        deadline: checklistDeadline || null,
                        priority: checklistPriority,
                        noteId: currentNote.id,
                    })
                )
            )

            toast.success(`Đã tạo ${checklistItems.length} task từ checklist AI`, {
                id: toastId,
            })

            setChecklistItems([])
            setChecklistDeadline('')
            setChecklistPriority('MEDIUM')
            setShowChecklistModal(false)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo task từ checklist AI', {
                id: toastId,
            })
        } finally {
            setCreatingChecklistTask(false)
        }
    }

    const createNewTag = async () => {
        const name = newTagName.trim()

        if (!name) {
            toast.error('Vui lòng nhập tên tag')
            return
        }

        try {
            const { data } = await tagApi.create({
                name,
                color: newTagColor,
            })

            const newTag = data.data

            setTags(p => [...p, newTag])
            setNewTagName('')
            setNewTagColor('#3B82F6')

            setCurrentNote(p => {
                if (!p) return p

                const currentTags = p.tags || []
                const alreadyExists = currentTags.some(t => t.id === newTag.id)

                return {
                    ...p,
                    tags: alreadyExists ? currentTags : [...currentTags, newTag],
                }
            })

            toast.success('Đã tạo tag mới')
        } catch {
            toast.error('Không thể tạo tag')
        }
    }

    const toggleNoteTag = (tag) => {
        if (!currentNote) return

        setCurrentNote(p => {
            const currentTags = p.tags || []
            const alreadyExists = currentTags.some(t => t.id === tag.id)

            return {
                ...p,
                tags: alreadyExists
                    ? currentTags.filter(t => t.id !== tag.id)
                    : [...currentTags, tag],
            }
        })
    }

    const loadShares = async () => {
        if (!currentNote?.id) return

        try {
            const { data } = await noteApi.getShares(currentNote.id)
            setShareList(data.data || [])
        } catch {
            setShareList([])
        }
    }

    useEffect(() => {
        if (showShare && currentNote?.id) {
            loadShares()
        }

    }, [showShare, currentNote?.id])

    const loadVersionHistory = async () => {
        if (!currentNote?.id) return

        setLoadingHistory(true)

        try {
            const { data } = await noteApi.getVersions(currentNote.id)
            setVersionHistory(data.data || [])
        } catch {
            toast.error('Không tải được lịch sử phiên bản')
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        if (showHistory && currentNote?.id) {
            loadVersionHistory()
        }

    }, [showHistory, currentNote?.id])

    useEffect(() => {
        const token = localStorage.getItem('velora_token')

        if (!currentNote?.id || !token) return undefined

        const source = new EventSource(noteApi.createRealtimeUrl(currentNote.id, token))

        source.addEventListener('note-updated', event => {
            try {
                const payload = JSON.parse(event.data)

                if (payload.editorSessionId === editorSessionIdRef.current) return
                if (!payload.note || payload.note.id !== currentNoteRef.current?.id) return

                const newNote = {
                    ...payload.note,
                    accessMode: currentNoteRef.current?.accessMode || payload.note.accessMode,
                }

                savedVersionRef.current = createNoteMilestone(newNote)
                setCurrentNote(newNote)
                setItems(p => p.map(n => n.id === newNote.id ? { ...n, ...newNote } : n))

                if (showHistory) {
                    loadVersionHistory()
                }
            } catch {

            }
        })

        return () => source.close()

    }, [currentNote?.id, showHistory, createNoteMilestone])

    const restoreVersion = async (version) => {
        if (!currentNote?.id) return
        if (!window.confirm(`Khôi phục phiên bản #${version.versionNumber}?`)) return

        setRestoringVersionId(version.id)

        try {
            const { data } = await noteApi.restoreVersion(currentNote.id, version.id)
            const newNote = data.data

            savedVersionRef.current = createNoteMilestone(newNote)
            setCurrentNote(newNote)
            setItems(p => p.map(n => n.id === newNote.id ? { ...n, ...newNote } : n))
            await loadVersionHistory()
            toast.success('Đã khôi phục phiên bản')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể khôi phục phiên bản')
        } finally {
            setRestoringVersionId(null)
        }
    }

    const shareNote = async () => {
        if (!hasPackageFeature('TEAM_WORK')) {
            toast.error(getUpgradeMessage('TEAM_WORK'))
            navigate('/service-packages')
            return
        }

        if (!currentNote?.id) {
            toast.error('Chưa chọn ghi chú để chia sẻ')
            return
        }

        const email = shareEmail.trim().toLowerCase()

        if (!email) {
            toast.error('Vui lòng nhập email người nhận')
            return
        }

        setSharing(true)

        try {
            await noteApi.share(currentNote.id, {
                email,
                permission: sharePermission,
            })

            toast.success('Đã chia sẻ ghi chú')
            setShareEmail('')
            setSharePermission('VIEW')

            await loadShares()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể chia sẻ ghi chú')
        } finally {
            setSharing(false)
        }
    }

    const updateSharePermission = async (shareId, permission) => {
        if (!hasPackageFeature('TEAM_WORK')) {
            toast.error(getUpgradeMessage('TEAM_WORK'))
            navigate('/service-packages')
            return
        }

        const current = shareList.find(item => item.id === shareId)
        if (!current || current.permission === permission) return

        setChangingSharePermissionId(shareId)

        try {
            const { data } = await noteApi.updateSharePermission(shareId, { permission })
            const newItem = data.data

            setShareList(p => p.map(item => item.id === shareId ? newItem : item))
            toast.success('Đã cập nhật quyền chia sẻ')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật quyền chia sẻ')
        } finally {
            setChangingSharePermissionId(null)
        }
    }

    const revokeShare = async (shareId) => {
        if (!window.confirm('Hủy chia sẻ người này?')) return

        try {
            await noteApi.revokeShare(shareId)

            toast.success('Đã hủy chia sẻ')
            await loadShares()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể hủy chia sẻ')
        }
    }

    const canExtractSchedule = (text) => {
        if (!text) return false

        const actionPattern = /\b(?:deadline|hạn\s*(?:chót|nộp)|nộp\s*(?:bài|báo\s*cáo)|kiểm\s*tra|thi|thuyết\s*trình|cuộc\s*họp|lịch\s*học|sự\s*kiện|cuộc\s*hẹn)\b/i
        const dateOrTimePattern = /\b(?:\d{1,2}[:.][0-5]\d|[0-2]?\d\s*(?:giờ|h)\b|hôm\s*nay|ngày\s*(?:mai|mốt)|tuần\s*(?:này|sau|tới)|tháng\s*(?:này|sau|tới)|cuối\s*tuần|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|thứ\s*(?:hai|ba|tư|năm|sáu|bảy)|chủ\s*nhật)\b/i

        return actionPattern.test(text) && dateOrTimePattern.test(text)
    }

    useEffect(() => {
        if (!currentNote) return

        const hasCreatedSchedule = scheduledNoteIds.has(currentNote.id)
        const wasDismissed = dismissedScheduleNoteIds.has(currentNote.id)
        const wasScheduleExtracted = hasPackageFeature('EXTRACT_SCHEDULE')

        setShowSuggestedSchedule(
            wasScheduleExtracted &&
            !hasCreatedSchedule &&
            !wasDismissed &&
            canExtractSchedule(richTextToPlainText(currentNote.content))
        )
    }, [
        currentNote?.id,
        currentNote?.content,
        scheduledNoteIds,
        dismissedScheduleNoteIds,
        user?.packageFeatures,
    ])

    useEffect(() => {
        scheduleApi.getAll()
            .then(r => {
                const schedules = r.data.data || []
                const ids = new Set(
                    schedules
                        .filter(s => s.noteId)
                        .map(s => s.noteId)
                )

                setScheduledNoteIds(ids)
            })
            .catch(() => { })
    }, [])

    const extractSchedule = async () => {
        if (!hasPackageFeature('EXTRACT_SCHEDULE')) {
            toast.error(getUpgradeMessage('EXTRACT_SCHEDULE'))
            navigate('/service-packages')
            return
        }

        const plainContent = richTextToPlainText(currentNote.content)

        if (!plainContent) return

        setExtractingSchedule(true)

        try {
            const { data } = await scheduleApi.extractFromNote({
                content: plainContent,
                noteId: currentNote.id,
            })

            const total = data.data?.totalFound || 0

            if (total > 0) {
                setScheduledNoteIds(prev => {
                    const next = new Set(prev)
                    next.add(currentNote.id)
                    return next
                })

                setShowSuggestedSchedule(false)
                toast.success(`Đã tạo ${total} công việc / lịch`)
            } else {
                toast.error('AI chưa tìm thấy lịch/deadline hợp lệ trong ghi chú')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể trích xuất lịch từ ghi chú')
        } finally {
            setExtractingSchedule(false)
        }
    }

    useEffect(() => {
        if (!currentNote) return
        if (!canEdit) return
        if (createNoteMilestone(currentNote) === savedVersionRef.current) return

        const t = setTimeout(save, 3000)

        return () => clearTimeout(t)

    }, [
        currentNote?.content,
        currentNote?.title,
        currentNote?.tags,
        canEdit,
        createNoteMilestone,
    ])

    const displayItems = useMemo(() => {
        if (quickFilter === 'BOOKMARKED') {
            return items.filter(n => n.isBookmarked)
        }

        return items
    }, [items, quickFilter])

    const collaborationUrl = useMemo(() => {
        const token = localStorage.getItem('velora_token')
        if (!currentNote?.id || !token) return null

        return noteApi.createCollaborationUrl(currentNote.id, token)
    }, [currentNote?.id])

    const updateCollaboratorPermission = useCallback((nextAccessMode) => {
        setCurrentNote(p => {
            if (!p) return p

            const nextNote = {
                ...p,
                accessMode: p.accessMode === 'OWNER' ? 'OWNER' : nextAccessMode,
            }

            currentNoteRef.current = nextNote
            return nextNote
        })
    }, [])

    const selectedTag = tags.find(t => t.id === tagFilter)
    const wordCountValue = wordCount(currentNote?.content || '')
    const characterCount = getPlainText(currentNote?.content || '').length

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
                            onClick={create}
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
                                value={search}
                                onChange={e => setSearch(e.target.value)}
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
                            className={quickFilter === 'ALL' ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setQuickFilter('ALL')}
                            style={styles.quickTab}
                        >
                            Tất cả
                        </button>

                        <button
                            className={quickFilter === 'BOOKMARKED' ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setQuickFilter('BOOKMARKED')}
                            style={styles.quickTab}
                        >
                            Đã ghim
                        </button>

                        <button
                            className={tagFilter ? 'btn-ai' : 'btn-ghost'}
                            onClick={() => setShowTag(p => !p)}
                            style={styles.quickTab}
                        >
                            {selectedTag?.name || 'Tag'}
                        </button>
                    </div>

                    {(showTag || tagFilter) && (
                        <div style={styles.tagFilter}>
                            <button
                                className={tagFilter ? 'btn-ghost' : 'btn-ai'}
                                onClick={() => setTagFilter(null)}
                                style={styles.tagFilterButton}
                            >
                                Tất cả tag
                            </button>

                            {tags.slice(0, 8).map(t => (
                                <button
                                    key={t.id}
                                    style={{
                                        ...styles.tagFilterButton,
                                        background: tagFilter === t.id
                                            ? 'var(--bg-ai)'
                                            : 'transparent',
                                    }}
                                    className={tagFilter === t.id ? 'btn-ai' : 'btn-ghost'}
                                    onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
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
                    )}
                </div>

                <div style={styles.listBody}>
                    {isLoading ? (
                        <div style={styles.loadingBox}>
                            <Spinner />
                        </div>
                    ) : displayItems.length === 0 ? (
                        <div style={styles.emptyList}>
                            <EmptyState
                                icon={IconSearch}
                                title="Không tìm thấy ghi chú"
                                desc="Thử tạo ghi chú mới hoặc đổi bộ lọc"
                                action={
                                    <button className="btn-primary" onClick={create}>
                                        <IconPlus size={13} />
                                        Ghi chú mới
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        displayItems.map(n => {
                            const active = currentNote?.id === n.id
                            const firstTag = n.tags?.[0]

                            return (
                                <button
                                    key={n.id}
                                    style={{
                                        ...styles.noteItem,
                                        ...(active ? styles.noteItemActive : {}),
                                    }}
                                    onClick={() => selectNote(n.id)}
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
                                                {getUpdatedDate(n)}
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
                                        {getPreview(n)}
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
                {!currentNote ? (
                    <div style={styles.emptyEditor}>
                        <EmptyState
                            icon={IconPlus}
                            title="Chọn hoặc tạo ghi chú"
                            desc="Ghi chú của bạn sẽ xuất hiện tại đây"
                            action={
                                <button className="btn-primary" onClick={create}>
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
                                    value={currentNote.title || ''}
                                    onChange={e => updateNoteField('title', e.target.value)}
                                    readOnly={!canEdit}
                                    placeholder="Tiêu đề ghi chú..."
                                    style={{
                                        ...styles.title,
                                        cursor: canEdit ? 'text' : 'default',
                                        color: canEdit ? 'var(--text-primary)' : 'var(--text-secondary)',
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

                                    <span>{wordCountValue} từ</span>
                                    <span>·</span>
                                    <span>{characterCount} ký tự</span>
                                    <span>·</span>
                                    <span>{getUpdatedDate(currentNote)}</span>

                                    {isSaving ? (
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
                                {isOwner && (
                                    <button
                                        className="btn-ghost"
                                        onClick={mark}
                                        title={currentNote.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                                        style={styles.iconButton}
                                    >
                                        {currentNote.isBookmarked ? (
                                            <IconBookmarkFilled
                                                size={16}
                                                style={{ color: 'var(--accent-amber)' }}
                                            />
                                        ) : (
                                            <IconBookmark size={16} />
                                        )}
                                    </button>
                                )}

                                {isOwner && hasPackageFeature('AI_FLASHCARD') && (
                                    <button
                                        className="btn-ghost"
                                        onClick={handleCreateFlashcards}
                                        disabled={isCreatingFlashcards}
                                        style={styles.actionButton}
                                        title="Tạo bộ câu hỏi ôn tập chuyển trang"
                                    >
                                        <IconCards
                                            size={14}
                                            className={isCreatingFlashcards ? 'animate-spin' : ''}
                                        />
                                        Flashcard
                                    </button>
                                )}

                                {isOwner && hasPackageFeature('EXPORT_FILE') && (
                                    <>
                                        <button
                                            className="btn-ghost"
                                            onClick={() => downloadNote('pdf')}
                                            style={styles.actionButton}
                                            title="Export ghi chú ra PDF"
                                        >
                                            <IconDownload size={14} />
                                            PDF
                                        </button>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => downloadNote('docx')}
                                            style={styles.actionButton}
                                            title="Export ghi chú ra Word"
                                        >
                                            <IconDownload size={14} />
                                            Word
                                        </button>
                                    </>
                                )}

                                {isOwner && hasPackageFeature('TEAM_WORK') && (
                                    <button
                                        className={showShare ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setShowShare(p => !p)
                                            setShowAi(false)
                                            setShowDiagram(false)
                                            setShowTag(false)
                                            setShowHistory(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Chia sẻ ghi chú"
                                    >
                                        <IconShare size={14} />
                                        Chia sẻ
                                    </button>
                                )}

                                {currentNote?.id && (
                                    <button
                                        className={showHistory ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setShowHistory(p => !p)
                                            setShowAi(false)
                                            setShowDiagram(false)
                                            setShowTag(false)
                                            setShowShare(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Lịch sử phiên bản"
                                    >
                                        <IconHistory size={14} />
                                        Lịch sử
                                    </button>
                                )}

                                {canEdit && (
                                    <button
                                        className={showAi ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setShowAi(p => !p)
                                            setShowDiagram(false)
                                            setShowTag(false)
                                            setShowShare(false)
                                            setShowHistory(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Trợ lý AI"
                                    >
                                        <IconSparkles size={14} />
                                        AI
                                    </button>
                                )}

                                {currentNote?.id && (
                                    <button
                                        className={showDiagram ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setShowDiagram(p => !p)
                                            setShowAi(false)
                                            setShowTag(false)
                                            setShowShare(false)
                                            setShowHistory(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Tạo sơ đồ từ ghi chú"
                                    >
                                        <IconSparkles size={14} />
                                        Sơ đồ
                                    </button>
                                )}

                                {canEdit && (
                                    <button
                                        className={showTag ? 'btn-ai' : 'btn-ghost'}
                                        onClick={() => {
                                            setShowTag(p => !p)
                                            setShowAi(false)
                                            setShowDiagram(false)
                                            setShowShare(false)
                                            setShowHistory(false)
                                        }}
                                        style={styles.actionButton}
                                        title="Gắn tag"
                                    >
                                        <IconTag size={14} />
                                        Tag
                                    </button>
                                )}

                                {isOwner && (
                                    <button
                                        className="btn-danger btn-ghost"
                                        onClick={remove}
                                        title="Xoá"
                                        style={styles.iconButton}
                                    >
                                        <IconTrash size={14} />
                                    </button>
                                )}

                                {canEdit && (
                                    <button
                                        className="btn-primary"
                                        onClick={save}
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
                                    {(currentNote.tags || []).length > 0 ? (
                                        currentNote.tags.map(tag => (
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

                                    {canEdit && (
                                        <button
                                            className="btn-ghost"
                                            style={styles.addTagButton}
                                            onClick={() => setShowTag(true)}
                                        >
                                            <IconPlus size={12} />
                                            Thêm tag
                                        </button>
                                    )}
                                </div>

                                <RichTextEditor
                                    ref={richTextEditorRef}
                                    key={currentNote.id}
                                    noteId={currentNote.id}
                                    collaborationUrl={collaborationUrl}
                                    currentUser={user}
                                    value={currentNote.content || ''}
                                    onChange={content => updateNoteField('content', content)}
                                    onPermissionChange={updateCollaboratorPermission}
                                    readOnly={!canEdit}
                                    placeholder={canEdit ? 'Bắt đầu ghi chú...' : 'Bạn chỉ có quyền xem ghi chú này'}
                                />
                            </div>

                            {showSuggestedSchedule && (
                                <div style={styles.schedulePrompt}>
                                    <div style={styles.scheduleIcon}>
                                        <IconCalendarEvent size={18} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={styles.scheduleTitle}>
                                            Phát hiện lịch hoặc deadline
                                        </div>

                                        <div style={styles.scheduleDesc}>
                                            Bạn có muốn trích xuất lịch / công việc từ ghi chú này?
                                        </div>

                                        <div style={styles.scheduleActions}>
                                            <button
                                                className="btn-primary"
                                                onClick={extractSchedule}
                                                disabled={isExtractingSchedule}
                                                style={styles.scheduleButton}
                                            >
                                                {isExtractingSchedule ? 'Đang xử lý...' : 'Có, tạo lịch'}
                                            </button>

                                            <button
                                                className="btn-ghost"
                                                onClick={() => {
                                                    setDismissedScheduleNoteIds(prev => new Set(prev).add(currentNote.id))
                                                    setShowSuggestedSchedule(false)
                                                }}
                                                style={styles.scheduleButton}
                                            >
                                                Để sau
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showTag && (
                                <div style={styles.tagPanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconTag size={15} />
                                            Tag ghi chú
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setShowTag(false)}
                                            style={styles.closeButton}
                                        >
                                            <IconX size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.sidePanelBody}>
                                        <div style={styles.tagCreateBox}>
                                            <div style={styles.miniLabel}>Tạo tag mới</div>

                                            <input
                                                value={newTagName}
                                                onChange={e => setNewTagName(e.target.value)}
                                                placeholder="Tên tag mới..."
                                                style={styles.panelInput}
                                            />

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="color"
                                                    value={newTagColor}
                                                    onChange={e => setNewTagColor(e.target.value)}
                                                    style={styles.colorInput}
                                                />

                                                <button
                                                    className="btn-primary"
                                                    onClick={createNewTag}
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
                                                    const selected = currentNote.tags?.some(t => t.id === tag.id)

                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            className={selected ? 'btn-ai' : 'btn-ghost'}
                                                            onClick={() => toggleNoteTag(tag)}
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
                                            onClick={save}
                                            style={styles.panelWideButton}
                                        >
                                            Lưu tag cho ghi chú
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showShare && (
                                <div style={styles.sharePanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconShare size={15} />
                                            Chia sẻ ghi chú
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setShowShare(false)}
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
                                                onClick={shareNote}
                                                disabled={isSharing}
                                                style={styles.panelWideButton}
                                            >
                                                <IconUserPlus size={12} />
                                                {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ'}
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
                                                                onChange={e => updateSharePermission(item.id, e.target.value)}
                                                                disabled={changingSharePermissionId === item.id}
                                                                style={styles.sharePermissionSelect}
                                                            >
                                                                <option value="VIEW">Chỉ xem</option>
                                                                <option value="EDIT">Có thể chỉnh sửa</option>
                                                            </select>
                                                        </div>

                                                        <button
                                                            className="btn-ghost"
                                                            onClick={() => revokeShare(item.id)}
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

                            {showHistory && (
                                <div style={styles.historyPanel}>
                                    <div style={styles.sidePanelHeader}>
                                        <span style={styles.panelTitle}>
                                            <IconHistory size={15} />
                                            Lịch sử phiên bản
                                        </span>

                                        <button
                                            className="btn-ghost"
                                            onClick={() => setShowHistory(false)}
                                            style={styles.closeButton}
                                        >
                                            <IconX size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.sidePanelBody}>
                                        {isLoadingHistory ? (
                                            <div style={styles.loadingBox}>
                                                <Spinner />
                                            </div>
                                        ) : versionHistory.length === 0 ? (
                                            <div style={styles.emptyPanelText}>
                                                Chưa có phiên bản nào
                                            </div>
                                        ) : (
                                            <div style={styles.versionList}>
                                                {versionHistory.map(version => {
                                                    const preview = getPlainText(version.content || '').trim()
                                                    const versionDate = parseApiDate(version.createdAt)
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
                                                                    onClick={() => restoreVersion(version)}
                                                                    disabled={!canEdit || restoringVersionId === version.id}
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

                            {showAi && (
                                <AiPanel
                                    noteId={currentNote.id}
                                    content={richTextToPlainText(currentNote.content)}
                                    title={currentNote.title}
                                    onApply={applyAiResult}
                                    onInsertChecklist={(html) => {
                                        if (!canEdit) {
                                            toast.error('Bạn không có quyền chỉnh sửa ghi chú này')
                                            return
                                        }
                                        richTextEditorRef.current?.insertHtmlAtEnd(html)
                                    }}
                                    onClose={() => setShowAi(false)}
                                />
                            )}

                            {showDiagram && (
                                <NoteDiagramGenerator
                                    noteId={currentNote.id}
                                    onClose={() => setShowDiagram(false)}
                                    onInsertIntoNote={(html) => {
                                        if (!canEdit) {
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

            {showChecklistModal && (
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
                                onClick={() => setShowChecklistModal(false)}
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
                                        min={getTodayIso()}
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
                                onClick={() => setShowChecklistModal(false)}
                                disabled={isCreatingChecklistTask}
                            >
                                Hủy
                            </button>

                            <button
                                className="btn-primary"
                                onClick={confirmCreateTasksFromChecklist}
                                disabled={isCreatingChecklistTask}
                            >
                                {isCreatingChecklistTask ? 'Đang tạo...' : 'Tạo task'}
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
    title: {
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
