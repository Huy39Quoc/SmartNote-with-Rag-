import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
    IconBrain,
    IconCheck,
    IconFileText,
    IconPlus,
    IconSearch,
    IconSitemap,
    IconSparkles,
    IconTrash,
    IconX,
} from '@tabler/icons-react'

import noteApi from '../../lib/api/noteApi'
import knowledgeApi from '../../lib/api/knowledgeApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function Knowledge() {
    const [items, setItems] = useState([])
    const [select, setSelected] = useState(null)
    const [details, setDetails] = useState(null)
    const [isLoading, setLoading] = useState(true)
    const [isClassifying, setClassifying] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [groupName, setGroupName] = useState('')
    const navigate = useNavigate()
    const [allNotes, setAllNotes] = useState([])
    const [showAddNote, setShowAddNote] = useState(false)
    const [noteSearch, setNoteSearch] = useState('')
    const [isSavingGroup, setSavingGroup] = useState(false)
    const [feedbackStats, setFeedbackStats] = useState(null)
    const [submittingFeedbackIds, setSubmittingFeedbackIds] = useState(new Set())
    const download = async () => {
        setLoading(true)
        try {
            const {data} = await knowledgeApi.getAll()
            setItems(data.data || [])
        } catch {
        }
        setLoading(false)
    }

    const loadNote = async () => {
        try {
            const {data} = await noteApi.getAll({
                page: 0,
                size: 100,
            })

            setAllNotes(data.data?.content || [])
        } catch (error) {
            console.error(error)
        }
    }
    const loadFeedbackStats = async () => {
        try {
            const { data } = await knowledgeApi.getFeedbackStats()
            setFeedbackStats(data.data)
        } catch {
            setFeedbackStats(null)
        }
    }
    useEffect(() => {
        download()
        loadNote()
        loadFeedbackStats()
    }, [])

    const selectGroup = async (id) => {
        setSelected(id)
        try {
            const {data} = await knowledgeApi.getById(id)
            setDetails(data.data)
        } catch {
        }
    }

    const create = async () => {
        if (!groupName.trim()) return
        try {
            await knowledgeApi.create({groupName: groupName, noteIds: []})
            toast.success('Đã tạo nhóm mới')
            setGroupName('');
            setShowForm(false)
            download()
        } catch {
            toast.error('Tạo thất bại')
        }
    }

    const remove = async (id) => {
        if (!window.confirm('Xoá nhóm này?')) return
        await knowledgeApi.remove(id)
        if (select === id) {
            setSelected(null);
            setDetails(null)
        }
        download()
        toast.success('Đã xoá nhóm')
    }

    const updateNoteIds = async (noteIds) => {
        if (!details) return

        setSavingGroup(true)

        try {
            const {data} = await knowledgeApi.update(details.id, {
                groupName: details.groupName,
                noteIds,
            })

            setDetails(data.data)
            setItems(p =>
                p.map(g =>
                    g.id === data.data.id
                        ? {...g, noteCount: data.data.notes?.length || 0}
                        : g
                )
            )

            toast.success('Đã cập nhật nhóm')
        } catch (error) {
            console.error(error)
            toast.error('Không thể cập nhật nhóm')
        } finally {
            setSavingGroup(false)
        }
    }

    const addNoteToGroup = async (note) => {
        if (!details) return

        const currentIds = details.notes?.map(n => n.id) || []

        if (currentIds.includes(note.id)) {
            toast.error('Ghi chú đã có trong nhóm')
            return
        }

        await updateNoteIds([...currentIds, note.id])
    }

    const removeNoteFromGroup = async (noteId) => {
        if (!details) return

        const currentIds = details.notes?.map(n => n.id) || []
        const nextIds = currentIds.filter(id => id !== noteId)

        await updateNoteIds(nextIds)
    }

    const reclassify = async () => {
        setClassifying(true)
        try {
            await knowledgeApi.reclassify()
            toast.success('AI đã phân loại lại toàn bộ ghi chú!')
            download()
        } catch {
            toast.error('AI không phản hồi')
        }
        setClassifying(false)
    }

    const submitClassificationFeedback = async (note, correct) => {
        if (!details || !note) return

        let correctedGroupName = details.groupName

        if (!correct) {
            const input = window.prompt(
                `AI đã phân loại "${note.title}" vào nhóm "${details.groupName}".\nNhập tên nhóm đúng:`,
                details.groupName
            )

            if (input === null) return

            correctedGroupName = input.trim()

            if (!correctedGroupName) {
                toast.error('Vui lòng nhập tên nhóm đúng')
                return
            }
        }

        setSubmittingFeedbackIds(prev => {
            const next = new Set(prev)
            next.add(note.id)
            return next
        })

        try {
            await knowledgeApi.submitClassificationFeedback({
                noteId: note.id,
                groupId: details.id,
                suggestedGroupName: details.groupName,
                correctedGroupName,
                correct,
                aiReasoning: details.aiReasoning,
                comment: correct
                    ? 'Người dùng xác nhận AI phân loại đúng'
                    : 'Người dùng sửa lại nhóm phân loại AI',
            })

            toast.success(correct
                ? 'Đã ghi nhận AI phân loại đúng'
                : 'Đã ghi nhận và chuyển ghi chú sang nhóm đúng'
            )

            await download()
            await loadFeedbackStats()

            if (select) {
                try {
                    const { data } = await knowledgeApi.getById(select)
                    setDetails(data.data)
                } catch {
                    setDetails(null)
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi đánh giá')
        } finally {
            setSubmittingFeedbackIds(prev => {
                const next = new Set(prev)
                next.delete(note.id)
                return next
            })
        }
    }

    const noteIdsInGroup = new Set(details?.notes?.map(n => n.id) || [])

    const availableNotes = allNotes.filter(note => {
        const matchSearch =
            !noteSearch.trim() ||
            note.title?.toLowerCase().includes(noteSearch.toLowerCase()) ||
            note.contentPreview?.toLowerCase().includes(noteSearch.toLowerCase())

        return matchSearch && !noteIdsInGroup.has(note.id)
    })
    return (
        <div style={styles.wrap}>

            <div style={styles.left}>
                <div style={styles.leftHeader}>
                    <span style={{fontSize: 12, fontWeight: 500}}>Nhóm kiến thức</span>
                    <button className="btn-ghost" onClick={() => setShowForm(p => !p)} style={{padding: 4}}
                            title="Tạo nhóm mới">
                        <IconPlus size={14}/>
                    </button>
                </div>

                {showForm && (
                    <div style={{padding: '8px 10px', borderBottom: '.5px solid var(--border)'}}>
                        <input placeholder="Tên nhóm..." value={groupName}
                               onChange={e => setGroupName(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && create()}
                               style={{fontSize: 12, marginBottom: 6}} autoFocus/>
                        <div style={{display: 'flex', gap: 5}}>
                            <button className="btn-primary" onClick={create}
                                    style={{flex: 1, justifyContent: 'center', fontSize: 11}}>Tạo
                            </button>
                            <button onClick={() => setShowForm(false)} style={{fontSize: 11}}>Huỷ</button>
                        </div>
                    </div>
                )}

                <button className="btn-ai" onClick={reclassify} disabled={isClassifying}
                        style={{margin: '8px 10px 4px', justifyContent: 'center', padding: '6px'}}>
                    {isClassifying ? <Spinner size={12}/> : <IconSparkles size={12}/>}
                    AI phân loại lại tất cả
                </button>

                <button className="btn-ghost" onClick={() => navigate('/knowledge/graph')}
                        style={{margin: '0 10px 8px', justifyContent: 'center', padding: '6px', fontSize: 11.5}}
                        title="Xem sơ đồ liên kết ngữ nghĩa giữa các ghi chú/tài liệu">
                    <IconBrain size={12}/>
                    Xem bản đồ tri thức
                </button>
                {feedbackStats && (
                    <div style={styles.feedbackStats}>
                        <div style={styles.feedbackStatsTitle}>
                            Độ chính xác AI
                        </div>

                        {feedbackStats.total === 0 ? (
                            <div style={styles.feedbackStatsText}>
                                Chưa có đánh giá
                            </div>
                        ) : (
                            <>
                                <div style={styles.feedbackStatsNumber}>
                                    {feedbackStats.accuracyPercent}%
                                </div>

                                <div style={styles.feedbackStatsText}>
                                    Đúng {feedbackStats.correct}/{feedbackStats.total} · Sai {feedbackStats.incorrect}
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div style={{flex: 1, overflowY: 'auto'}}>
                    {isLoading
                        ? <div style={{display: 'flex', justifyContent: 'center', padding: 20}}><Spinner/></div>
                        : items.length === 0
                            ? <EmptyState icon={IconSitemap} title="Chưa có nhóm nào"
                                          desc='Nhấn "AI phân loại lại" để bắt đầu'/>
                            : items.map(g => (
                                <div key={g.id} onClick={() => selectGroup(g.id)}
                                     style={{
                                         ...styles.groupRow,
                                         background: select === g.id ? 'var(--bg-selected)' : 'transparent'
                                     }}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontSize: 12, fontWeight: 500}}>{g.groupName}</div>
                                        <div style={{fontSize: 10, color: 'var(--text-faint)', marginTop: 2}}>
                                            {g.noteCount} ghi chú
                                            {g.suggestedByAi &&
                                                <span className="tag tag-blue" style={{fontSize: 9, marginLeft: 5}}>AI gợi ý</span>}
                                        </div>
                                    </div>
                                    <button className="btn-ghost" onClick={e => {
                                        e.stopPropagation();
                                        remove(g.id)
                                    }} style={{padding: 3}}>
                                        <IconTrash size={11}/>
                                    </button>
                                </div>
                            ))}
                </div>
            </div>

            <div style={styles.right}>
                {!select || !details
                    ? <EmptyState icon={IconSitemap} title="Chọn nhóm để xem ghi chú"
                                  desc="Mỗi nhóm chứa các ghi chú cùng chủ đề được AI phân loại tự động"/>
                    : (
                        <div style={{padding: 16}}>
                            <div style={styles.groupHeader}>
                                <IconSitemap size={18} style={{color: 'var(--accent-green)'}}/>

                                <div style={{flex: 1}}>
                                    <h2 style={{fontSize: 16, margin: 0}}>{details.groupName}</h2>

                                    {details.aiReasoning && (
                                        <p style={{fontSize: 11, color: 'var(--text-muted)', marginTop: 2}}>
                                            AI: {details.aiReasoning}
                                        </p>
                                    )}
                                </div>

                                {details.suggestedByAi && <span className="tag tag-blue">AI gợi ý</span>}

                                <button
                                    className="btn-primary"
                                    onClick={() => setShowAddNote(p => !p)}
                                    style={{fontSize: 12, padding: '6px 10px'}}
                                >
                                    <IconPlus size={13}/>
                                    Thêm ghi chú
                                </button>
                            </div>
                            {showAddNote && (
                                <div style={styles.addBox}>
                                    <div style={styles.searchBox}>
                                        <IconSearch
                                            size={13}
                                            style={{
                                                position: 'absolute',
                                                left: 9,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'var(--text-muted)',
                                            }}
                                        />

                                        <input
                                            value={noteSearch}
                                            onChange={e => setNoteSearch(e.target.value)}
                                            placeholder="Tìm ghi chú để thêm..."
                                            style={{paddingLeft: 28, fontSize: 12, height: 32}}
                                        />
                                    </div>

                                    <div style={styles.addList}>
                                        {availableNotes.length === 0 ? (
                                            <div style={{fontSize: 12, color: 'var(--text-muted)', padding: 8}}>
                                                Không còn ghi chú phù hợp để thêm
                                            </div>
                                        ) : (
                                            availableNotes.map(note => (
                                                <div key={note.id} style={styles.addNoteRow}>
                                                    <IconFileText size={13} style={{color: 'var(--text-muted)'}}/>

                                                    <div style={{flex: 1, overflow: 'hidden'}}>
                                                        <div style={styles.addNoteTitle}>{note.title}</div>
                                                        {note.contentPreview && (
                                                            <div
                                                                style={styles.addNotePreview}>{note.contentPreview}</div>
                                                        )}
                                                    </div>

                                                    <button
                                                        className="btn-ghost"
                                                        onClick={() => addNoteToGroup(note)}
                                                        disabled={isSavingGroup}
                                                        style={{padding: '4px 8px', fontSize: 11}}
                                                    >
                                                        <IconCheck size={12}/>
                                                        Thêm
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                            {details.notes?.length === 0
                                ? <EmptyState icon={IconFileText} title="Nhóm chưa có ghi chú"/>
                                : (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14}}>
                                        {details.notes.map(n => (
                                            <div key={n.id} style={styles.noteCard}>
                                                <IconFileText
                                                    size={13}
                                                    style={{
                                                        color: 'var(--text-muted)',
                                                        flexShrink: 0,
                                                        marginTop: 1,
                                                    }}
                                                />

                                                <div
                                                    style={{flex: 1, overflow: 'hidden', cursor: 'pointer'}}
                                                    onClick={() => navigate(`/notes/${n.id}`)}
                                                    title="Mở ghi chú"
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {n.title}
                                                    </div>

                                                    {n.contentPreview && (
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: 'var(--text-muted)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {n.contentPreview}
                                                        </div>
                                                    )}

                                                    <div style={{display: 'flex', gap: 4, marginTop: 4}}>
                                                        {n.tags?.map(t => (
                                                            <span key={t.id} className="tag tag-dim"
                                                                  style={{fontSize: 9}}>
            {t.name}
          </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn-ghost btn-danger"
                                                    onClick={() => removeNoteFromGroup(n.id)}
                                                    disabled={isSavingGroup}
                                                    style={{padding: 4, alignSelf: 'center'}}
                                                    title="Gỡ khỏi nhóm"
                                                >
                                                    <IconX size={12}/>
                                                </button>

                                                {details.suggestedByAi && (
                                                    <div style={styles.feedbackActions}>
                                                        <button
                                                            className="btn-ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                submitClassificationFeedback(n, true)
                                                            }}
                                                            disabled={submittingFeedbackIds.has(n.id)}
                                                            style={styles.feedbackOkButton}
                                                            title="AI phân loại đúng"
                                                        >
                                                            Đúng
                                                        </button>

                                                        <button
                                                            className="btn-ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                submitClassificationFeedback(n, false)
                                                            }}
                                                            disabled={submittingFeedbackIds.has(n.id)}
                                                            style={styles.feedbackWrongButton}
                                                            title="AI phân loại sai"
                                                        >
                                                            Sai
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                    )}
            </div>
        </div>
    )
}

const styles = {
    wrap: {display: 'flex', flex: 1, overflow: 'hidden'},
    left: {
        width: 240,
        flexShrink: 0,
        borderRight: '.5px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column'
    },
    leftHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: '.5px solid var(--border)'
    },
    right: {flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column'},
    groupRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        cursor: 'pointer',
        margin: '2px 4px',
        borderRadius: 6
    },
    groupHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 0',
        borderBottom: '.5px solid var(--border)',
        marginBottom: 4
    },
    noteCard: {
        display: 'flex',
        gap: 9,
        padding: '9px 12px',
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6
    },
    addBox: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        marginBottom: 12,
    },
    searchBox: {
        position: 'relative',
        marginBottom: 8,
    },
    addList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 260,
        overflowY: 'auto',
    },
    addNoteRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 6,
    },
    addNoteTitle: {
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    addNotePreview: {
        fontSize: 10,
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginTop: 2,
    },

    feedbackStats: {
        margin: '0 10px 8px',
        padding: '8px 10px',
        border: '.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
    },

    feedbackStatsTitle: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginBottom: 4,
    },

    feedbackStatsNumber: {
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--accent-green)',
        lineHeight: 1.1,
    },

    feedbackStatsText: {
        fontSize: 10,
        color: 'var(--text-muted)',
        marginTop: 3,
    },

    feedbackActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'center',
        flexShrink: 0,
    },

    feedbackOkButton: {
        padding: '3px 7px',
        fontSize: 10,
        color: 'var(--accent-green)',
    },

    feedbackWrongButton: {
        padding: '3px 7px',
        fontSize: 10,
        color: 'var(--accent-red)',
    },
}
