import { useEffect, useRef, useState } from 'react'
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconList,
    IconListNumbers,
    IconPalette,
    IconEraser,
} from '@tabler/icons-react'
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

export default function RichTextEditor({ value, onChange, readOnly, placeholder }) {
    const editorRef = useRef(null)
    const [focused, setFocused] = useState(false)

    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return

        const safeValue = sanitizeRichText(value || '')

        if (editor.innerHTML !== safeValue) {
            editor.innerHTML = safeValue
        }
    }, [value])

    const emitChange = () => {
        const editor = editorRef.current
        if (!editor) return

        onChange?.(sanitizeRichText(editor.innerHTML))
    }

    const runCommand = (command, commandValue = null) => {
        if (readOnly) return

        editorRef.current?.focus()
        document.execCommand(command, false, commandValue)
        emitChange()
    }

    const keepSelection = (event) => {
        event.preventDefault()
    }

    const handlePaste = (event) => {
        if (readOnly) return

        event.preventDefault()

        const html = event.clipboardData.getData('text/html')
        const text = event.clipboardData.getData('text/plain')
        const pastedContent = html || text.replace(/\n/g, '<br>')

        document.execCommand('insertHTML', false, sanitizeRichText(pastedContent))
        emitChange()
    }

    const isEmpty = !sanitizeRichText(value || '')
        .replace(/<br\s*\/?>|&nbsp;|\s|<[^>]+>/gi, '')

    return (
        <div style={styles.wrap}>
            {!readOnly && (
                <div style={styles.toolbar}>
                    <button
                        type="button"
                        className="btn-ghost"
                        title="In đậm"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand('bold')}
                        style={styles.toolButton}
                    >
                        <IconBold size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="In nghiêng"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand('italic')}
                        style={styles.toolButton}
                    >
                        <IconItalic size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Gạch chân"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand('underline')}
                        style={styles.toolButton}
                    >
                        <IconUnderline size={15} />
                    </button>

                    <span style={styles.divider} />

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Danh sách"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand('insertUnorderedList')}
                        style={styles.toolButton}
                    >
                        <IconList size={15} />
                    </button>

                    <button
                        type="button"
                        className="btn-ghost"
                        title="Danh sách số"
                        onMouseDown={keepSelection}
                        onClick={() => runCommand('insertOrderedList')}
                        style={styles.toolButton}
                    >
                        <IconListNumbers size={15} />
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
                                onClick={() => runCommand('foreColor', color)}
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
                        onClick={() => runCommand('removeFormat')}
                        style={styles.toolButton}
                    >
                        <IconEraser size={15} />
                    </button>
                </div>
            )}

            <div style={styles.editorShell}>
                {isEmpty && !focused && (
                    <div style={styles.placeholder}>
                        {placeholder}
                    </div>
                )}

                <div
                    className="rich-text-editor"
                    ref={editorRef}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onInput={emitChange}
                    onBlur={() => {
                        setFocused(false)
                        emitChange()
                    }}
                    onFocus={() => setFocused(true)}
                    onPaste={handlePaste}
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
        padding: '16px 20px',
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
