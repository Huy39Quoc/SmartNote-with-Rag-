import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import toast from 'react-hot-toast'
import {
    IconZoomIn,
    IconZoomOut,
    IconMaximize,
    IconX,
    IconCopy,
    IconPhotoDown,
    IconFileTypeSvg,
    IconRefresh,
    IconArrowBackUp,
} from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'

mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'default',
})

const DIAGRAM_TYPES = [
    { value: 'MINDMAP', label: 'Mindmap - Sơ đồ tư duy' },
    { value: 'FLOWCHART', label: 'Flowchart - Quy trình' },
    { value: 'ARCHITECTURE', label: 'Architecture - Kiến trúc' },
    { value: 'SKETCHNOTE', label: 'Sketchnote - Ghi chú trực quan' },
]

// Loại bỏ mọi phần tử mermaid vô tình chèn thẳng vào <body> khi render lỗi
// (mermaid tự vẽ 1 icon lỗi và không luôn dọn dẹp phần tử tạm của nó).
function withBodyLeakCleanup(fn) {
    const before = new Set(Array.from(document.body.children))

    const cleanup = () => {
        Array.from(document.body.children).forEach(el => {
            if (!before.has(el)) el.remove()
        })
    }

    return fn(cleanup)
}

async function renderMermaidToSvg(code) {
    return withBodyLeakCleanup(async (cleanup) => {
        const valid = await mermaid.parse(code, { suppressErrors: true })

        if (!valid) {
            cleanup()
            throw new Error('invalid-syntax')
        }

        const id = `diagram-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const result = await mermaid.render(id, code)
        cleanup()
        return result.svg
    })
}

async function svgToPngDataUrl(svgString, scale = 2) {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
            const width = img.naturalWidth || img.width || 900
            const height = img.naturalHeight || img.height || 500

            const canvas = document.createElement('canvas')
            canvas.width = width * scale
            canvas.height = height * scale

            const ctx = canvas.getContext('2d')
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.scale(scale, scale)
            ctx.drawImage(img, 0, 0, width, height)

            URL.revokeObjectURL(url)
            resolve(canvas.toDataURL('image/png'))
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('svg-to-png-failed'))
        }

        img.src = url
    })
}

function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
}

function ErrorNotice() {
    return (
        <div style={styles.errorNotice}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Không thể hiển thị sơ đồ</div>
            <div>
                Cú pháp sơ đồ chưa đúng (thường do nội dung ghi chú quá dài/phức tạp).
                Bạn có thể bấm "Xem &amp; sửa code" bên dưới để tự chỉnh lại rồi vẽ lại,
                hoặc tạo lại sơ đồ.
            </div>
        </div>
    )
}

function MermaidViewer({ code }) {
    const ref = useRef(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let mounted = true

        async function run() {
            if (!code || !ref.current) return
            setError(false)

            try {
                const svg = await renderMermaidToSvg(code)
                if (mounted && ref.current) ref.current.innerHTML = svg
            } catch {
                if (mounted) setError(true)
            }
        }

        run()

        return () => { mounted = false }
    }, [code])

    if (error) return <ErrorNotice />

    return <div ref={ref} style={styles.mermaidBox} />
}

function SketchnoteViewer({ jsonText }) {
    let data

    try {
        data = JSON.parse(jsonText)
    } catch {
        return (
            <pre style={styles.errorPre}>
                Sketchnote JSON không hợp lệ:
                {'\n'}
                {jsonText}
            </pre>
        )
    }

    return (
        <div>
            <h3 style={styles.sketchTitle}>{data.title}</h3>

            <div style={styles.sketchGrid}>
                {(data.blocks || []).map((block, index) => (
                    <div key={index} style={styles.sketchCard}>
                        <div style={styles.sketchIcon}>{block.icon || '📝'}</div>
                        <div style={styles.sketchHeading}>{block.heading}</div>
                        <div style={styles.sketchContent}>{block.content}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function buildSketchnoteHtml(jsonText, title) {
    let data
    try {
        data = JSON.parse(jsonText)
    } catch {
        return null
    }

    const blocks = (data.blocks || [])
        .map(b => `<div><strong>${escapeHtml(b.icon || '📝')} ${escapeHtml(b.heading || '')}</strong><br>${escapeHtml(b.content || '')}</div>`)
        .join('<br>')

    return `<div><h3>${escapeHtml(data.title || title || 'Sơ đồ')}</h3><br>${blocks}</div>`
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function FullscreenModal({ format, code, onClose }) {
    const [zoom, setZoom] = useState(1)

    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    return (
        <div style={styles.modalBackdrop} onClick={onClose}>
            <div style={styles.modalPanel} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <div style={styles.zoomControls}>
                        <button className="btn-ghost" onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} title="Thu nhỏ">
                            <IconZoomOut size={16} />
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 40, textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </span>
                        <button className="btn-ghost" onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Phóng to">
                            <IconZoomIn size={16} />
                        </button>
                        <button className="btn-ghost" onClick={() => setZoom(1)} title="Đặt lại zoom">
                            <IconRefresh size={16} />
                        </button>
                    </div>

                    <button className="btn-ghost" onClick={onClose} title="Đóng">
                        <IconX size={16} />
                    </button>
                </div>

                <div style={styles.modalBody}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
                        {format === 'MERMAID' ? (
                            <MermaidViewer code={code} />
                        ) : (
                            <SketchnoteViewer jsonText={code} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function NoteDiagramGenerator({ noteId, onClose, onInsertIntoNote }) {
    const [diagramType, setDiagramType] = useState('MINDMAP')
    const [result, setResult] = useState(null)
    const [codeText, setCodeText] = useState('')
    const [isCreating, setCreating] = useState(false)
    const [isInserting, setInserting] = useState(false)
    const [isLoading, setLoading] = useState(false)
    const [showCode, setShowCode] = useState(false)
    const [showFullscreen, setShowFullscreen] = useState(false)
    const [zoom, setZoom] = useState(1)

    useEffect(() => {
        if (result?.diagramCode != null) {
            setCodeText(result.diagramCode)
        }
    }, [result])

    const createDiagram = async () => {
        if (!noteId) {
            toast.error('Không tìm thấy ghi chú')
            return
        }

        setCreating(true)
        setResult(null)
        setZoom(1)

        const toastId = toast.loading('AI đang tạo sơ đồ từ ghi chú...')

        try {
            const { data } = await noteApi.createDiagram(noteId, {
                diagramType,
            })

            setResult(data.data)
            toast.success('Đã tạo sơ đồ', { id: toastId })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo sơ đồ', {
                id: toastId,
            })
        } finally {
            setCreating(false)
        }
    }

    const redrawFromCode = () => {
        if (!codeText.trim()) {
            toast.error('Code sơ đồ đang trống')
            return
        }

        setResult(p => p ? { ...p, diagramCode: codeText } : p)
        toast.success('Đã vẽ lại theo code chỉnh sửa')
    }

    const restoreOriginalCode = () => {
        // Trường hợp người dùng chỉnh code lỗi, khôi phục lại bản gốc AI đã sinh ra.
        createDiagram()
    }

    const copyCode = () => {
        if (!codeText) return

        navigator.clipboard.writeText(codeText)
        toast.success('Đã copy code sơ đồ')
    }

    const insertIntoNote = async () => {
        if (!result) return

        setInserting(true)

        try {
            if (result.format === 'MERMAID') {
                const svg = await renderMermaidToSvg(codeText)
                const pngDataUrl = await svgToPngDataUrl(svg)
                const html = `<p><img src="${pngDataUrl}" alt="${escapeHtml(result.noteTitle || 'Sơ đồ')}"></p>`
                onInsertIntoNote?.(html)
            } else {
                const html = buildSketchnoteHtml(codeText, result.noteTitle)
                if (!html) {
                    toast.error('Sơ đồ chưa hợp lệ, không thể chèn')
                    return
                }
                onInsertIntoNote?.(html)
            }
        } catch {
            toast.error('Không thể chèn sơ đồ (cú pháp chưa hợp lệ)')
        } finally {
            setInserting(false)
        }
    }

    const downloadPng = async () => {
        if (!result || result.format !== 'MERMAID') return

        setLoading(true)
        try {
            const svg = await renderMermaidToSvg(codeText)
            const pngDataUrl = await svgToPngDataUrl(svg, 2.5)
            downloadDataUrl(pngDataUrl, `${(result.noteTitle || 'so-do').replace(/\s+/g, '-')}.png`)
        } catch {
            toast.error('Không thể xuất PNG (cú pháp chưa hợp lệ)')
        } finally {
            setLoading(false)
        }
    }

    const downloadSvg = async () => {
        if (!result || result.format !== 'MERMAID') return

        setLoading(true)
        try {
            const svg = await renderMermaidToSvg(codeText)
            const blob = new Blob([svg], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            downloadDataUrl(url, `${(result.noteTitle || 'so-do').replace(/\s+/g, '-')}.svg`)
            URL.revokeObjectURL(url)
        } catch {
            toast.error('Không thể xuất SVG (cú pháp chưa hợp lệ)')
        } finally {
            setLoading(false)
        }
    }

    const hasEditedCode = result && codeText !== result.diagramCode

    return (
        <div style={styles.panel}>
            {showFullscreen && result && (
                <FullscreenModal
                    format={result.format}
                    code={codeText}
                    onClose={() => setShowFullscreen(false)}
                />
            )}

            <div style={styles.header}>
                <div>
                    <div style={styles.title}>Tạo sơ đồ từ ghi chú</div>
                    <div style={styles.subtitle}>
                        AI sẽ tạo Mindmap, Flowchart, Architecture hoặc Sketchnote từ nội dung note.
                        Bạn có thể chỉnh sửa, phóng to và chèn thẳng vào ghi chú.
                    </div>
                </div>

                <button className="btn-ghost" onClick={onClose} style={{ padding: 4 }}>
                    <IconX size={15} />
                </button>
            </div>

            <div style={styles.body}>
                <select
                    value={diagramType}
                    onChange={e => setDiagramType(e.target.value)}
                    style={styles.select}
                >
                    {DIAGRAM_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>

                <button
                    className="btn-primary"
                    onClick={createDiagram}
                    disabled={isCreating}
                    style={styles.generateButton}
                >
                    {isCreating ? 'Đang tạo...' : result ? 'Tạo sơ đồ mới' : 'Tạo sơ đồ'}
                </button>

                {result && (
                    <div style={styles.resultBox}>
                        <div style={styles.resultHeader}>
                            <div>
                                <div style={styles.resultTitle}>
                                    {result.noteTitle}
                                </div>

                                <div style={styles.resultMeta}>
                                    {result.diagramType} · {result.format}
                                    {hasEditedCode && ' · đã chỉnh sửa'}
                                </div>
                            </div>

                            <div style={styles.toolRow}>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                                    title="Thu nhỏ"
                                    style={styles.iconButton}
                                >
                                    <IconZoomOut size={14} />
                                </button>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setZoom(z => Math.min(2.4, z + 0.2))}
                                    title="Phóng to"
                                    style={styles.iconButton}
                                >
                                    <IconZoomIn size={14} />
                                </button>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setShowFullscreen(true)}
                                    title="Xem toàn màn hình"
                                    style={styles.iconButton}
                                >
                                    <IconMaximize size={14} />
                                </button>
                            </div>
                        </div>

                        <div style={styles.previewBox}>
                            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
                                {result.format === 'MERMAID' ? (
                                    <MermaidViewer code={codeText} />
                                ) : (
                                    <SketchnoteViewer jsonText={codeText} />
                                )}
                            </div>
                        </div>

                        <div style={styles.actionsGrid}>
                            <button
                                className="btn-primary"
                                onClick={insertIntoNote}
                                disabled={isInserting}
                                style={styles.actionButton}
                            >
                                {isInserting ? 'Đang chèn...' : 'Chèn vào ghi chú'}
                            </button>

                            {result.format === 'MERMAID' && (
                                <>
                                    <button
                                        className="btn-ghost"
                                        onClick={downloadPng}
                                        disabled={isLoading}
                                        style={styles.actionButton}
                                        title="Tải xuống PNG"
                                    >
                                        <IconPhotoDown size={14} /> PNG
                                    </button>
                                    <button
                                        className="btn-ghost"
                                        onClick={downloadSvg}
                                        disabled={isLoading}
                                        style={styles.actionButton}
                                        title="Tải xuống SVG"
                                    >
                                        <IconFileTypeSvg size={14} /> SVG
                                    </button>
                                </>
                            )}

                            <button
                                className="btn-ghost"
                                onClick={copyCode}
                                style={styles.actionButton}
                            >
                                <IconCopy size={14} /> Copy code
                            </button>
                        </div>

                        <button
                            className="btn-ghost"
                            onClick={() => setShowCode(p => !p)}
                            style={{ ...styles.summary, marginTop: 10, width: '100%', justifyContent: 'flex-start' }}
                        >
                            {showCode ? 'Ẩn code' : 'Xem & sửa code'}
                        </button>

                        {showCode && (
                            <div style={{ marginTop: 8 }}>
                                <textarea
                                    value={codeText}
                                    onChange={e => setCodeText(e.target.value)}
                                    spellCheck={false}
                                    style={styles.codeTextarea}
                                />

                                <div style={styles.toolRow}>
                                    <button
                                        className="btn-primary"
                                        onClick={redrawFromCode}
                                        style={{ ...styles.actionButton, flex: 1 }}
                                    >
                                        Vẽ lại theo code này
                                    </button>

                                    {hasEditedCode && (
                                        <button
                                            className="btn-ghost"
                                            onClick={restoreOriginalCode}
                                            title="Khôi phục code gốc do AI tạo (tạo lại)"
                                            style={styles.actionButton}
                                        >
                                            <IconArrowBackUp size={14} /> Khôi phục
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    panel: {
        width: 380,
        background: 'var(--bg-surface)',
        borderLeft: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)',
    },
    title: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    subtitle: {
        fontSize: 11,
        color: 'var(--text-muted)',
        lineHeight: 1.4,
        marginTop: 4,
    },
    body: {
        padding: 12,
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    select: {
        height: 34,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '0 10px',
        fontSize: 12,
    },
    generateButton: {
        justifyContent: 'center',
        fontSize: 12,
    },
    resultBox: {
        marginTop: 4,
        padding: 10,
        border: '.5px solid var(--border)',
        borderRadius: 10,
        background: 'var(--bg-elevated)',
    },
    resultHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 10,
    },
    resultTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    resultMeta: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginTop: 2,
    },
    toolRow: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
    },
    iconButton: {
        padding: 5,
    },
    previewBox: {
        padding: 10,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'white',
        color: '#111827',
        overflow: 'auto',
        maxHeight: 340,
    },
    mermaidBox: {
        overflowX: 'auto',
        minHeight: 120,
    },
    actionsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    actionButton: {
        fontSize: 11.5,
        justifyContent: 'center',
    },
    summary: {
        cursor: 'pointer',
        fontSize: 11,
        color: 'var(--text-muted)',
    },
    codeTextarea: {
        width: '100%',
        minHeight: 160,
        padding: 10,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.06)',
        color: 'var(--text-primary)',
        border: '.5px solid var(--border)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'pre',
        resize: 'vertical',
    },
    errorPre: {
        color: '#ef4444',
        whiteSpace: 'pre-wrap',
        fontSize: 12,
    },
    errorNotice: {
        padding: 14,
        color: '#b91c1c',
        fontSize: 12.5,
        lineHeight: 1.6,
    },
    sketchTitle: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 12,
    },
    sketchGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 8,
    },
    sketchCard: {
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 10,
        background: '#fff',
    },
    sketchIcon: {
        fontSize: 24,
        marginBottom: 6,
    },
    sketchHeading: {
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 4,
    },
    sketchContent: {
        fontSize: 12,
        color: '#374151',
        lineHeight: 1.5,
    },
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalPanel: {
        background: '#fff',
        borderRadius: 14,
        width: '92vw',
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid #e5e7eb',
    },
    zoomControls: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    modalBody: {
        flex: 1,
        overflow: 'auto',
        padding: 20,
        background: '#fafafa',
    },
}
