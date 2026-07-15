import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    IconShare,
    IconSearch,
    IconEye,
    IconEdit,
    IconUser,
    IconClock,
    IconFileText,
} from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function SharedNotes() {
    const navigate = useNavigate()

    const [items, setItems] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [keyword, setKeyword] = useState('')

    const loadData = async () => {
        setLoading(true)

        try {
            const { data } = await noteApi.getSharedNotes()
            setItems(data.data || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách ghi chú được chia sẻ')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredItems = useMemo(() => {
        const keyword = keyword.trim().toLowerCase()

        if (!keyword) return items

        return items.filter(item => {
            const title = item.noteTitle?.toLowerCase() || ''
            const ownerEmail = item.ownerEmail?.toLowerCase() || ''
            const ownerName = item.ownerFullName?.toLowerCase() || ''

            return title.includes(keyword)
                || ownerEmail.includes(keyword)
                || ownerName.includes(keyword)
        })
    }, [items, keyword])

    const openNote = (noteId) => {
        if (!noteId) {
            toast.error('Không tìm thấy ghi chú')
            return
        }

        navigate(`/notes/${noteId}`)
    }

    const formatDate = (value) => {
        if (!value) return ''

        try {
            return new Date(value).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return ''
        }
    }

    const permissionInfo = (permission) => {
        if (permission === 'EDIT') {
            return {
                label: 'Có thể chỉnh sửa',
                icon: IconEdit,
                className: 'tag-blue',
            }
        }

        return {
            label: 'Chỉ xem',
            icon: IconEye,
            className: 'tag-dim',
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.inner}>
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>
                            <IconShare size={20} />
                            Ghi chú được chia sẻ với tôi
                        </h2>

                        <p style={styles.subtitle}>
                            Những ghi chú người khác đã chia sẻ cho bạn. Bạn có thể mở để xem hoặc chỉnh sửa nếu được cấp quyền.
                        </p>
                    </div>

                    <button
                        className="btn-ghost"
                        onClick={loadData}
                        style={{ fontSize: 12 }}
                    >
                        Làm mới
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <IconSearch
                        size={14}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                        }}
                    />

                    <input
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="Tìm theo tiêu đề, email hoặc tên người chia sẻ..."
                        style={styles.searchInput}
                    />
                </div>

                {isLoading ? (
                    <div style={styles.loadingBox}>
                        <Spinner size={24} />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div style={styles.emptyBox}>
                        <EmptyState
                            icon={IconShare}
                            title="Chưa có ghi chú được chia sẻ"
                            desc="Khi người khác chia sẻ ghi chú cho bạn, danh sách sẽ hiển thị ở đây."
                        />
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {filteredItems.map(item => {
                            const info = permissionInfo(item.permission)
                            const PermissionIcon = info.icon

                            return (
                                <div
                                    key={item.id}
                                    style={styles.card}
                                    onClick={() => openNote(item.noteId)}
                                >
                                    <div style={styles.cardTop}>
                                        <div style={styles.noteIcon}>
                                            <IconFileText size={17} />
                                        </div>

                                        <span className={`tag ${info.className}`} style={styles.permissionTag}>
                                            <PermissionIcon size={11} />
                                            {info.label}
                                        </span>
                                    </div>

                                    <div style={styles.noteTitle}>
                                        {item.noteTitle || 'Ghi chú không có tiêu đề'}
                                    </div>

                                    <div style={styles.ownerBox}>
                                        <div style={styles.ownerAvatar}>
                                            {item.ownerFullName?.[0]?.toUpperCase()
                                                || item.ownerEmail?.[0]?.toUpperCase()
                                                || 'U'}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={styles.ownerName}>
                                                {item.ownerFullName || 'Người dùng'}
                                            </div>

                                            <div style={styles.ownerEmail}>
                                                {item.ownerEmail}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={styles.metaRow}>
                                        <span style={styles.metaItem}>
                                            <IconUser size={12} />
                                            Người chia sẻ
                                        </span>

                                        <span style={styles.metaItem}>
                                            <IconClock size={12} />
                                            {formatDate(item.createdAt)}
                                        </span>
                                    </div>

                                    <button
                                        className="btn-primary"
                                        style={styles.openBtn}
                                        onClick={e => {
                                            e.stopPropagation()
                                            openNote(item.noteId)
                                        }}
                                    >
                                        Mở ghi chú
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    page: {
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 24,
        boxSizing: 'border-box',
    },
    inner: {
        maxWidth: 1100,
        margin: '0 auto',
        paddingBottom: 48,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 18,
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
    },
    subtitle: {
        color: 'var(--text-muted)',
        fontSize: 13,
        marginTop: 6,
        lineHeight: 1.5,
        maxWidth: 620,
    },
    searchBox: {
        position: 'relative',
        marginBottom: 18,
    },
    searchInput: {
        width: '100%',
        height: 38,
        paddingLeft: 34,
        fontSize: 13,
        boxSizing: 'border-box',
    },
    loadingBox: {
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        minHeight: 260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
    },
    card: {
        background: 'var(--bg-surface)',
        border: '.5px solid var(--border)',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'transform .12s, border-color .12s',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    noteIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionTag: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        whiteSpace: 'nowrap',
    },
    noteTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
        lineHeight: 1.4,
        minHeight: 42,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    ownerBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        background: 'var(--bg-elevated)',
        border: '.5px solid var(--border)',
        borderRadius: 8,
    },
    ownerAvatar: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
    },
    ownerName: {
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    ownerEmail: {
        fontSize: 11,
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginTop: 2,
    },
    metaRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 11,
        color: 'var(--text-muted)',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
    },
    openBtn: {
        width: '100%',
        justifyContent: 'center',
        fontSize: 12,
        padding: '7px 10px',
    },
}