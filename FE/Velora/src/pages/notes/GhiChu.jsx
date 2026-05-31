import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconPlus, IconSearch, IconBookmark, IconBookmarkFilled,
  IconTrash, IconSparkles, IconTag, IconX, IconCheck, IconMicrophone
} from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import scheduleApi from '../../lib/api/scheduleApi'
import tagApi from '../../lib/api/tagApi'
import NoteCard from '../../components/notes/NoteCard'
import AiPanel from '../../components/notes/AiPanel'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function GhiChu() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const [danhSach, setDanhSach]     = useState([])
  const [ghiChuHienTai, setGhiChuHienTai] = useState(null)
  const [tags, setTags]             = useState([])
  const [timKiem, setTimKiem]       = useState('')
  const [dangTai, setDangTai]       = useState(true)
  const [dangLuu, setDangLuu]       = useState(false)
  const [hienAi, setHienAi]         = useState(false)
  const [hienTag, setHienTag]       = useState(false)
  const [hienLichGoiY, setHienLichGoiY] = useState(false)
  const [dangTrichLich, setDangTrichLich] = useState(false)
  const [locTag, setLocTag]         = useState(null)

  // Tải danh sách ghi chú
  const taiDanhSach = useCallback(async () => {
    setDangTai(true)
    try {
      const params = { page: 0, size: 50 }
      if (timKiem) params.keyword = timKiem
      if (locTag)  params.tagIds  = locTag
      const { data } = await noteApi.layTatCa(params)
      setDanhSach(data.data?.content || [])
    } catch { toast.error('Không tải được ghi chú') }
    setDangTai(false)
  }, [timKiem, locTag])

  useEffect(() => { taiDanhSach() }, [taiDanhSach])

  useEffect(() => {
    tagApi.layTatCa().then(r => setTags(r.data.data || []))
  }, [])

  useEffect(() => {
    if (idParam && danhSach.length) {
      const found = danhSach.find(n => n.id === idParam)
      if (found) chonGhiChu(found.id)
    }
  }, [idParam, danhSach])

  const chonGhiChu = async (id) => {
    try {
      const { data } = await noteApi.layTheoId(id)
      setGhiChuHienTai(data.data)
      navigate(`/ghi-chu/${id}`, { replace: true })
    } catch {}
  }

  const taoMoi = async () => {
    try {
      const { data } = await noteApi.taoMoi({ title: 'Ghi chú mới', content: '' })
      const ghiChu = data.data
      setDanhSach(p => [ghiChu, ...p])
      setGhiChuHienTai(ghiChu)
      navigate(`/ghi-chu/${ghiChu.id}`, { replace: true })
    } catch { toast.error('Không thể tạo ghi chú') }
  }

  const luu = async () => {
    if (!ghiChuHienTai) return
    setDangLuu(true)
    try {
      const { data } = await noteApi.capNhat(ghiChuHienTai.id, {
        title: ghiChuHienTai.title,
        content: ghiChuHienTai.content,
        tagIds: ghiChuHienTai.tags?.map(t => t.id),
      })
      setDanhSach(p => p.map(n => n.id === data.data.id ? { ...n, ...data.data } : n))
      toast.success('Đã lưu')
    } catch { toast.error('Lưu thất bại') }
    setDangLuu(false)
  }

  const xoa = async () => {
    if (!ghiChuHienTai || !window.confirm('Xoá ghi chú này?')) return
    try {
      await noteApi.xoa(ghiChuHienTai.id)
      setDanhSach(p => p.filter(n => n.id !== ghiChuHienTai.id))
      setGhiChuHienTai(null)
      navigate('/ghi-chu', { replace: true })
      toast.success('Đã xoá')
    } catch { toast.error('Xoá thất bại') }
  }

  const danhDau = async () => {
    if (!ghiChuHienTai) return
    try {
      const { data } = await noteApi.danhDau(ghiChuHienTai.id)
      setGhiChuHienTai(data.data)
      setDanhSach(p => p.map(n => n.id === data.data.id ? { ...n, isBookmarked: data.data.isBookmarked } : n))
    } catch {}
  }

  const apDungAi = (noiDung, tieuDe) => {
    setGhiChuHienTai(p => ({
      ...p,
      content: noiDung || p.content,
      title: tieuDe || p.title,
    }))
  }

  const coTheTrichLich = (text) => {
    if (!text) return false
    return /\b(?:\d{1,2}[:.][0-5]\d|[0-2]?\d\s*giờ|ngày\s*\d{1,2}|thứ\s*(?:hai|ba|tư|năm|sáu|bảy)|deadline|hẹn)\b/i.test(text)
  }

  useEffect(() => {
    if (!ghiChuHienTai) return
    setHienLichGoiY(coTheTrichLich(ghiChuHienTai.content))
  }, [ghiChuHienTai?.content])

  const trichXuatLich = async () => {
    if (!ghiChuHienTai?.content?.trim()) return
    setDangTrichLich(true)
    try {
      const { data } = await scheduleApi.trichXuatTuGhiChu({ content: ghiChuHienTai.content })
      toast.success(`AI đã tìm ${data.data.totalFound || 0} công việc / lịch`)
      setHienLichGoiY(false)
    } catch { toast.error('Không thể trích xuất lịch từ ghi chú') }
    setDangTrichLich(false)
  }

  // Auto-save mỗi 3 giây
  useEffect(() => {
    if (!ghiChuHienTai) return
    const t = setTimeout(luu, 3000)
    return () => clearTimeout(t)
  }, [ghiChuHienTai?.content, ghiChuHienTai?.title])

  return (
    <div style={styles.wrap}>
      {/* Cột danh sách */}
      <div style={styles.list}>
        {/* Thanh tìm kiếm + tạo mới */}
        <div style={styles.listHeader}>
          <div style={styles.searchRow}>
            <div style={styles.searchWrap}>
              <IconSearch size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input placeholder="Tìm kiếm..." style={{ paddingLeft: 26, fontSize: 12, height: 30 }}
                value={timKiem} onChange={e => setTimKiem(e.target.value)} />
            </div>
            <button className="btn-ghost" onClick={taoMoi} style={{ padding: 5, flexShrink: 0 }} title="Tạo ghi chú mới">
              <IconPlus size={15} />
            </button>
          </div>

          {/* Tags filter */}
          <div style={styles.tagFilter}>
            <button className={locTag ? 'btn-ghost' : 'btn-ai'} onClick={() => setLocTag(null)} style={{ fontSize: 10, padding: '2px 8px' }}>Tất cả</button>
            {tags.map(t => (
              <button key={t.id}
                style={{ fontSize: 10, padding: '2px 8px', background: locTag === t.id ? 'var(--bg-ai)' : 'transparent' }}
                className={locTag === t.id ? 'btn-ai' : 'btn-ghost'}
                onClick={() => setLocTag(locTag === t.id ? null : t.id)}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách ghi chú */}
        <div style={styles.listBody}>
          {dangTai
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
            : danhSach.length === 0
              ? <EmptyState icon={IconSearch} title="Không tìm thấy ghi chú" desc="Thử tạo ghi chú mới" />
              : danhSach.map(n => (
                <NoteCard key={n.id} note={n}
                  active={ghiChuHienTai?.id === n.id}
                  onClick={() => chonGhiChu(n.id)} />
              ))}
        </div>
      </div>

      {/* Editor */}
      <div style={styles.editor}>
        {!ghiChuHienTai
          ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState icon={IconPlus} title="Chọn hoặc tạo ghi chú"
                action={<button className="btn-primary" onClick={taoMoi}><IconPlus size={13} />Ghi chú mới</button>} />
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={styles.toolbar}>
                <input value={ghiChuHienTai.title}
                  onChange={e => setGhiChuHienTai(p => ({ ...p, title: e.target.value }))}
                  placeholder="Tiêu đề ghi chú..."
                  style={styles.tieuDe} />
                <div style={styles.toolbarRight}>
                  {dangLuu && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang lưu...</span>}
                  <button className="btn-ghost" onClick={danhDau} title={ghiChuHienTai.isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu'}>
                    {ghiChuHienTai.isBookmarked
                      ? <IconBookmarkFilled size={14} style={{ color: 'var(--accent-amber)' }} />
                      : <IconBookmark size={14} />}
                  </button>
                  <button className={hienAi ? 'btn-ai' : 'btn-ghost'} onClick={() => setHienAi(p => !p)} title="Trợ lý AI">
                    <IconSparkles size={14} />
                    <span style={{ fontSize: 11 }}>AI</span>
                  </button>
                  <button className="btn-danger btn-ghost" onClick={xoa} title="Xoá">
                    <IconTrash size={13} />
                  </button>
                  <button className="btn-primary" onClick={luu} style={{ padding: '4px 12px', fontSize: 12 }}>
                    <IconCheck size={12} /> Lưu
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Vùng soạn thảo */}
                <textarea
                  value={ghiChuHienTai.content || ''}
                  onChange={e => setGhiChuHienTai(p => ({ ...p, content: e.target.value }))}
                  placeholder="Bắt đầu ghi chú... (hỗ trợ Markdown)"
                  style={styles.textarea}
                />
                {hienLichGoiY && (
                  <div style={styles.schedulePrompt}>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <strong>AI phát hiện thông tin thời gian.</strong> Bạn có muốn trích xuất lịch / công việc từ ghi chú này?
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-primary" onClick={trichXuatLich} disabled={dangTrichLich}
                        style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                        {dangTrichLich ? 'Đang xử lý...' : 'Có, tạo lịch'}
                      </button>
                      <button className="btn-ghost" onClick={() => setHienLichGoiY(false)}
                        style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                        Không, để sau
                      </button>
                    </div>
                  </div>
                )}
                {/* AI Panel */}
                {hienAi && (
                  <AiPanel
                    noteId={ghiChuHienTai.id}
                    content={ghiChuHienTai.content}
                    title={ghiChuHienTai.title}
                    onApply={apDungAi}
                    onDong={() => setHienAi(false)}
                  />
                )}
              </div>
            </>
          )}
      </div>
    </div>
  )
}

const styles = {
  wrap:        { display: 'flex', flex: 1, overflow: 'hidden', height: '100%' },
  list:        { width: 260, flexShrink: 0, borderRight: '.5px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' },
  listHeader:  { padding: '10px 8px 6px', borderBottom: '.5px solid var(--border)' },
  searchRow:   { display: 'flex', gap: 4, marginBottom: 6 },
  searchWrap:  { flex: 1, position: 'relative' },
  tagFilter:   { display: 'flex', gap: 3, flexWrap: 'wrap' },
  listBody:    { flex: 1, overflowY: 'auto' },
  editor:      { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar:     { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '.5px solid var(--border)' },
  tieuDe:      { flex: 1, background: 'transparent', border: 'none', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', padding: 0, outline: 'none', width: 'auto' },
  toolbarRight:{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 },
  textarea:    { flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', resize: 'none', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, outline: 'none', fontFamily: 'var(--font)', overflow: 'auto' },
  schedulePrompt: { width: 320, flexShrink: 0, background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 10, padding: 14, marginLeft: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
}
