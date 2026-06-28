import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import toast from 'react-hot-toast'
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

function MermaidViewer({ code }) {
    const ref = useRef(null)

    useEffect(() => {
        let mounted = true

        async function renderDiagram() {
            if (!code || !ref.current) return

            try {
                const id = `diagram-${Date.now()}-${Math.random().toString(36).slice(2)}`
                const result = await mermaid.render(id, code)

                if (mounted && ref.current) {
                    ref.current.innerHTML = result.svg
                }
            } catch (err) {
                if (ref.current) {
                    ref.current.innerHTML = `
<pre style="color:#ef4444;white-space:pre-wrap;font-size:12px;">
Mermaid render error:
${String(err)}

${code}
</pre>`
                }
            }
        }

        renderDiagram()

        return () => {
            mounted = false
        }
    }, [code])

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

export default function NoteDiagramGenerator({ noteId, onDong }) {
    const [diagramType, setDiagramType] = useState('MINDMAP')
    const [ketQua, setKetQua] = useState(null)
    const [dangTao, setDangTao] = useState(false)

    const taoSoDo = async () => {
        if (!noteId) {
            toast.error('Không tìm thấy ghi chú')
            return
        }

        setDangTao(true)
        setKetQua(null)

        const toastId = toast.loading('AI đang tạo sơ đồ từ ghi chú...')

        try {
            const { data } = await noteApi.taoSoDo(noteId, {
                diagramType,
            })

            setKetQua(data.data)
            toast.success('Đã tạo sơ đồ', { id: toastId })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tạo sơ đồ', {
                id: toastId,
            })
        } finally {
            setDangTao(false)
        }
    }

    const copyCode = () => {
        if (!ketQua?.diagramCode) return

        navigator.clipboard.writeText(ketQua.diagramCode)
        toast.success('Đã copy code sơ đồ')
    }

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <div>
                    <div style={styles.title}>Tạo sơ đồ từ ghi chú</div>
                    <div style={styles.subtitle}>
                        AI sẽ tạo Mindmap, Flowchart, Architecture hoặc Sketchnote từ nội dung note.
                    </div>
                </div>

                <button className="btn-ghost" onClick={onDong} style={{ padding: 4 }}>
                    ✕
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
                    onClick={taoSoDo}
                    disabled={dangTao}
                    style={styles.generateButton}
                >
                    {dangTao ? 'Đang tạo...' : 'Tạo sơ đồ'}
                </button>

                {ketQua && (
                    <div style={styles.resultBox}>
                        <div style={styles.resultHeader}>
                            <div>
                                <div style={styles.resultTitle}>
                                    {ketQua.noteTitle}
                                </div>

                                <div style={styles.resultMeta}>
                                    {ketQua.diagramType} · {ketQua.format}
                                </div>
                            </div>

                            <button
                                className="btn-ghost"
                                onClick={copyCode}
                                style={{ fontSize: 11 }}
                            >
                                Copy code
                            </button>
                        </div>

                        <div style={styles.previewBox}>
                            {ketQua.format === 'MERMAID' ? (
                                <MermaidViewer code={ketQua.diagramCode} />
                            ) : (
                                <SketchnoteViewer jsonText={ketQua.diagramCode} />
                            )}
                        </div>

                        <details style={{ marginTop: 10 }}>
                            <summary style={styles.summary}>
                                Xem code
                            </summary>

                            <pre style={styles.codeBox}>
                                {ketQua.diagramCode}
                            </pre>
                        </details>
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
    previewBox: {
        padding: 10,
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'white',
        color: '#111827',
        overflowX: 'auto',
    },
    mermaidBox: {
        overflowX: 'auto',
        minHeight: 120,
    },
    summary: {
        cursor: 'pointer',
        fontSize: 11,
        color: 'var(--text-muted)',
    },
    codeBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.06)',
        fontSize: 11,
        whiteSpace: 'pre-wrap',
        overflowX: 'auto',
    },
    errorPre: {
        color: '#ef4444',
        whiteSpace: 'pre-wrap',
        fontSize: 12,
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
}