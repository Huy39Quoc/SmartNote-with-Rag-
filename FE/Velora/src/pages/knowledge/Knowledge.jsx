import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
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
    const [danhSach, setDanhSach] = useState([])
    const [chon, setChon] = useState(null)
    const [chiTiet, setChiTiet] = useState(null)
    const [dangTai, setDangTai] = useState(true)
    const [dangPhanLoai, setDangPhanLoai] = useState(false)
    const [hienForm, setHienForm] = useState(false)
    const [tenNhom, setTenNhom] = useState('')
    const navigate = useNavigate()
    const [tatCaGhiChu, setTatCaGhiChu] = useState([])
    const [hienThemGhiChu, setHienThemGhiChu] = useState(false)
    const [timGhiChu, setTimGhiChu] = useState('')
    const [dangLuuNhom, setDangLuuNhom] = useState(false)
    const [feedbackStats, setFeedbackStats] = useState(null)
    const [dangGuiFeedbackIds, setDangGuiFeedbackIds] = useState(new Set())
    const tai = async () => {
        setDangTai(true)
        try {
            const {data} = await knowledgeApi.layTatCa()
            setDanhSach(data.data || [])
        } catch {
        }
        setDangTai(false)
    }

    const taiGhiChu = async () => {
        try {
            const {data} = await noteApi.layTatCa({
                page: 0,
                size: 100,
            })

            setTatCaGhiChu(data.data?.content || [])
        } catch (error) {
            console.error(error)
        }
    }
    const taiThongKeFeedback = async () => {
        try {
            const { data } = await knowledgeApi.layThongKeFeedback()
            setFeedbackStats(data.data)
        } catch {
            setFeedbackStats(null)
        }
    }
    useEffect(() => {
        tai()
        taiGhiChu()
        taiThongKeFeedback()
    }, [])

    const chonNhom = async (id) => {
        setChon(id)
        try {
            const {data} = await knowledgeApi.layTheoId(id)
            setChiTiet(data.data)
        } catch {
        }
    }

    const taoMoi = async () => {
        if (!tenNhom.trim()) return
        try {
            await knowledgeApi.taoMoi({groupName: tenNhom, noteIds: []})
            toast.success('Đã tạo nhóm mới')
            setTenNhom('');
            setHienForm(false)
            tai()
        } catch {
            toast.error('Tạo thất bại')
        }
    }

    const xoa = async (id) => {
        if (!window.confirm('Xoá nhóm này?')) return
        await knowledgeApi.xoa(id)
        if (chon === id) {
            setChon(null);
            setChiTiet(null)
        }
        tai()
        toast.success('Đã xoá nhóm')
    }

    const capNhatNoteIds = async (noteIds) => {
        if (!chiTiet) return

        setDangLuuNhom(true)

        try {
            const {data} = await knowledgeApi.capNhat(chiTiet.id, {
                groupName: chiTiet.groupName,
                noteIds,
            })

            setChiTiet(data.data)
            setDanhSach(p =>
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
            setDangLuuNhom(false)
        }
    }

    const themGhiChuVaoNhom = async (note) => {
        if (!chiTiet) return

        const currentIds = chiTiet.notes?.map(n => n.id) || []

        if (currentIds.includes(note.id)) {
            toast.error('Ghi chú đã có trong nhóm')
            return
        }

        await capNhatNoteIds([...currentIds, note.id])
    }

    const goGhiChuKhoiNhom = async (noteId) => {
        if (!chiTiet) return

        const currentIds = chiTiet.notes?.map(n => n.id) || []
        const nextIds = currentIds.filter(id => id !== noteId)

        await capNhatNoteIds(nextIds)
    }

    const phanLoaiLai = async () => {
        setDangPhanLoai(true)
        try {
            await knowledgeApi.phanLoaiLai()
            toast.success('AI đã phân loại lại toàn bộ ghi chú!')
            tai()
        } catch {
            toast.error('AI không phản hồi')
        }
        setDangPhanLoai(false)
    }

    const guiFeedbackPhanLoai = async (note, correct) => {
        if (!chiTiet || !note) return

        let correctedGroupName = chiTiet.groupName

        if (!correct) {
            const input = window.prompt(
                `AI đã phân loại "${note.title}" vào nhóm "${chiTiet.groupName}".\nNhập tên nhóm đúng:`,
                chiTiet.groupName
            )

            if (input === null) return

            correctedGroupName = input.trim()

            if (!correctedGroupName) {
                toast.error('Vui lòng nhập tên nhóm đúng')
                return
            }
        }

        setDangGuiFeedbackIds(prev => {
            const next = new Set(prev)
            next.add(note.id)
            return next
        })

        try {
            await knowledgeApi.guiFeedbackPhanLoai({
                noteId: note.id,
                groupId: chiTiet.id,
                suggestedGroupName: chiTiet.groupName,
                correctedGroupName,
                correct,
                aiReasoning: chiTiet.aiReasoning,
                comment: correct
                    ? 'Người dùng xác nhận AI phân loại đúng'
                    : 'Người dùng sửa lại nhóm phân loại AI',
            })

            toast.success(correct
                ? 'Đã ghi nhận AI phân loại đúng'
                : 'Đã ghi nhận và chuyển ghi chú sang nhóm đúng'
            )

            await tai()
            await taiThongKeFeedback()

            if (chon) {
                try {
                    const { data } = await knowledgeApi.layTheoId(chon)
                    setChiTiet(data.data)
                } catch {
                    setChiTiet(null)
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi đánh giá')
        } finally {
            setDangGuiFeedbackIds(prev => {
                const next = new Set(prev)
                next.delete(note.id)
                return next
            })
        }
    }

    const noteIdsTrongNhom = new Set(chiTiet?.notes?.map(n => n.id) || [])

    const ghiChuCoTheThem = tatCaGhiChu.filter(note => {
        const matchSearch =
            !timGhiChu.trim() ||
            note.title?.toLowerCase().includes(timGhiChu.toLowerCase()) ||
            note.contentPreview?.toLowerCase().includes(timGhiChu.toLowerCase())

        return matchSearch && !noteIdsTrongNhom.has(note.id)
    })
    return (
        <div style={styles.wrap}>
            {/* Trái: danh sách nhóm */}
            <div style={styles.left}>
                <div style={styles.leftHeader}>
                    <span style={{fontSize: 12, fontWeight: 500}}>Nhóm kiến thức</span>
                    <button className="btn-ghost" onClick={() => setHienForm(p => !p)} style={{padding: 4}}
                            title="Tạo nhóm mới">
                        <IconPlus size={14}/>
                    </button>
                </div>

                {hienForm && (
                    <div style={{padding: '8px 10px', borderBottom: '.5px solid var(--border)'}}>
                        <input placeholder="Tên nhóm..." value={tenNhom}
                               onChange={e => setTenNhom(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && taoMoi()}
                               style={{fontSize: 12, marginBottom: 6}} autoFocus/>
                        <div style={{display: 'flex', gap: 5}}>
                            <button className="btn-primary" onClick={taoMoi}
                                    style={{flex: 1, justifyContent: 'center', fontSize: 11}}>Tạo
                            </button>
                            <button onClick={() => setHienForm(false)} style={{fontSize: 11}}>Huỷ</button>
                        </div>
                    </div>
                )}

                <button className="btn-ai" onClick={phanLoaiLai} disabled={dangPhanLoai}
                        style={{margin: '8px 10px', justifyContent: 'center', padding: '6px'}}>
                    {dangPhanLoai ? <Spinner size={12}/> : <IconSparkles size={12}/>}
                    AI phân loại lại tất cả
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
                    {dangTai
                        ? <div style={{display: 'flex', justifyContent: 'center', padding: 20}}><Spinner/></div>
                        : danhSach.length === 0
                            ? <EmptyState icon={IconSitemap} title="Chưa có nhóm nào"
                                          desc='Nhấn "AI phân loại lại" để bắt đầu'/>
                            : danhSach.map(g => (
                                <div key={g.id} onClick={() => chonNhom(g.id)}
                                     style={{
                                         ...styles.groupRow,
                                         background: chon === g.id ? 'var(--bg-selected)' : 'transparent'
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
                                        xoa(g.id)
                                    }} style={{padding: 3}}>
                                        <IconTrash size={11}/>
                                    </button>
                                </div>
                            ))}
                </div>
            </div>

            {/* Phải: ghi chú trong nhóm */}
            <div style={styles.right}>
                {!chon || !chiTiet
                    ? <EmptyState icon={IconSitemap} title="Chọn nhóm để xem ghi chú"
                                  desc="Mỗi nhóm chứa các ghi chú cùng chủ đề được AI phân loại tự động"/>
                    : (
                        <div style={{padding: 16}}>
                            <div style={styles.groupHeader}>
                                <IconSitemap size={18} style={{color: 'var(--accent-green)'}}/>

                                <div style={{flex: 1}}>
                                    <h2 style={{fontSize: 16, margin: 0}}>{chiTiet.groupName}</h2>

                                    {chiTiet.aiReasoning && (
                                        <p style={{fontSize: 11, color: 'var(--text-muted)', marginTop: 2}}>
                                            AI: {chiTiet.aiReasoning}
                                        </p>
                                    )}
                                </div>

                                {chiTiet.suggestedByAi && <span className="tag tag-blue">AI gợi ý</span>}

                                <button
                                    className="btn-primary"
                                    onClick={() => setHienThemGhiChu(p => !p)}
                                    style={{fontSize: 12, padding: '6px 10px'}}
                                >
                                    <IconPlus size={13}/>
                                    Thêm ghi chú
                                </button>
                            </div>
                            {hienThemGhiChu && (
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
                                            value={timGhiChu}
                                            onChange={e => setTimGhiChu(e.target.value)}
                                            placeholder="Tìm ghi chú để thêm..."
                                            style={{paddingLeft: 28, fontSize: 12, height: 32}}
                                        />
                                    </div>

                                    <div style={styles.addList}>
                                        {ghiChuCoTheThem.length === 0 ? (
                                            <div style={{fontSize: 12, color: 'var(--text-muted)', padding: 8}}>
                                                Không còn ghi chú phù hợp để thêm
                                            </div>
                                        ) : (
                                            ghiChuCoTheThem.map(note => (
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
                                                        onClick={() => themGhiChuVaoNhom(note)}
                                                        disabled={dangLuuNhom}
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
                            {chiTiet.notes?.length === 0
                                ? <EmptyState icon={IconFileText} title="Nhóm chưa có ghi chú"/>
                                : (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14}}>
                                        {chiTiet.notes.map(n => (
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
                                                    onClick={() => goGhiChuKhoiNhom(n.id)}
                                                    disabled={dangLuuNhom}
                                                    style={{padding: 4, alignSelf: 'center'}}
                                                    title="Gỡ khỏi nhóm"
                                                >
                                                    <IconX size={12}/>
                                                </button>

                                                {chiTiet.suggestedByAi && (
                                                    <div style={styles.feedbackActions}>
                                                        <button
                                                            className="btn-ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                guiFeedbackPhanLoai(n, true)
                                                            }}
                                                            disabled={dangGuiFeedbackIds.has(n.id)}
                                                            style={styles.feedbackOkButton}
                                                            title="AI phân loại đúng"
                                                        >
                                                            Đúng
                                                        </button>

                                                        <button
                                                            className="btn-ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                guiFeedbackPhanLoai(n, false)
                                                            }}
                                                            disabled={dangGuiFeedbackIds.has(n.id)}
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
