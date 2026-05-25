import { useEffect, useState } from 'react'
import { IconPlus, IconSitemap, IconSparkles, IconTrash, IconFileText, IconRefresh } from '@tabler/icons-react'
import knowledgeApi from '../../lib/api/knowledgeApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function KienThuc() {
  const [danhSach, setDanhSach]   = useState([])
  const [chon, setChon]           = useState(null)
  const [chiTiet, setChiTiet]     = useState(null)
  const [dangTai, setDangTai]     = useState(true)
  const [dangPhanLoai, setDangPhanLoai] = useState(false)
  const [hienForm, setHienForm]   = useState(false)
  const [tenNhom, setTenNhom]     = useState('')

  const tai = async () => {
    setDangTai(true)
    try {
      const { data } = await knowledgeApi.layTatCa()
      setDanhSach(data.data || [])
    } catch {}
    setDangTai(false)
  }

  useEffect(() => { tai() }, [])

  const chonNhom = async (id) => {
    setChon(id)
    try {
      const { data } = await knowledgeApi.layTheoId(id)
      setChiTiet(data.data)
    } catch {}
  }

  const taoMoi = async () => {
    if (!tenNhom.trim()) return
    try {
      await knowledgeApi.taoMoi({ groupName: tenNhom, noteIds: [] })
      toast.success('Đã tạo nhóm mới')
      setTenNhom(''); setHienForm(false)
      tai()
    } catch { toast.error('Tạo thất bại') }
  }

  const xoa = async (id) => {
    if (!window.confirm('Xoá nhóm này?')) return
    await knowledgeApi.xoa(id)
    if (chon === id) { setChon(null); setChiTiet(null) }
    tai()
    toast.success('Đã xoá nhóm')
  }

  const phanLoaiLai = async () => {
    setDangPhanLoai(true)
    try {
      await knowledgeApi.phanLoaiLai()
      toast.success('AI đã phân loại lại toàn bộ ghi chú!')
      tai()
    } catch { toast.error('AI không phản hồi') }
    setDangPhanLoai(false)
  }

  return (
    <div style={styles.wrap}>
      {/* Trái: danh sách nhóm */}
      <div style={styles.left}>
        <div style={styles.leftHeader}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Nhóm kiến thức</span>
          <button className="btn-ghost" onClick={() => setHienForm(p => !p)} style={{ padding: 4 }} title="Tạo nhóm mới">
            <IconPlus size={14} />
          </button>
        </div>

        {hienForm && (
          <div style={{ padding: '8px 10px', borderBottom: '.5px solid var(--border)' }}>
            <input placeholder="Tên nhóm..." value={tenNhom}
              onChange={e => setTenNhom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && taoMoi()}
              style={{ fontSize: 12, marginBottom: 6 }} autoFocus />
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="btn-primary" onClick={taoMoi} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>Tạo</button>
              <button onClick={() => setHienForm(false)} style={{ fontSize: 11 }}>Huỷ</button>
            </div>
          </div>
        )}

        <button className="btn-ai" onClick={phanLoaiLai} disabled={dangPhanLoai}
          style={{ margin: '8px 10px', justifyContent: 'center', padding: '6px' }}>
          {dangPhanLoai ? <Spinner size={12} /> : <IconSparkles size={12} />}
          AI phân loại lại tất cả
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {dangTai
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
            : danhSach.length === 0
              ? <EmptyState icon={IconSitemap} title="Chưa có nhóm nào" desc='Nhấn "AI phân loại lại" để bắt đầu' />
              : danhSach.map(g => (
                <div key={g.id} onClick={() => chonNhom(g.id)}
                  style={{ ...styles.groupRow, background: chon === g.id ? 'var(--bg-selected)' : 'transparent' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{g.groupName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                      {g.noteCount} ghi chú
                      {g.suggestedByAi && <span className="tag tag-blue" style={{ fontSize: 9, marginLeft: 5 }}>AI gợi ý</span>}
                    </div>
                  </div>
                  <button className="btn-ghost" onClick={e => { e.stopPropagation(); xoa(g.id) }} style={{ padding: 3 }}>
                    <IconTrash size={11} />
                  </button>
                </div>
              ))}
        </div>
      </div>

      {/* Phải: ghi chú trong nhóm */}
      <div style={styles.right}>
        {!chon || !chiTiet
          ? <EmptyState icon={IconSitemap} title="Chọn nhóm để xem ghi chú"
              desc="Mỗi nhóm chứa các ghi chú cùng chủ đề được AI phân loại tự động" />
          : (
            <div style={{ padding: 16 }}>
              <div style={styles.groupHeader}>
                <IconSitemap size={18} style={{ color: 'var(--accent-green)' }} />
                <div>
                  <h2 style={{ fontSize: 16 }}>{chiTiet.groupName}</h2>
                  {chiTiet.aiReasoning && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      AI: {chiTiet.aiReasoning}
                    </p>
                  )}
                </div>
                {chiTiet.suggestedByAi && <span className="tag tag-blue">AI gợi ý</span>}
              </div>

              {chiTiet.notes?.length === 0
                ? <EmptyState icon={IconFileText} title="Nhóm chưa có ghi chú" />
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    {chiTiet.notes.map(n => (
                      <div key={n.id} style={styles.noteCard}>
                        <IconFileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                          {n.contentPreview && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{n.contentPreview}</div>
                          )}
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            {n.tags?.map(t => <span key={t.id} className="tag tag-dim" style={{ fontSize: 9 }}>{t.name}</span>)}
                          </div>
                        </div>
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
  wrap:        { display: 'flex', flex: 1, overflow: 'hidden' },
  left:        { width: 240, flexShrink: 0, borderRight: '.5px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' },
  leftHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '.5px solid var(--border)' },
  right:       { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
  groupRow:    { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', margin: '2px 4px', borderRadius: 6 },
  groupHeader: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '.5px solid var(--border)', marginBottom: 4 },
  noteCard:    { display: 'flex', gap: 9, padding: '9px 12px', background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 6 },
}
