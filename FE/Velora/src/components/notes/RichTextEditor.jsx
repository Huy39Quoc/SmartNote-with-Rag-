import { useEffect, useMemo, useRef } from 'react'
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconList,
    IconListNumbers,
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
import * as Y from 'yjs'
import { sanitizeRichText } from '../../utils/richText'

const COLORS = [
    '#e8e6de',
    '#ffffff',
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

export default function RichTextEditor({
    value,
    onChange,
    readOnly,
    placeholder,
    noteId,
    collaborationUrl,
    onPermissionChange,
}) {
    const fileInputRef = useRef(null)
    const socketRef = useRef(null)
    const suppressBroadcastRef = useRef(false)
    const seedBroadcastRef = useRef(false)
    const clientIdRef = useRef(
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    )

    const ydoc = useMemo(() => new Y.Doc(), [noteId])
    const yXmlFragment = useMemo(() => ydoc.getXmlFragment('content'), [ydoc])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false,
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
            TableRow,
            TableHeader,
            TableCell,
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
        },
    })

    useEffect(() => {
        return () => {
            socketRef.current?.close()
            ydoc.destroy()
        }
    }, [ydoc])

    useEffect(() => {
        if (!editor) return

        editor.setEditable(!readOnly)
    }, [editor, readOnly])

    useEffect(() => {
        if (!editor || collaborationUrl || yXmlFragment.length > 0) return

        suppressBroadcastRef.current = true
        editor.commands.setContent(sanitizeRichText(value || '<p></p>'), false)
        suppressBroadcastRef.current = false
    }, [editor, value, yXmlFragment, collaborationUrl])

    useEffect(() => {
        if (!collaborationUrl || !noteId || !editor) return undefined

        const socket = new WebSocket(collaborationUrl)
        socketRef.current = socket

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
                    onPermissionChange?.(payload.canEdit ? 'EDIT' : 'VIEW')

                    if (Array.isArray(payload.updates) && payload.updates.length > 0) {
                        payload.updates.forEach(update => {
                            Y.applyUpdate(ydoc, base64ToBytes(update), 'remote')
                        })
                    } else if (editor && yXmlFragment.length === 0) {
                        seedBroadcastRef.current = !!payload.shouldSeed
                        suppressBroadcastRef.current = !payload.shouldSeed
                        editor.commands.setContent(sanitizeRichText(payload.content || value || '<p></p>'), false)
                        suppressBroadcastRef.current = false
                        if (!payload.shouldSeed) {
                            seedBroadcastRef.current = false
                        }
                    }

                    return
                }

                if (payload.type === 'permission-updated') {
                    onPermissionChange?.(payload.accessMode || (payload.canEdit ? 'EDIT' : 'VIEW'))
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
            } catch {
                // Ignore malformed collaboration messages.
            }
        }

        socket.onclose = () => {
            if (socketRef.current === socket) {
                socketRef.current = null
            }
        }

        return () => {
            ydoc.off('update', handleYjsUpdate)
            socket.close()
            if (socketRef.current === socket) {
                socketRef.current = null
            }
        }
    }, [collaborationUrl, noteId, onPermissionChange, editor, value, yXmlFragment, ydoc])

    const keepSelection = (event) => {
        event.preventDefault()
    }

    const runCommand = (command) => {
        if (!editor || readOnly) return
        command()
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

    const isEmpty = !editor || editor.isEmpty

    return (
        <div style={styles.wrap}>
            {!readOnly && (
                <div style={styles.toolbar}>
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
                        onClick={() => runCommand(() => editor.chain().focus().setTextAlign('left').run())}
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
                        onClick={() => runCommand(() => editor.chain().focus().setTextAlign('center').run())}
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
                        onClick={() => runCommand(() => editor.chain().focus().setTextAlign('right').run())}
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
                        onClick={() => runCommand(() => editor.chain().focus().setTextAlign('justify').run())}
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

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Chèn bảng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand(() => editor.chain().focus().insertTable({
                            rows: 3,
                            cols: 3,
                            withHeaderRow: true,
                        }).run())}
                        style={styles.toolButton}
                    >
                        <IconTable size={15} />
                    </button>

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

            <div style={styles.editorShell}>
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
            </div>
        </div>
    )
}

const styles = {
    wrap: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
    },
    toolbar: {
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
}
