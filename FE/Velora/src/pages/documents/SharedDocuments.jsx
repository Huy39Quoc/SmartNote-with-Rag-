import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    IconFolderShare,
    IconUser,
    IconClock,
    IconFile,
    IconFileText,
    IconFileMusic,
    IconX,
} from '@tabler/icons-react'
import documentApi from '../../lib/api/documentApi'
import Spinner from '../../components/ui/Spinner'
import PageHeader from '../../components/ui/PageHeader'
import SearchField from '../../components/ui/SearchField'
import AsyncContent from '../../components/ui/AsyncContent'
import PermissionBadge from '../../components/ui/PermissionBadge'
import OwnerSummary from '../../components/ui/OwnerSummary'
import { formatFileSize, formatLocalDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

const fileIconOf = (type) => {
    if (type === 'AUDIO') return IconFileMusic
    if (type === 'TXT') return IconFileText
    return IconFile
}

export default function SharedDocuments() {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [keyword, setKeyword] = useState('')
    const [isDetailOpen, setDetailOpen] = useState(null)
    const [detailData, setDetailData] = useState(null)
    const [isLoadingDetails, setLoadingDetails] = useState(false)
    const [isOpeningFile, setOpeningFile] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const { data } = await documentApi.getSharedDocuments()
            setItems(data.data || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách tài liệu được chia sẻ')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const filteredItems = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase()
        if (!normalizedKeyword) return items
        return items.filter(item => {
            const name = item.documentName?.toLowerCase() || ''
            const ownerEmail = item.ownerEmail?.toLowerCase() || ''
            const ownerName = item.ownerFullName?.toLowerCase() || ''
            return name.includes(normalizedKeyword) || ownerEmail.includes(normalizedKeyword) || ownerName.includes(normalizedKeyword)
        })
    }, [items, keyword])

    const openDetails = async (item) => {
        setDetailOpen(item)
        setDetailData(null)
        setLoadingDetails(true)
        try {
            const { data } = await documentApi.getById(item.documentId)
            setDetailData(data.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải chi tiết tài liệu')
            setDetailOpen(null)
        } finally {
            setLoadingDetails(false)
        }
    }

    const closeDetails = () => { setDetailOpen(null); setDetailData(null) }

    const viewOriginalFile = async (documentId, fallbackName) => {
        setOpeningFile(true)
        try {
            const { data } = await documentApi.getFile(documentId)
            const url = URL.createObjectURL(data)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch (error) {
            toast.error(error.response?.data?.message || `Không thể mở file${fallbackName ? ` "${fallbackName}"` : ''}`)
        } finally {
            setOpeningFile(false)
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.inner}>
                <PageHeader
                    icon={IconFolderShare}
                    title="Tài liệu được chia sẻ với tôi"
                    description="Những tài liệu người khác đã chia sẻ cho bạn. Nhấn vào để xem tóm tắt và nội dung."
                    action={<button className="btn-ghost" onClick={loadData} style={{ fontSize: 12 }}>Làm mới</button>}
                />

                <SearchField
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="Tìm theo tên tài liệu, email hoặc tên người chia sẻ..."
                />

                <AsyncContent
                    loading={isLoading}
                    empty={filteredItems.length === 0}
                    emptyState={{
                        icon: IconFolderShare,
                        title: 'Chưa có tài liệu được chia sẻ',
                        desc: 'Khi người khác chia sẻ tài liệu cho bạn, danh sách sẽ hiển thị ở đây.',
                    }}
                >
                    <div style={styles.grid}>
                        {filteredItems.map(item => {
                            const FileIcon = fileIconOf(item.documentFileType)
                            return (
                                <div key={item.id} style={styles.card} onClick={() => openDetails(item)}>
                                    <div style={styles.cardTop}>
                                        <div style={styles.docIcon}><FileIcon size={17} /></div>
                                        <PermissionBadge permission={item.permission} />
                                    </div>

                                    <div style={styles.docTitle}>
                                        {item.documentName || 'Tài liệu không có tên'}
                                    </div>

                                    <OwnerSummary name={item.ownerFullName} email={item.ownerEmail} />

                                    <div style={styles.metaRow}>
                                        <span style={styles.metaItem}><IconUser size={12} />{formatFileSize(item.fileSize)}</span>
                                        <span style={styles.metaItem}><IconClock size={12} />{formatLocalDate(item.createdAt)}</span>
                                    </div>

                                    <button
                                        className="btn-primary"
                                        style={styles.openBtn}
                                        onClick={e => { e.stopPropagation(); navigate(`/documents?documentId=${item.documentId}`) }}
                                    >
                                        Xem tài liệu
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </AsyncContent>
            </div>

            {isDetailOpen && (
                <div style={styles.modalOverlay} onClick={closeDetails}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <span style={styles.modalTitle}>{isDetailOpen.documentName || 'Tài liệu'}</span>
                            <button className="btn-icon" onClick={closeDetails}><IconX size={18} /></button>
                        </div>

                        {isLoadingDetails ? (
                            <div style={styles.loadingBox}><Spinner size={22} /></div>
                        ) : detailData ? (
                            <div style={styles.modalBody}>
                                <div style={styles.modalMetaGrid}>
                                    <div>
                                        <div style={styles.metaLabel}>Loại file</div>
                                        <div style={styles.metaValue}>{detailData.fileType}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Kích thước</div>
                                        <div style={styles.metaValue}>{formatFileSize(detailData.fileSize)}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Trạng thái</div>
                                        <div style={styles.metaValue}>{detailData.status}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Ngày tải lên</div>
                                        <div style={styles.metaValue}>{formatLocalDate(detailData.uploadedAt)}</div>
                                    </div>
                                </div>

                                <div style={styles.section}>
                                    <button
                                        className="btn-primary"
                                        onClick={() => viewOriginalFile(detailData.id, isDetailOpen.documentName)}
                                        disabled={isOpeningFile}
                                        style={{ justifyContent: 'center', width: '100%' }}
                                    >
                                        {isOpeningFile ? 'Đang mở file...' : 'Xem / tải file gốc'}
                                    </button>
                                </div>

                                {detailData.aiSummary && (
                                    <div style={styles.section}>
                                        <div style={styles.sectionTitle}>Tóm tắt AI</div>
                                        <div style={styles.sectionText}>{detailData.aiSummary}</div>
                                    </div>
                                )}

                                {detailData.audioTranscript && (
                                    <div style={styles.section}>
                                        <div style={styles.sectionTitle}>Transcript âm thanh</div>
                                        <div style={styles.sectionText}>{detailData.audioTranscript}</div>
                                    </div>
                                )}

                                {!detailData.aiSummary && !detailData.audioTranscript && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                        Tài liệu này chưa có tóm tắt hoặc transcript AI — nhưng bạn vẫn có thể xem file gốc ở trên.
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    page: { width: '100%', height: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 24, boxSizing: 'border-box' },
    inner: { maxWidth: 1100, margin: '0 auto', paddingBottom: 48 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
    title: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
    subtitle: { color: 'var(--text-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5, maxWidth: 640 },
    searchBox: { position: 'relative', marginBottom: 18 },
    searchInput: { width: '100%', height: 38, paddingLeft: 34, fontSize: 13, boxSizing: 'border-box' },
    loadingBox: { minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    emptyBox: { minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 12 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
    card: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform .12s, border-color .12s' },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    docIcon: { width: 34, height: 34, borderRadius: 10, background: 'var(--bg-ai)', color: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    permissionTag: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, whiteSpace: 'nowrap' },
    docTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, minHeight: 42, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    ownerBox: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 8 },
    ownerAvatar: { width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-ai)', color: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
    ownerName: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    ownerEmail: { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 },
    metaRow: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted)' },
    metaItem: { display: 'flex', alignItems: 'center', gap: 5 },
    openBtn: { width: '100%', justifyContent: 'center', fontSize: 12, padding: '7px 10px' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
    modal: { width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 14, boxSizing: 'border-box' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '.5px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-surface)', gap: 8 },
    modalTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    modalBody: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
    modalMetaGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
    metaLabel: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 },
    metaValue: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
    section: { background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 10, padding: 12 },
    sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
    sectionText: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
}
