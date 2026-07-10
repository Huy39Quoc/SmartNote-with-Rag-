import { useEffect, useMemo, useState } from 'react'
import {
    IconFolderShare,
    IconSearch,
    IconEye,
    IconEdit,
    IconUser,
    IconClock,
    IconFile,
    IconFileText,
    IconFileMusic,
    IconX,
} from '@tabler/icons-react'
import documentApi from '../../lib/api/documentApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatNgay = (value) => {
    if (!value) return ''
    try {
        return new Date(value).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    } catch { return '' }
}

const fileIconOf = (type) => {
    if (type === 'AUDIO') return IconFileMusic
    if (type === 'TXT') return IconFileText
    return IconFile
}

const permissionInfo = (permission) => {
    if (permission === 'EDIT')
        return { label: 'Có thể chỉnh sửa', icon: IconEdit, className: 'tag-blue' }
    return { label: 'Chỉ xem', icon: IconEye, className: 'tag-dim' }
}

export default function SharedDocuments() {
    const [danhSach, setDanhSach] = useState([])
    const [dangTai, setDangTai] = useState(true)
    const [tuKhoa, setTuKhoa] = useState('')
    const [chiTietMo, setChiTietMo] = useState(null)
    const [chiTietDuLieu, setChiTietDuLieu] = useState(null)
    const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false)
    const [dangMoFile, setDangMoFile] = useState(false)

    const taiDuLieu = async () => {
        setDangTai(true)
        try {
            const { data } = await documentApi.layTaiLieuDuocChiaSe()
            setDanhSach(data.data || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách tài liệu được chia sẻ')
        } finally {
            setDangTai(false)
        }
    }

    useEffect(() => { taiDuLieu() }, [])

    const danhSachLoc = useMemo(() => {
        const keyword = tuKhoa.trim().toLowerCase()
        if (!keyword) return danhSach
        return danhSach.filter(item => {
            const name = item.documentName?.toLowerCase() || ''
            const ownerEmail = item.ownerEmail?.toLowerCase() || ''
            const ownerName = item.ownerFullName?.toLowerCase() || ''
            return name.includes(keyword) || ownerEmail.includes(keyword) || ownerName.includes(keyword)
        })
    }, [danhSach, tuKhoa])

    const moChiTiet = async (item) => {
        setChiTietMo(item)
        setChiTietDuLieu(null)
        setDangTaiChiTiet(true)
        try {
            const { data } = await documentApi.layTheoId(item.documentId)
            setChiTietDuLieu(data.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải chi tiết tài liệu')
            setChiTietMo(null)
        } finally {
            setDangTaiChiTiet(false)
        }
    }

    const dongChiTiet = () => { setChiTietMo(null); setChiTietDuLieu(null) }

    const xemFileGoc = async (documentId, fallbackName) => {
        setDangMoFile(true)
        try {
            const { data } = await documentApi.layFile(documentId)
            const url = URL.createObjectURL(data)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch (error) {
            toast.error(error.response?.data?.message || `Không thể mở file${fallbackName ? ` "${fallbackName}"` : ''}`)
        } finally {
            setDangMoFile(false)
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.inner}>
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>
                            <IconFolderShare size={20} />
                            Tài liệu được chia sẻ với tôi
                        </h2>
                        <p style={styles.subtitle}>
                            Những tài liệu người khác đã chia sẻ cho bạn. Nhấn vào để xem tóm tắt và nội dung.
                        </p>
                    </div>
                    <button className="btn-ghost" onClick={taiDuLieu} style={{ fontSize: 12 }}>
                        Làm mới
                    </button>
                </div>

                <div style={styles.searchBox}>
                    <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        value={tuKhoa}
                        onChange={e => setTuKhoa(e.target.value)}
                        placeholder="Tìm theo tên tài liệu, email hoặc tên người chia sẻ..."
                        style={styles.searchInput}
                    />
                </div>

                {dangTai ? (
                    <div style={styles.loadingBox}><Spinner size={24} /></div>
                ) : danhSachLoc.length === 0 ? (
                    <div style={styles.emptyBox}>
                        <EmptyState
                            icon={IconFolderShare}
                            title="Chưa có tài liệu được chia sẻ"
                            desc="Khi người khác chia sẻ tài liệu cho bạn, danh sách sẽ hiển thị ở đây."
                        />
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {danhSachLoc.map(item => {
                            const info = permissionInfo(item.permission)
                            const PermissionIcon = info.icon
                            const FileIcon = fileIconOf(item.documentFileType)
                            return (
                                <div key={item.id} style={styles.card} onClick={() => moChiTiet(item)}>
                                    <div style={styles.cardTop}>
                                        <div style={styles.docIcon}><FileIcon size={17} /></div>
                                        <span className={`tag ${info.className}`} style={styles.permissionTag}>
                                            <PermissionIcon size={11} />{info.label}
                                        </span>
                                    </div>

                                    <div style={styles.docTitle}>
                                        {item.documentName || 'Tài liệu không có tên'}
                                    </div>

                                    <div style={styles.ownerBox}>
                                        <div style={styles.ownerAvatar}>
                                            {item.ownerFullName?.[0]?.toUpperCase() || item.ownerEmail?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={styles.ownerName}>{item.ownerFullName || 'Người dùng'}</div>
                                            <div style={styles.ownerEmail}>{item.ownerEmail}</div>
                                        </div>
                                    </div>

                                    <div style={styles.metaRow}>
                                        <span style={styles.metaItem}><IconUser size={12} />{formatBytes(item.fileSize)}</span>
                                        <span style={styles.metaItem}><IconClock size={12} />{formatNgay(item.createdAt)}</span>
                                    </div>

                                    <button
                                        className="btn-primary"
                                        style={styles.openBtn}
                                        onClick={e => { e.stopPropagation(); moChiTiet(item) }}
                                    >
                                        Xem tài liệu
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {chiTietMo && (
                <div style={styles.modalOverlay} onClick={dongChiTiet}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <span style={styles.modalTitle}>{chiTietMo.documentName || 'Tài liệu'}</span>
                            <button className="btn-icon" onClick={dongChiTiet}><IconX size={18} /></button>
                        </div>

                        {dangTaiChiTiet ? (
                            <div style={styles.loadingBox}><Spinner size={22} /></div>
                        ) : chiTietDuLieu ? (
                            <div style={styles.modalBody}>
                                <div style={styles.modalMetaGrid}>
                                    <div>
                                        <div style={styles.metaLabel}>Loại file</div>
                                        <div style={styles.metaValue}>{chiTietDuLieu.fileType}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Kích thước</div>
                                        <div style={styles.metaValue}>{formatBytes(chiTietDuLieu.fileSize)}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Trạng thái</div>
                                        <div style={styles.metaValue}>{chiTietDuLieu.status}</div>
                                    </div>
                                    <div>
                                        <div style={styles.metaLabel}>Ngày tải lên</div>
                                        <div style={styles.metaValue}>{formatNgay(chiTietDuLieu.uploadedAt)}</div>
                                    </div>
                                </div>

                                <div style={styles.section}>
                                    <button
                                        className="btn-primary"
                                        onClick={() => xemFileGoc(chiTietDuLieu.id, chiTietMo.documentName)}
                                        disabled={dangMoFile}
                                        style={{ justifyContent: 'center', width: '100%' }}
                                    >
                                        {dangMoFile ? 'Đang mở file...' : 'Xem / tải file gốc'}
                                    </button>
                                </div>

                                {chiTietDuLieu.aiSummary && (
                                    <div style={styles.section}>
                                        <div style={styles.sectionTitle}>Tóm tắt AI</div>
                                        <div style={styles.sectionText}>{chiTietDuLieu.aiSummary}</div>
                                    </div>
                                )}

                                {chiTietDuLieu.audioTranscript && (
                                    <div style={styles.section}>
                                        <div style={styles.sectionTitle}>Transcript âm thanh</div>
                                        <div style={styles.sectionText}>{chiTietDuLieu.audioTranscript}</div>
                                    </div>
                                )}

                                {!chiTietDuLieu.aiSummary && !chiTietDuLieu.audioTranscript && (
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
