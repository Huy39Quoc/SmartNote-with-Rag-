import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconStrikethrough,
    IconBlockquote,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconList,
    IconListNumbers,
    IconListCheck,
    IconPalette,
    IconEraser,
    IconPhoto,
    IconLink,
    IconTable,
    IconColumnInsertRight,
    IconRowInsertBottom,
    IconTrash,
    IconAlignLeft,
    IconAlignCenter,
    IconAlignRight,
    IconAlignJustified,
} from '@tabler/icons-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Collaboration from '@tiptap/extension-collaboration'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import * as Y from 'yjs'
import { sanitizeRichText } from '../../utils/richText'

const COLORS = [
    '#000000',
    '#111827',
    '#374151',
    '#6b7280',
    '#e8e6de',
    '#ffffff',

    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#22c55e',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',

    '#f87171',
    '#fb923c',
    '#facc15',
    '#4ade80',
    '#38bdf8',
    '#a78bfa',
    '#f472b6',
]
const FONT_FAMILIES = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
]

const FONT_SIZES = [
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '20', value: '20px' },
    { label: '24', value: '24px' },
    { label: '32', value: '32px' },
]

const CustomTextStyle = TextStyle.extend({
    addAttributes() {
        return {
            ...(this.parent?.() || {}),

            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize || null,
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {}
                    return {
                        style: `font-size: ${attributes.fontSize}`,
                    }
                },
            },

            fontFamily: {
                default: null,
                parseHTML: element => element.style.fontFamily || null,
                renderHTML: attributes => {
                    if (!attributes.fontFamily) return {}
                    return {
                        style: `font-family: ${attributes.fontFamily}`,
                    }
                },
            },
        }
    },
})

const PRESENCE_COLORS = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea',
    '#0891b2',
    '#ea580c',
    '#be123c',
    '#4f46e5',
]

const TABLE_PICKER_ROWS = 8
const TABLE_PICKER_COLS = 10
const DEFAULT_ROW_HEIGHT = 40
const MIN_ROW_HEIGHT = 24
const MAX_ROW_HEIGHT = 240

const ResizableTableRow = TableRow.extend({
    addAttributes() {
        return {
            height: {
                default: null,
                parseHTML: element => {
                    const rawHeight = element.style.height || element.getAttribute('height')
                    const height = parseInt(rawHeight, 10)
                    return Number.isFinite(height) && height > 0 ? height : null
                },
                renderHTML: attributes => {
                    if (!attributes.height) return {}

                    return {
                        height: attributes.height,
                        style: `height: ${attributes.height}px;`,
                    }
                },
            },
        }
    },
})

