import { useEffect, useState } from 'react'
import {
  IconFileText, IconMusic, IconTrash, IconSearch,
  IconSparkles, IconMessages, IconLoader2, IconFile
} from '@tabler/icons-react'
import documentApi from '../../lib/api/documentApi'
import UploadZone from '../../components/documents/UploadZone'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const TRANG_THAI = {
  PENDING:    { nhan: 'Chờ xử lý', mau: 'var(--text-muted)' },
  PROCESSING: { nhan: 'Đang xử lý', mau: 'var(--accent-amber)' },
  DONE:       { nhan: 'Hoàn tất', mau: 'var(--accent-green)' },
  FAILED:     { nhan: 'Lỗi', mau: 'var(--accent-red)' },
}

export default function TaiLieu() {
  const [danhSach, setDanhSach] = useState([])
  const [chon, setChon] = useState(null)
  const [dangTai, setDangTai] = useState(true)
  const [dangTaiLen, setDangTaiLen] = useState(false)
  const [ketQuaAi, setKetQuaAi] = useState(null)
  const [dangXuLyAi, setDangXuLyAi] = useState(false)
  const [cauHoi, setCauHoi] = useState('')
  const [phanHoiChat, setPhanHoiChat] = useState(null)

  const tai = async () => {
    setDangTai(true)
    try {
      const { data } = await documentApi.layTatCa({ page: 0, size: 30 })
      setDanhSach(data.data?.content || [])
    } catch {}
    setDangTai(false)
  }

  useEffect(() => { tai() }, [])

  // Poll status cho PROCESSING docs
  useEffect(() => {
    const xuLy = danhSach.filter(d => d.status === 'PROCESSING' || d.status === 'PENDING')
    if (xuLy.length === 0) return
    const id = setInterval(async () => {
      for (const d of xuLy) {
        const { data } = await documentApi.layTheoId(d.id)
        setDanhSach(p => p.map(x => x.id === d.id ? data.data : x))
        if (chon?.id === d.id) setChon(data.data)
      }
    }, 3000)
    return () => clearInterval(id)
  }, [danhSach])

  const taiLen = async (file) => {
    setDangTaiLen(true)
    try {
      const { data } = await documentApi.taiLen(file, null)
      setDanhSach(p => [data.data, ...p])
      toast.success(`Đã tải lên "${file.name}"`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tải lên thất bại')
    }
    setDangTaiLen(false)
  }

  const phanTich = async () => {
    if (!chon || chon.status !== 'DONE') return
    setDangXuLyAi(true); setKetQuaAi(null)
    try {
      const { data } = await documentApi.phanTich(chon.id)
      setKetQuaAi(data.data)
    } catch { toast.error('AI không phản hồi') }
    setDangXuLyAi(false)
  }

  const phanTichAmThanh = async () => {
    if (!chon || chon.status !== 'DONE') return
    setDangXuLyAi(true); setKetQuaAi(null)
    try {
      const { data } = await documentApi.phanTichAmThanh(chon.id, { createNote: true })
      setKetQuaAi({ summary: data.data.structuredNote, keyPoints: [], amThanh: true, noteTitle: data.data.noteTitle })
      toast.success('Đã phân tích âm thanh và tạo ghi chú!')
    } catch { toast.error('Phân tích âm thanh thất bại') }
    setDangXuLyAi(false)
  }

  const hoiDap = async () => {
    if (!chon || !cauHoi.trim()) return
    setDangXuLyAi(true)
    try {
      const { data } = await documentApi.hoiDap(chon.id, { question: cauHoi })
      setPhanHoiChat(data.data)
      setCauHoi('')
    } catch { toast.error('AI không phản hồi') }
    setDangXuLyAi(false)
  }

  const xoa = async (id) => {
    if (!window.confirm('Xoá tài liệu này?')) return
    await documentApi.xoa(id)
    setDanhSach(p => p.filter(d => d.id !== id))
    if (chon?.id === id) { setChon(null); setKetQuaAi(null) }
    toast.success('Đã xoá')
  }

  const Icon = (d) => d.fileType === 'AUDIO' ? IconMusic : IconFileText
  const dungLuong = bytes => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div style={styles.wrap}>
      {/* Trái: danh sách */}
      <div style={styles.left}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '.5px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Tải lên tài liệu</p>
          <UploadZone onUpload={taiLen} dangTaiLen={dangTaiLen} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {dangTai
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
            : danhSach.length === 0
              ? <EmptyState icon={IconFile} title="Chưa có tài liệu" desc="Tải lên PDF, DOCX, TXT hoặc audio" />
              : danhSach.map(d => {
                const DocIcon = d.fileType === 'AUDIO' ? IconMusic : IconFileText
                const tt = TRANG_THAI[d.status] || TRANG_THAI.PENDING
                return (
                  <div key={d.id} onClick={() => { setChon(d); setKetQuaAi(null); setPhanHoiChat(null) }}
                    style={{ ...styles.docRow, background: chon?.id === d.id ? 'var(--bg-selected)' : 'transparent' }}>
                    <DocIcon size={16} style={{ color: d.fileType === 'AUDIO' ? 'var(--accent-purple)' : 'var(--accent-blue-dim)', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.originalName}</div>
                      <div style={{ fontSize: 10, display: 'flex', gap: 6, marginTop: 2 }}>
                        <span style={{ color: tt.mau }}>{tt.nhan}</span>
                        {d.fileSize && <span style={{ color: 'var(--text-faint)' }}>{dungLuong(d.fileSize)}</span>}
                      </div>
                    </div>
                    <button className="btn-ghost" onClick={e => { e.stopPropagation(); xoa(d.id) }} style={{ padding: 3 }}>
                      <IconTrash size={11} />
                    </button>
                  </div>
                )
              })}
        </div>
      </div>

      {/* Phải: chi tiết + AI */}
      <div style={styles.right}>
        {!chon
          ? <EmptyState icon={IconFile} title="Chọn tài liệu để xem" desc="Phân tích nội dung bằng AI hoặc hỏi đáp trực tiếp" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header tài liệu */}
              <div style={styles.docHeader}>
                {chon.fileType === 'AUDIO'
                  ? <IconMusic size={18} style={{ color: 'var(--accent-purple)' }} />
                  : <IconFileText size={18} style={{ color: 'var(--accent-blue-dim)' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{chon.originalName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {TRANG_THAI[chon.status]?.nhan} · {dungLuong(chon.fileSize)}
                  </div>
                </div>
                {chon.status === 'DONE' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {chon.fileType === 'AUDIO'
                      ? (
                        <button className="btn-ai" onClick={phanTichAmThanh} disabled={dangXuLyAi}>
                          {dangXuLyAi ? <Spinner size={12} /> : <IconSparkles size={12} />}
                          Phân tích & tạo ghi chú
                        </button>
                      ) : (
                        <button className="btn-ai" onClick={phanTich} disabled={dangXuLyAi}>
                          {dangXuLyAi ? <Spinner size={12} /> : <IconSparkles size={12} />}
                          Phân tích AI
                        </button>
                      )}
                  </div>
                )}
                {(chon.status === 'PENDING' || chon.status === 'PROCESSING') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-amber)' }}>
                    <Spinner size={12} /> Đang xử lý tài liệu...
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {/* Kết quả AI */}
                {ketQuaAi && (
                  <div style={styles.aiResult}>
                    <div style={styles.aiLabel}>
                      <IconSparkles size={12} style={{ color: 'var(--accent-blue-dim)' }} />
                      {ketQuaAi.amThanh ? 'Ghi chú từ âm thanh' : 'Phân tích AI'}
                    </div>
                    {ketQuaAi.noteTitle && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={styles.subLabel}>Tiêu đề ghi chú</div>
                        <p style={{ fontWeight: 500 }}>{ketQuaAi.noteTitle}</p>
                      </div>
                    )}
                    {ketQuaAi.summary && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={styles.subLabel}>Tóm tắt</div>
                        <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ketQuaAi.summary}</p>
                      </div>
                    )}
                    {ketQuaAi.keyPoints?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={styles.subLabel}>Điểm chính</div>
                        {ketQuaAi.keyPoints.map((k, i) => <p key={i} style={{ padding: '2px 0' }}>• {k}</p>)}
                      </div>
                    )}
                    {ketQuaAi.keywords?.length > 0 && (
                      <div>
                        <div style={styles.subLabel}>Từ khoá</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {ketQuaAi.keywords.map((k, i) => <span key={i} className="tag tag-blue">{k}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hỏi đáp với tài liệu */}
                {chon.status === 'DONE' && !ketQuaAi && (
                  <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    Nhấn "Phân tích AI" để xem tóm tắt, hoặc hỏi trực tiếp bên dưới
                  </div>
                )}

                {phanHoiChat && (
                  <div style={{ ...styles.aiResult, marginTop: 12 }}>
                    <div style={styles.aiLabel}><IconMessages size={12} style={{ color: 'var(--accent-blue-dim)' }} /> Câu trả lời</div>
                    <p style={{ lineHeight: 1.7 }}>{phanHoiChat.answer}</p>
                  </div>
                )}
              </div>

              {/* Input hỏi đáp */}
              {chon.status === 'DONE' && (
                <div style={styles.chatInput}>
                  <input value={cauHoi} onChange={e => setCauHoi(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && hoiDap()}
                    placeholder={`Hỏi về "${chon.originalName}"...`}
                    style={{ fontSize: 12 }} />
                  <button className="btn-primary" onClick={hoiDap} disabled={!cauHoi.trim() || dangXuLyAi} style={{ padding: '6px 12px', flexShrink: 0 }}>
                    {dangXuLyAi ? <Spinner size={12} /> : 'Hỏi'}
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

const styles = {
  wrap:      { display: 'flex', flex: 1, overflow: 'hidden' },
  left:      { width: 280, flexShrink: 0, borderRight: '.5px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  right:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  docRow:    { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2 },
  docHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '.5px solid var(--border)', background: 'var(--bg-surface)' },
  aiResult:  { background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13 },
  aiLabel:   { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent-blue-dim)', marginBottom: 10, fontWeight: 500 },
  subLabel:  { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 },
  chatInput: { display: 'flex', gap: 8, padding: '10px 16px', borderTop: '.5px solid var(--border)', background: 'var(--bg-surface)' },
}
