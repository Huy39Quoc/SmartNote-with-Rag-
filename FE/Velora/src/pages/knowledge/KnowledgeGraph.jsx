import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBrain, IconFileText, IconNotes, IconRefresh } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import knowledgeApi from '../../lib/api/knowledgeApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const WIDTH = 900
const HEIGHT = 620
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2
const RADIUS = 260

export default function KnowledgeGraph() {
    const navigate = useNavigate()
    const [isLoading, setLoading] = useState(true)
    const [data, setData] = useState({ nodes: [], edges: [] })
    const [nodeHover, setNodeHover] = useState(null)

    const loadGraph = async () => {
        setLoading(true)
        try {
            const { data } = await knowledgeApi.getGraph()
            setData(data.data || { nodes: [], edges: [] })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải bản đồ tri thức')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadGraph() }, [])

    // Bố trí node theo vòng tròn, cụm gần nhau hơn nếu liên kết với nhiều node khác
    const layout = useMemo(() => {
        const { nodes } = data
        if (nodes.length === 0) return []

        return nodes.map((node, i) => {
            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
            return {
                ...node,
                x: CENTER_X + RADIUS * Math.cos(angle),
                y: CENTER_Y + RADIUS * Math.sin(angle),
            }
        })
    }, [data])

    const nodeById = useMemo(() => {
        const map = {}
        layout.forEach(n => { map[n.id] = n })
        return map
    }, [layout])

    const goToNode = (node) => {
        if (!node) return
        if (node.type === 'note') navigate(`/notes/${node.id}`)
        else navigate(`/documents?documentId=${node.id}`)
    }

    const degreeById = useMemo(() => {
        const map = {}
        data.edges.forEach(e => {
            map[e.from] = (map[e.from] || 0) + 1
            map[e.to] = (map[e.to] || 0) + 1
        })
        return map
    }, [data.edges])

    return (
        <div style={styles.wrap}>
            <div style={styles.headerRow}>
                <div>
                    <div style={styles.title}>
                        <IconBrain size={16} style={{ color: 'var(--accent-blue-dim)' }} />
                        Bản đồ tri thức (AI/RAG)
                    </div>
                    <p style={styles.desc}>
                        AI tự động tìm ra các ghi chú &amp; tài liệu có nội dung liên quan đến nhau,
                        dựa trên chính vector embedding đang dùng cho RAG chat — không cần bạn tự gắn thẻ.
                        Click vào 1 node để mở ghi chú/tài liệu đó.
                    </p>
                </div>

                <button className="btn-ghost" onClick={loadGraph} disabled={isLoading}>
                    <IconRefresh size={14} />
                    Làm mới
                </button>
            </div>

            <div style={styles.legend}>
                <span style={styles.legendItem}>
                    <span style={{ ...styles.dot, background: 'var(--accent-blue)' }} /> Ghi chú
                </span>
                <span style={styles.legendItem}>
                    <span style={{ ...styles.dot, background: 'var(--accent-purple)' }} /> Tài liệu
                </span>
                <span style={{ ...styles.legendItem, color: 'var(--text-faint)' }}>
                    Đường nối càng đậm = nội dung càng liên quan
                </span>
            </div>

            <div style={styles.canvasBox}>
                {isLoading ? (
                    <div style={styles.centerBox}><Spinner size={22} /></div>
                ) : layout.length === 0 ? (
                    <div style={styles.centerBox}>
                        <EmptyState
                            icon={IconBrain}
                            title="Chưa đủ dữ liệu để tạo bản đồ"
                            desc="Hãy tạo/upload thêm ghi chú và tài liệu — AI cần ít nhất vài ghi chú đã được xử lý để tìm ra mối liên quan ngữ nghĩa giữa chúng."
                        />
                    </div>
                ) : (
                    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={styles.svg}>
                        {data.edges.map((edge, i) => {
                            const a = nodeById[edge.from]
                            const b = nodeById[edge.to]
                            if (!a || !b) return null

                            const isHoverEdge = nodeHover && (nodeHover === edge.from || nodeHover === edge.to)

                            return (
                                <line
                                    key={i}
                                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                    stroke={isHoverEdge ? 'var(--accent-blue-dim)' : 'var(--border)'}
                                    strokeWidth={isHoverEdge ? 2 : Math.max(0.6, edge.weight * 2.2)}
                                    strokeOpacity={isHoverEdge ? 0.9 : Math.max(0.15, edge.weight - 0.3)}
                                />
                            )
                        })}

                        {layout.map(node => {
                            const degree = degreeById[node.id] || 0
                            const r = Math.min(22, 9 + degree * 2.2)
                            const isNote = node.type === 'note'

                            return (
                                <g
                                    key={node.id}
                                    transform={`translate(${node.x}, ${node.y})`}
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setNodeHover(node.id)}
                                    onMouseLeave={() => setNodeHover(null)}
                                    onClick={() => goToNode(node)}
                                >
                                    <title>{node.title}</title>
                                    <circle
                                        r={r}
                                        fill={isNote ? 'var(--accent-blue)' : 'var(--accent-purple)'}
                                        fillOpacity={nodeHover === node.id ? 1 : 0.85}
                                        stroke="var(--bg-surface)"
                                        strokeWidth={2}
                                    />
                                    <text
                                        y={r + 14}
                                        textAnchor="middle"
                                        fontSize={10.5}
                                        fill="var(--text-secondary)"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {(node.title || '').length > 18
                                            ? node.title.slice(0, 18) + '…'
                                            : node.title}
                                    </text>
                                </g>
                            )
                        })}
                    </svg>
                )}
            </div>
        </div>
    )
}

const styles = {
    wrap: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        overflow: 'auto',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    desc: {
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 4,
        maxWidth: 640,
        lineHeight: 1.5,
    },
    legend: {
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        fontSize: 11.5,
        color: 'var(--text-secondary)',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 9,
        height: 9,
        borderRadius: '50%',
        display: 'inline-block',
    },
    canvasBox: {
        flex: 1,
        border: '.5px solid var(--border)',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        minHeight: 480,
        display: 'flex',
    },
    centerBox: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        width: '100%',
        height: '100%',
    },
}
