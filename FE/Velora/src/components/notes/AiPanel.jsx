import { useEffect, useMemo, useState } from 'react'
import { IconSparkles, IconX, IconCheck, IconLoader2 } from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import toast from 'react-hot-toast'
import useAuthStore from '../../service/authStore'
import { hasFeature } from '../../utils/packageFeatures'

const ACTIONS = [
    {
        key: 'SUMMARIZE',
        label: 'Tóm tắt',
        features: ['AI_SUMMARY_BASIC'],
    },
    {
        key: 'STRUCTURE',
        label: 'Cải thiện cấu trúc',
        features: ['AI_NOTE_FORMAT'],
    },
    {
        key: 'CREATE_CHECKLIST',
        label: 'Tạo checklist',
        features: ['AI_NOTE_FORMAT', 'CHECKLIST_BASIC'],
    },
    {
        key: 'SUGGEST_TITLE',
        label: 'Đề xuất tiêu đề',
        features: ['AI_NOTE_FORMAT'],
    },
]

export default function AiPanel({ noteId, content, title, onApply, onInsertChecklist, onClose }) {
    const { user } = useAuthStore()

    const availableActions = useMemo(() => {
        return ACTIONS.filter(action =>
            action.features.every(feature => hasFeature(user, feature))
        )
    }, [user?.packageFeatures, user?.role])

    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [action, setAction] = useState('')

    const selectedAction = availableActions.find(action => action.key === action)
        ? action
        : availableActions[0]?.key || ''

    useEffect(() => {
        if (!action && availableActions.length > 0) {
            setAction(availableActions[0].key)
            return
        }

        const validAction = availableActions.some(action => action.key === action)

        if (!validAction) {
            setAction(availableActions[0]?.key || '')
            setResult(null)
        }
    }, [action, availableActions])

    const handleAction = async () => {
        if (!content?.trim()) {
            toast.error('Ghi chú đang trống')
            return
        }

        if (!selectedAction) {
            toast.error('Gói hiện tại chưa hỗ trợ tính năng AI ghi chú.')
            return
        }

        setLoading(true)
        setResult(null)

        try {
            const { data } = await noteApi.improveWithAi(noteId, {
                content,
                title,
                action: selectedAction,
            })

            setResult(data.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'AI không phản hồi, thử lại sau')
        } finally {
            setLoading(false)
        }
    }

    const applyResult = async () => {
        if (!result) return

        try {
            await onApply?.(result)
            onClose?.()
            toast.success('Đã áp dụng gợi ý AI')
        } catch (error) {
            toast.error(error?.message || 'Không thể áp dụng gợi ý AI')
        }
    }

    const skip = () => {
        setResult(null)
    }

    const insertChecklistIntoNote = () => {
        const items = (result?.checklist || []).map(text => String(text).trim()).filter(Boolean)
        if (items.length === 0) return

        const escape = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

        const itemsHtml = items
            .map(text => `<li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>${escape(text)}</p></div></li>`)
            .join('')

        const html = `<ul data-type="taskList">${itemsHtml}</ul>`

        try {
            onInsertChecklist?.(html)
            onClose?.()
            toast.success('Đã chèn checklist vào ghi chú')
        } catch (error) {
            toast.error(error?.message || 'Không thể chèn checklist')
        }
    }

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconSparkles size={13} style={{ color: 'var(--accent-blue-dim)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Trợ lý AI</span>
        </span>

                <button className="btn-ghost" onClick={onClose} style={{ padding: 3 }}>
                    <IconX size={13} />
                </button>
            </div>

            <div style={styles.body}>
                {availableActions.length > 0 ? (
                    <div style={styles.actions}>
                        {availableActions.map(h => (
                            <button
                                key={h.key}
                                onClick={() => {
                                    setAction(h.key)
                                    setResult(null)
                                }}
                                className={selectedAction === h.key ? 'btn-ai' : 'btn-ghost'}
                                style={{ fontSize: 11, padding: '3px 9px' }}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={styles.lockedBox}>
                        Gói hiện tại chưa hỗ trợ AI ghi chú. Vui lòng nâng cấp gói để sử dụng các tính năng AI.
                    </div>
                )}

                <button
                    className="btn-primary"
                    onClick={handleAction}
                    disabled={loading || availableActions.length === 0}
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '7px',
                        fontSize: 12,
                        opacity: availableActions.length === 0 ? 0.6 : 1,
                        cursor: availableActions.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? (
                        <>
                            <IconLoader2 size={13} className="animate-spin" />
                            Đang xử lý...
                        </>
                    ) : (
                        '▶ Chạy AI'
                    )}
                </button>

                {result && (
                    <div style={styles.result}>
                        {result.suggestedTitle && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Tiêu đề gợi ý</div>
                                <div style={styles.resultText}>{result.suggestedTitle}</div>
                            </div>
                        )}

                        {result.summary && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Tóm tắt</div>
                                <div style={styles.resultText}>{result.summary}</div>
                            </div>
                        )}

                        {result.checklist?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Checklist</div>
                                {result.checklist.map((c, i) => (
                                    <div key={i} style={styles.checkItem}>
                                        ☐ {c}
                                    </div>
                                ))}
                            </div>
                        )}

                        {result.improvedContent && (
                            <div style={{ marginBottom: 8 }}>
                                <div style={styles.resultLabel}>Nội dung đã cải thiện</div>
                                <div style={{ ...styles.resultText, maxHeight: 120, overflow: 'auto' }}>
                                    {result.improvedContent}
                                </div>
                            </div>
                        )}

                        {result.checklist?.length > 0 ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn-primary"
                                    onClick={insertChecklistIntoNote}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                >
                                    <IconCheck size={12} /> Chèn vào ghi chú
                                </button>

                                <button
                                    className="btn-ghost"
                                    onClick={applyResult}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                    title="Tạo các task có deadline trong Lịch, dựa theo checklist này"
                                >
                                    Tạo task có deadline
                                </button>
                            </div>
                        ) : result.improvedContent ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                    className="btn-primary"
                                    onClick={applyResult}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                >
                                    <IconCheck size={12} /> Chấp nhận AI
                                </button>

                                <button
                                    className="btn-ghost"
                                    onClick={skip}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                                >
                                    Giữ nguyên
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn-primary"
                                onClick={applyResult}
                                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                            >
                                <IconCheck size={12} /> Áp dụng
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    panel: {
        width: 260,
        background: 'var(--bg-surface)',
        borderLeft: '.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)',
    },
    body: {
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
        flex: 1,
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
    },
    lockedBox: {
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        fontSize: 12,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
    },
    result: {
        background: 'var(--bg-elevated)',
        borderRadius: 6,
        padding: 10,
        border: '.5px solid var(--border)',
    },
    resultLabel: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    resultText: {
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    checkItem: {
        fontSize: 12,
        padding: '2px 0',
        color: 'var(--text-secondary)',
    },
}