function hashString(value) {
    return String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function presenceColor(user) {
    const key = user?.userId || user?.email || user?.sessionId || ''
    return PRESENCE_COLORS[hashString(key) % PRESENCE_COLORS.length]
}

function displayName(user) {
    return user?.fullName || user?.email || 'Người dùng'
}

function initials(user) {
    const source = displayName(user).trim()
    if (!source) return '?'

    const parts = source.split(/\s+/).filter(Boolean)
    const letters = parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`
        : source.slice(0, 2)

    return letters.toUpperCase()
}

function bytesToBase64(bytes) {
    let binary = ''
    const chunkSize = 0x8000

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }

    return window.btoa(binary)
}

function base64ToBytes(base64) {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }

    return bytes
}

const RichTextEditor = forwardRef(function RichTextEditor({
    value,
    onChange,
    readOnly,
    placeholder,
    noteId,
    collaborationUrl,
    onPermissionChange,
    currentUser,
}, ref) {
    const fileInputRef = useRef(null)
    const editorRef = useRef(null)
    const editorShellRef = useRef(null)
    const socketRef = useRef(null)
    const participantsRef = useRef([])
    const valueRef = useRef(value)
    const sessionIdRef = useRef('')
    const suppressBroadcastRef = useRef(false)
    const seedBroadcastRef = useRef(false)
    const presenceTimerRef = useRef(null)
    const clientIdRef = useRef(
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    )
    const [participants, setParticipants] = useState([])
    const [cursorLabels, setCursorLabels] = useState([])
    const [showTablePicker, setShowTablePicker] = useState(false)
    const [tablePickerSize, setTablePickerSize] = useState({ rows: 3, cols: 3 })
    const [rowResizeHandle, setRowResizeHandle] = useState(null)

    const ydoc = useMemo(() => new Y.Doc(), [noteId])
    const presentParticipants = useMemo(() => {
        const list = participants.length > 0
            ? participants
            : currentUser
                ? [{
                    userId: currentUser.id || currentUser.userId,
                    email: currentUser.email,
                    fullName: currentUser.fullName,
                    clientId: clientIdRef.current,
                    active: true,
                }]
                : []

        return list.map(user => ({
            ...user,
            color: presenceColor(user),
            isSelf: user.clientId === clientIdRef.current || user.sessionId === sessionIdRef.current,
        }))
    }, [participants, currentUser])

    useEffect(() => {
        participantsRef.current = participants
    }, [participants])

    useEffect(() => {
        valueRef.current = value
    }, [value])

    const sendPresence = useCallback((active = true) => {
        const socket = socketRef.current
        const currentEditor = editorRef.current
        if (!currentEditor || !socket || socket.readyState !== WebSocket.OPEN) return

        const { from, to } = currentEditor.state.selection
        socket.send(JSON.stringify({
            type: 'presence-update',
            clientId: clientIdRef.current,
            from,
            to,
            maxPosition: currentEditor.state.doc.content.size,
            active,
        }))
    }, [])

    const schedulePresence = useCallback((active = true) => {
        window.clearTimeout(presenceTimerRef.current)
        presenceTimerRef.current = window.setTimeout(() => sendPresence(active), 60)
    }, [sendPresence])

    const updateCursorLabels = useCallback(() => {
        const currentEditor = editorRef.current
        if (!currentEditor || !editorShellRef.current) {
            setCursorLabels([])
            return
        }

        const shellRect = editorShellRef.current.getBoundingClientRect()
        const docSize = currentEditor.state.doc.content.size
        const labels = participantsRef.current
            .filter(user => user.clientId !== clientIdRef.current && user.sessionId !== sessionIdRef.current)
            .filter(user => user.active && Number.isFinite(user.from))
            .map(user => {
                const pos = Math.max(0, Math.min(Number(user.from) || 0, docSize))

                try {
                    const coords = currentEditor.view.coordsAtPos(pos)
                    return {
                        ...user,
                        color: presenceColor(user),
                        left: coords.left - shellRect.left,
                        top: coords.top - shellRect.top,
                        height: Math.max(16, coords.bottom - coords.top),
                    }
                } catch {
                    return null
                }
            })
            .filter(Boolean)

        setCursorLabels(labels)
    }, [])

    const getCurrentTableRowInfo = useCallback(() => {
        const currentEditor = editorRef.current
        if (!currentEditor) return null

        const { $from } = currentEditor.state.selection

        for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth)

            if (node.type.name === 'tableRow') {
                return {
                    node,
                    pos: $from.before(depth),
                }
            }
        }

        return null
    }, [])

    const refreshTableControls = useCallback(() => {
        const currentEditor = editorRef.current
        const rowInfo = getCurrentTableRowInfo()
        const shell = editorShellRef.current

        if (!currentEditor?.isActive('table') || !rowInfo || !shell || readOnly) {
            setRowResizeHandle(null)
            return
        }

        const rowElement = currentEditor.view.nodeDOM(rowInfo.pos)

        if (!(rowElement instanceof HTMLElement)) {
            setRowResizeHandle(null)
            return
        }

        const rowRect = rowElement.getBoundingClientRect()
        const shellRect = shell.getBoundingClientRect()

        setRowResizeHandle({
            top: rowRect.bottom - shellRect.top - 3,
            left: rowRect.left - shellRect.left,
            width: rowRect.width,
        })
    }, [getCurrentTableRowInfo, readOnly])

    const setTableRowHeight = useCallback((rowInfo, nextHeight, focus = true) => {
        const currentEditor = editorRef.current
        if (!currentEditor || !rowInfo || readOnly) return

        const height = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Number(nextHeight) || DEFAULT_ROW_HEIGHT))
        const { tr } = currentEditor.state

        tr.setNodeMarkup(rowInfo.pos, undefined, {
            ...rowInfo.node.attrs,
            height,
        })

        currentEditor.view.dispatch(tr)
        window.requestAnimationFrame(refreshTableControls)

        if (focus) {
            currentEditor.commands.focus()
        }
    }, [readOnly, refreshTableControls])

    const startRowResize = useCallback((event) => {
        const currentEditor = editorRef.current
        const rowInfo = getCurrentTableRowInfo()
        if (!currentEditor || !rowInfo || readOnly) return

        const rowElement = currentEditor.view.nodeDOM(rowInfo.pos)
        const startHeight = rowElement instanceof HTMLElement
            ? rowElement.getBoundingClientRect().height
            : rowInfo.node.attrs.height || DEFAULT_ROW_HEIGHT
        const startY = event.clientY

        event.preventDefault()
        event.stopPropagation()

        const handleMouseMove = moveEvent => {
            const nextHeight = startHeight + moveEvent.clientY - startY
            setTableRowHeight(rowInfo, nextHeight, false)
        }

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            currentEditor.commands.focus()
            refreshTableControls()
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }, [getCurrentTableRowInfo, readOnly, refreshTableControls, setTableRowHeight])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false,
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            CustomTextStyle,
            Color,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
            }),
            Table.configure({
                resizable: true,
            }),
            ResizableTableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Collaboration.configure({
                document: ydoc,
                field: 'content',
            }),
        ],
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'rich-text-editor tiptap-editor',
                'data-placeholder': placeholder || '',
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            onChange?.(sanitizeRichText(currentEditor.getHTML()))
            refreshTableControls()
            schedulePresence()
        },
        onSelectionUpdate: () => {
            refreshTableControls()
            schedulePresence()
            window.requestAnimationFrame(updateCursorLabels)
        },
        onFocus: () => schedulePresence(true),
        onBlur: () => schedulePresence(false),
    })

    useEffect(() => {
        editorRef.current = editor
        return () => {
            if (editorRef.current === editor) {
                editorRef.current = null
            }
        }
    }, [editor])

    useImperativeHandle(ref, () => ({
        insertHtmlAtEnd: (html) => {
            const currentEditor = editorRef.current
            if (!currentEditor || !html) return

            currentEditor
                .chain()
                .focus('end')
                .insertContent('<p></p>')
                .insertContent(html)
                .run()
        },
        setContentHtml: (html) => {
            const currentEditor = editorRef.current
            if (!currentEditor) return

            // Thay toàn bộ nội dung editor (đi qua transaction của TipTap/Yjs
            // nên sẽ đồng bộ đúng, khác với việc chỉ đổi state React của component cha).
            currentEditor.chain().focus().setContent(html || '', true).run()
        },
        getContentHtml: () => editorRef.current?.getHTML() || '',
    }), [])

    useEffect(() => {
        return () => {
            window.clearTimeout(presenceTimerRef.current)
            socketRef.current?.close()
            ydoc.destroy()
        }
    }, [ydoc])

    useEffect(() => {
        if (!editor) return

        editor.setEditable(!readOnly)
        refreshTableControls()
    }, [editor, readOnly, refreshTableControls])

    useEffect(() => {
        if (!editor || collaborationUrl) return

        suppressBroadcastRef.current = true
        editor.commands.setContent(sanitizeRichText(valueRef.current || '<p></p>'), false)
        suppressBroadcastRef.current = false
    }, [editor, value, collaborationUrl])

    useEffect(() => {
        if (!collaborationUrl || !noteId || !editor) return undefined

        const socket = new WebSocket(collaborationUrl)
        socketRef.current = socket

        const sendFullDocumentSeed = () => {
            if (socket.readyState !== WebSocket.OPEN) return

            socket.send(JSON.stringify({
                type: 'yjs-seed',
                update: bytesToBase64(Y.encodeStateAsUpdate(ydoc)),
                clientId: clientIdRef.current,
            }))
        }

        socket.onopen = () => {
            sendPresence(true)
        }

        const handleYjsUpdate = (update, origin) => {
            if (origin === 'remote') return
            if (suppressBroadcastRef.current) return
            if (socket.readyState !== WebSocket.OPEN) return

            socket.send(JSON.stringify({
                type: seedBroadcastRef.current ? 'yjs-seed' : 'yjs-update',
                update: bytesToBase64(update),
                clientId: clientIdRef.current,
            }))

            seedBroadcastRef.current = false
        }

        ydoc.on('update', handleYjsUpdate)

        socket.onmessage = event => {
            try {
                const payload = JSON.parse(event.data)

                if (payload.type === 'init') {
                    sessionIdRef.current = payload.sessionId || ''
                    onPermissionChange?.(payload.canEdit ? 'EDIT' : 'VIEW')

                    if (Array.isArray(payload.updates) && payload.updates.length > 0) {
                        payload.updates.forEach(update => {
                            Y.applyUpdate(ydoc, base64ToBytes(update), 'remote')
                        })
                    } else if (editor) {
                        suppressBroadcastRef.current = true
                        editor.commands.setContent(sanitizeRichText(payload.content || valueRef.current || '<p></p>'), false)
                        suppressBroadcastRef.current = false

                        if (payload.shouldSeed) {
                            sendFullDocumentSeed()
                        }
                    }

                    sendPresence(true)
                    return
                }

                if (payload.type === 'permission-updated') {
                    onPermissionChange?.(payload.accessMode || (payload.canEdit ? 'EDIT' : 'VIEW'))
                    if (payload.canEdit) {
                        sendFullDocumentSeed()
                    }
                    return
                }

                if (payload.type === 'presence-list') {
                    const nextParticipants = Array.isArray(payload.participants) ? payload.participants : []
                    participantsRef.current = nextParticipants
                    setParticipants(nextParticipants)
                    window.requestAnimationFrame(updateCursorLabels)
                    return
                }

                if (payload.type === 'presence-cursor') {
                    const nextParticipant = payload.participant
                    if (!nextParticipant?.sessionId) return

                    participantsRef.current = participantsRef.current.map(user =>
                        user.sessionId === nextParticipant.sessionId
                            ? { ...user, ...nextParticipant }
                            : user
                    )
                    window.requestAnimationFrame(updateCursorLabels)
                    return
                }

                if (payload.type !== 'yjs-update') return
                if (payload.clientId === clientIdRef.current) return

                if (payload.reset && editor) {
                    suppressBroadcastRef.current = true
                    editor.commands.clearContent(false)
                    suppressBroadcastRef.current = false
                }

                Y.applyUpdate(ydoc, base64ToBytes(payload.update), 'remote')
                window.requestAnimationFrame(updateCursorLabels)
            } catch {
                // Ignore malformed collaboration messages.
            }
        }

        socket.onclose = () => {
            if (socketRef.current === socket) {
                socketRef.current = null
            }
            participantsRef.current = []
            sessionIdRef.current = ''
            setParticipants([])
            setCursorLabels([])
        }

        return () => {
            ydoc.off('update', handleYjsUpdate)
            socket.close()
            if (socketRef.current === socket) {
                socketRef.current = null
            }
        }
    }, [collaborationUrl, noteId, onPermissionChange, editor, ydoc, sendPresence, updateCursorLabels])

    useEffect(() => {
        updateCursorLabels()
    }, [updateCursorLabels])

    useEffect(() => {
        if (!editor) return undefined

        const editorElement = editor.view.dom.closest('.rich-text-editor') || editor.view.dom
        const handleLayoutChange = () => {
            updateCursorLabels()
            refreshTableControls()
        }

        editorElement.addEventListener('scroll', handleLayoutChange, { passive: true })
        window.addEventListener('resize', handleLayoutChange)

        return () => {
            editorElement.removeEventListener('scroll', handleLayoutChange)
            window.removeEventListener('resize', handleLayoutChange)
        }
    }, [editor, updateCursorLabels, refreshTableControls])

    const keepSelection = (event) => {
        event.preventDefault()
    }

    const runCommand = (command) => {
        if (!editor || readOnly) return
        command()
    }

    const toggleTextAlign = (alignment) => {
        if (!editor || readOnly) return

        const nextAlignment = alignment !== 'left' && editor.isActive({ textAlign: alignment })
            ? 'left'
            : alignment

        editor.chain().focus().setTextAlign(nextAlignment).run()
    }

    const insertTable = (rows, cols) => {
        if (!editor || readOnly) return

        editor.chain().focus().insertTable({
            rows,
            cols,
            withHeaderRow: true,
        }).run()
        setShowTablePicker(false)
    }

    const setLink = () => {
        if (!editor || readOnly) return

        const previousUrl = editor.getAttributes('link').href || ''
        const url = window.prompt('Nhập URL', previousUrl)

        if (url === null) return

        if (!url.trim()) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    }

    const insertImageFromFile = (file) => {
        if (!editor || readOnly || !file) return
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()

        reader.onload = () => {
            editor.chain().focus().setImage({ src: reader.result }).run()
        }

        reader.readAsDataURL(file)
    }
    const setFontFamily = (fontFamily) => {
        if (!editor || readOnly) return

        if (!fontFamily) {
            editor.chain().focus().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run()
            return
        }

        editor.chain().focus().setMark('textStyle', { fontFamily }).run()
    }

    const setFontSize = (fontSize) => {
        if (!editor || readOnly) return

        if (!fontSize) {
            editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
            return
        }

        editor.chain().focus().setMark('textStyle', { fontSize }).run()
    }

    const setHeading = (value) => {
        if (!editor || readOnly) return

        if (!value) {
            editor.chain().focus().setParagraph().run()
            return
        }

        editor.chain().focus().toggleHeading({ level: Number(value) }).run()
    }

    const headingValue = (() => {
        if (!editor) return ''
        for (const level of [1, 2, 3]) {
            if (editor.isActive('heading', { level })) return String(level)
        }
        return ''
    })()

    const hasStructuredContent = useMemo(() => {
        if (!editor) return false

        let found = false
        editor.state.doc.descendants(node => {
            if (['table', 'image'].includes(node.type.name)) {
                found = true
                return false
            }

            return true
        })

        return found
    }, [editor, editor?.state.doc])

    const isEmpty = !editor || (editor.isEmpty && !hasStructuredContent)

    return (
        <div style={styles.wrap}>
            {!readOnly && (
                <div style={styles.toolbar}>
                    <button
                        type="button"
                        className="btn-ghost"
                        title="Hoàn tác (Ctrl+Z)"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().undo().run())}
                        disabled={!editor?.can().undo()}
                        style={styles.toolButton}
                    >
                        <IconArrowBackUp size={15} />
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        title="Làm lại (Ctrl+Y)"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().redo().run())}
                        disabled={!editor?.can().redo()}
                        style={styles.toolButton}
                    >
                        <IconArrowForwardUp size={15} />
                    </button>
                    <span style={styles.divider} />
                    <button
                        type="button"
                        className="btn-ghost"
                        title="In đậm"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('bold') ? styles.activeButton : {}),
                        }}
                    >
                        <IconBold size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="In nghiêng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('italic') ? styles.activeButton : {}),
                        }}
                    >
                        <IconItalic size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Gạch chân"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleUnderline().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('underline') ? styles.activeButton : {}),
                        }}
                    >
                        <IconUnderline size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Gạch ngang"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleStrike().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('strike') ? styles.activeButton : {}),
                        }}
                    >
                        <IconStrikethrough size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Trích dẫn"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('blockquote') ? styles.activeButton : {}),
                        }}
                    >
                        <IconBlockquote size={15} />
                    </button>

                    <select
                        title="Tiêu đề"
                        value={headingValue}
                        onChange={e => setHeading(e.target.value)}
                        style={{
                            ...styles.toolSelect,
                            ...styles.fontSelect,
                        }}
                    >
                        <option value="">Văn bản thường</option>
                        <option value="1">Tiêu đề 1</option>
                        <option value="2">Tiêu đề 2</option>
                        <option value="3">Tiêu đề 3</option>
                    </select>

                    <select
                        title="Font chữ"
                        value={editor?.getAttributes('textStyle')?.fontFamily || ''}
                        onChange={e => setFontFamily(e.target.value)}
                        style={{
                            ...styles.toolSelect,
                            ...styles.fontSelect,
                        }}
                    >
                        <option value="">Font</option>
                        {FONT_FAMILIES.map(font => (
                            <option
                                key={font.value}
                                value={font.value}
                                style={{ fontFamily: font.value }}
                            >
                                {font.label}
                            </option>
                        ))}
                    </select>

                    <select
                        title="Cỡ chữ"
                        value={editor?.getAttributes('textStyle')?.fontSize || ''}
                        onChange={e => setFontSize(e.target.value)}
                        style={{
                            ...styles.toolSelect,
                            ...styles.sizeSelect,
                        }}
                    >
                        <option value="">Size</option>
                        {FONT_SIZES.map(size => (
                            <option key={size.value} value={size.value}>
                                {size.label}
                            </option>
                        ))}
                    </select>
                    <span style={styles.divider} />

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Căn trái"
                        onMouseDown={keepSelection}
                        onClick={() => toggleTextAlign('left')}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive({ textAlign: 'left' }) ? styles.activeButton : {}),
                        }}
                    >
                        <IconAlignLeft size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Căn giữa"
                        onMouseDown={keepSelection}
                        onClick={() => toggleTextAlign('center')}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive({ textAlign: 'center' }) ? styles.activeButton : {}),
                        }}
                    >
                        <IconAlignCenter size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Căn phải"
                        onMouseDown={keepSelection}
                        onClick={() => toggleTextAlign('right')}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive({ textAlign: 'right' }) ? styles.activeButton : {}),
                        }}
                    >
                        <IconAlignRight size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Căn đều"
                        onMouseDown={keepSelection}
                        onClick={() => toggleTextAlign('justify')}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive({ textAlign: 'justify' }) ? styles.activeButton : {}),
                        }}
                    >
                        <IconAlignJustified size={15} />
                    </button>

                    <span style={styles.divider} />

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Danh sách"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
                        style={styles.toolButton}
                    >
                        <IconList size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Danh sách số"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
                        style={styles.toolButton}
                    >
                        <IconListNumbers size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Checklist (công việc)"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().toggleTaskList().run())}
                        style={{
                            ...styles.toolButton,
                            ...(editor?.isActive('taskList') ? styles.activeButton : {}),
                        }}
                    >
                        <IconListCheck size={15} />
                    </button>

                    <span style={styles.divider} />

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Gắn link"
                        onMouseDown={keepSelection}
                        onClick={setLink}
                        style={styles.toolButton}
                    >
                        <IconLink size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Chèn ảnh"
                        onMouseDown={keepSelection}
                        onClick={() => fileInputRef.current?.click()}
                        style={styles.toolButton}
                    >
                        <IconPhoto size={15} />
                    </button>

                    <div style={styles.tablePickerWrap}>
                    <button
                        type="button"
                        className="btn-ghost"
                        title="Chèn bảng"
                        onMouseDown={keepSelection}
                        onClick={() => setShowTablePicker(p => !p)}
                        style={{
                            ...styles.toolButton,
                            ...(showTablePicker ? styles.activeButton : {}),
                        }}
                    >
                        <IconTable size={15} />
                    </button>

                    {showTablePicker && (
                        <div
                            style={styles.tablePicker}
                            onMouseDown={keepSelection}
                            onMouseLeave={() => setTablePickerSize({ rows: 3, cols: 3 })}
                        >
                            <div style={styles.tablePickerGrid}>
                                {Array.from({ length: TABLE_PICKER_ROWS }).map((_, rowIndex) => (
                                    <div key={rowIndex} style={styles.tablePickerRow}>
                                        {Array.from({ length: TABLE_PICKER_COLS }).map((__, colIndex) => {
                                            const rows = rowIndex + 1
                                            const cols = colIndex + 1
                                            const selected = rows <= tablePickerSize.rows && cols <= tablePickerSize.cols

                                            return (
                                                <button
                                                    key={`${rows}-${cols}`}
                                                    type="button"
                                                    title={`${cols} x ${rows}`}
                                                    onMouseEnter={() => setTablePickerSize({ rows, cols })}
                                                    onClick={() => insertTable(rows, cols)}
                                                    style={{
                                                        ...styles.tablePickerCell,
                                                        ...(selected ? styles.tablePickerCellActive : {}),
                                                    }}
                                                />
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div style={styles.tablePickerLabel}>
                                {tablePickerSize.cols} x {tablePickerSize.rows}
                            </div>
                        </div>
                    )}
                    </div>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Thêm cột"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().addColumnAfter().run())}
                        style={styles.toolButton}
                    >
                        <IconColumnInsertRight size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Thêm hàng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().addRowAfter().run())}
                        style={styles.toolButton}
                    >
                        <IconRowInsertBottom size={15} />
                    </button>

                    {false && (
                        <div style={styles.rowHeightControl}>
                            <IconArrowsVertical size={15} style={styles.rowHeightIcon} />
                            <button
                                type="button"
                                className="btn-ghost"
                                title="Giáº£m chiá»u cao hÃ ng"
                                onMouseDown={keepSelection}
                                onClick={() => setCurrentRowHeight(rowHeight - 6)}
                                style={styles.rowHeightButton}
                            >
                                <IconMinus size={13} />
                            </button>
                            <input
                                type="number"
                                min={MIN_ROW_HEIGHT}
                                max={MAX_ROW_HEIGHT}
                                value={rowHeight}
                                title="Chiá»u cao hÃ ng"
                                onChange={event => setCurrentRowHeight(event.target.value)}
                                style={styles.rowHeightInput}
                            />
                            <button
                                type="button"
                                className="btn-ghost"
                                title="TÄƒng chiá»u cao hÃ ng"
                                onMouseDown={keepSelection}
                                onClick={() => setCurrentRowHeight(rowHeight + 6)}
                                style={styles.rowHeightButton}
                            >
                                <IconPlus size={13} />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Xóa bảng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().deleteTable().run())}
                        style={styles.toolButton}
                    >
                        <IconTrash size={15} />
                    </button>

                    <span style={styles.divider} />

                    <IconPalette size={15} style={{ color: 'var(--text-muted)', marginLeft: 2 }} />

                    <div style={styles.colors}>
                        {COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                title={`Màu ${color}`}
                                onMouseDown={keepSelection}
                                onClick={() => runCommand(() => editor.chain().focus().setColor(color).run())}
                                style={{ ...styles.colorButton, background: color }}
                            />
                        ))}
                    </div>

                    <span style={styles.divider} />

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Xóa định dạng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
                        style={styles.toolButton}
                    >
                        <IconEraser size={15} />
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={event => {
                            insertImageFromFile(event.target.files?.[0])
                            event.target.value = ''
                        }}
                    />
                </div>
            )}

            {presentParticipants.length > 0 && (
                <div style={styles.presenceBar}>
                    <span style={styles.presenceLabel}>Đang trong ghi chú</span>
                    <div style={styles.avatarStack}>
                        {presentParticipants.slice(0, 6).map(user => (
                            <div
                                key={user.sessionId || user.clientId || user.userId || user.email}
                                title={`${user.isSelf ? 'Bạn' : displayName(user)}${user.email ? ` - ${user.email}` : ''}`}
                                style={{
                                    ...styles.avatar,
                                    background: user.color,
                                }}
                            >
                                {user.isSelf ? 'Bạn' : initials(user)}
                            </div>
                        ))}
                        {presentParticipants.length > 6 && (
                            <div style={{ ...styles.avatar, ...styles.moreAvatar }}>
                                +{presentParticipants.length - 6}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div ref={editorShellRef} style={styles.editorShell}>
                {isEmpty && (
                    <div style={styles.placeholder}>
                        {placeholder}
                    </div>
                )}

                <EditorContent
                    editor={editor}
                    style={{
                        ...styles.editor,
                        cursor: readOnly ? 'default' : 'text',
                        color: readOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
                    }}
                />

                {rowResizeHandle && (
                    <div
                        title="KÃ©o Ä‘á»ƒ Ä‘á»•i chiá»u cao hÃ ng"
                        onMouseDown={startRowResize}
                        style={{
                            ...styles.rowResizeHandle,
                            top: rowResizeHandle.top,
                            left: rowResizeHandle.left,
                            width: rowResizeHandle.width,
                        }}
                    />
                )}

                <div style={styles.cursorLayer}>
                    {cursorLabels.map(user => (
                        <div
                            key={user.sessionId || user.clientId}
                            style={{
                                ...styles.remoteCursor,
                                left: Math.max(0, user.left),
                                top: Math.max(0, user.top),
                                height: user.height,
                                background: user.color,
                            }}
                        >
                            <div
                                title={`${displayName(user)}${user.email ? ` - ${user.email}` : ''}`}
                                style={{
                                    ...styles.cursorName,
                                    background: user.color,
                                }}
                            >
                                {displayName(user)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})

export default RichTextEditor

const styles = {
    wrap: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
    },
    toolbar: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 14px',
        borderBottom: '.5px solid var(--border)',
        flexWrap: 'wrap',
    },
    toolButton: {
        width: 30,
        height: 28,
        justifyContent: 'center',
        padding: 0,
    },
    toolSelect: {
        height: 28,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontSize: 11,
        padding: '0 8px',
        outline: 'none',
    },

    fontSelect: {
        width: 130,
    },

    sizeSelect: {
        width: 72,
    },
    activeButton: {
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
    },
    divider: {
        width: 1,
        height: 18,
        background: 'var(--border)',
        margin: '0 4px',
    },
    colors: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    colorButton: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        padding: 0,
        border: '.5px solid var(--border)',
    },
    tablePickerWrap: {
        position: 'relative',
        display: 'inline-flex',
    },
    tablePicker: {
        position: 'absolute',
        top: 34,
        left: 0,
        zIndex: 20,
        width: 178,
        padding: '9px 7px 8px',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 12px 28px rgba(15, 23, 42, .18)',
    },
    tablePickerGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
    },
    tablePickerRow: {
        display: 'flex',
        gap: 3,
    },
    tablePickerCell: {
        width: 13,
        height: 13,
        padding: 0,
        borderRadius: 2,
        border: '.5px solid var(--border)',
        background: 'var(--bg-elevated)',
        cursor: 'pointer',
    },
    tablePickerCellActive: {
        background: 'rgba(37, 99, 235, .18)',
        borderColor: 'var(--accent-blue)',
    },
    tablePickerLabel: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-primary)',
        fontWeight: 600,
    },
    rowHeightControl: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        height: 28,
        padding: '0 4px',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
    },
    rowHeightIcon: {
        color: 'var(--text-muted)',
        flexShrink: 0,
    },
    rowHeightButton: {
        width: 22,
        height: 22,
        padding: 0,
        justifyContent: 'center',
        borderRadius: 6,
    },
    rowHeightInput: {
        width: 48,
        height: 22,
        border: 'none',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: 11,
        textAlign: 'center',
        outline: 'none',
        padding: 0,
    },
    presenceBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        minHeight: 38,
        padding: '7px 14px',
        borderBottom: '.5px solid var(--border-light)',
        background: 'var(--bg-surface)',
    },
    presenceLabel: {
        color: 'var(--text-muted)',
        fontSize: 11.5,
        whiteSpace: 'nowrap',
    },
    avatarStack: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: 0,
    },
    avatar: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: '2px solid var(--bg-surface)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        marginLeft: -6,
        boxShadow: '0 2px 8px rgba(15, 23, 42, .12)',
        flexShrink: 0,
    },
    moreAvatar: {
        background: 'var(--text-muted)',
    },
    editorShell: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
    editor: {
        height: '100%',
        overflow: 'auto',
        fontSize: 13,
        lineHeight: 1.7,
        outline: 'none',
        fontFamily: 'var(--font)',
    },
    placeholder: {
        position: 'absolute',
        top: 16,
        left: 20,
        color: 'var(--text-placeholder)',
        fontSize: 13,
        pointerEvents: 'none',
        zIndex: 1,
    },
    rowResizeHandle: {
        position: 'absolute',
        height: 8,
        minWidth: 32,
        transform: 'translateY(-50%)',
        cursor: 'row-resize',
        borderRadius: 999,
        background: 'transparent',
        borderTop: 'none',
        zIndex: 4,
    },
    cursorLayer: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
    },
    remoteCursor: {
        position: 'absolute',
        width: 2,
        minHeight: 16,
        borderRadius: 999,
        pointerEvents: 'auto',
    },
    cursorName: {
        position: 'absolute',
        left: 0,
        top: -21,
        color: '#fff',
        fontSize: 10,
        lineHeight: '16px',
        height: 17,
        maxWidth: 160,
        padding: '0 6px',
        borderRadius: 5,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 5px 16px rgba(15, 23, 42, .18)',
    },
}
