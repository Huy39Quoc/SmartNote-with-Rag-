import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconFileText, IconUpload, IconCalendar, IconSitemap, IconPlus, IconAlertTriangle } from '@tabler/icons-react'
import useAuthStore from '../service/authStore'
import noteApi from '../lib/api/noteApi'
import scheduleApi from '../lib/api/scheduleApi'
import Spinner from '../components/ui/Spinner'

export default function TongQuan() {
  const { nguoiDung } = useAuthStore()
  const navigate = useNavigate()
  const [ghiChuGanDay, setGhiChuGanDay] = useState([])
  const [deadlineGanDay, setDeadlineGanDay] = useState([])
  const [dangTai, setDangTai] = useState(true)

  useEffect(() => {
    const tai = async () => {
      try {
        const [rc, sc] = await Promise.all([
          noteApi.layTatCa({ page: 0, size: 5 }),
          scheduleApi.layUuTien(),
        ])
        setGhiChuGanDay(rc.data.data?.content || [])
        const ds = sc.data.data
        const tatCa = [...(ds?.urgent || []), ...(ds?.high || []), ...(ds?.medium || [])]
        setDeadlineGanDay(tatCa.slice(0, 5))
      } catch {}
      setDangTai(false)
    }
    tai()
  }, [])

  const buoiChao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  const mucUuTien = p => {
    const m = { URGENT: { nhan: 'Khẩn', cls: 'tag-amber' }, HIGH: { nhan: 'Cao', cls: 'tag-amber' }, MEDIUM: { nhan: 'Vừa', cls: 'tag-blue' }, LOW: { nhan: 'Thấp', cls: 'tag-dim' } }
    return m[p] || m.MEDIUM
  }

  if (dangTai) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={24} /></div>

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>
            {buoiChao()}, {nguoiDung?.fullName?.split(' ').pop() || 'bạn'} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/ghi-chu')}>
          <IconPlus size={14} /> Ghi chú mới
        </button>
      </div>

      {/* Cards shortcut */}
      <div style={styles.shortcutGrid}>
        {[
          { icon: IconFileText,  nhan: 'Ghi chú',    mau: '#1e2d3d',   duong: '/ghi-chu',   desc: 'Tạo và quản lý ghi chú' },
          { icon: IconUpload,    nhan: 'Tài liệu',   mau: '#251e3d',   duong: '/tai-lieu',  desc: 'Upload PDF, DOCX, audio' },
          { icon: IconCalendar,  nhan: 'Lịch',       mau: '#2d1e0a',   duong: '/lich',      desc: 'Deadline & ưu tiên' },
          { icon: IconSitemap,   nhan: 'Kiến thức',  mau: '#1a2d1e',   duong: '/kien-thuc', desc: 'Tổ chức theo chủ đề' },
        ].map(({ icon: Icon, nhan, mau, duong, desc }) => (
          <div key={duong} style={{ ...styles.shortcutCard, background: mau }} onClick={() => navigate(duong)}>
            <Icon size={20} style={{ color: 'var(--text-secondary)', marginBottom: 10 }} />
            <div style={{ fontWeight: 500, marginBottom: 3 }}>{nhan}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid2}>
        {/* Ghi chú gần đây */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={{ fontWeight: 500 }}>Ghi chú gần đây</span>
            <button className="btn-ghost" onClick={() => navigate('/ghi-chu')} style={{ fontSize: 11 }}>Xem tất cả →</button>
          </div>
          {ghiChuGanDay.length === 0
            ? <p style={{ color: 'var(--text-faint)', padding: '16px 0', fontSize: 12 }}>Chưa có ghi chú nào</p>
            : ghiChuGanDay.map(n => (
              <div key={n.id} style={styles.noteRow} onClick={() => navigate(`/ghi-chu/${n.id}`)}>
                <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.contentPreview || 'Không có nội dung'}</div>
              </div>
            ))}
        </div>

        {/* Deadline sắp tới */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={{ fontWeight: 500 }}>Deadline sắp tới</span>
            <button className="btn-ghost" onClick={() => navigate('/lich')} style={{ fontSize: 11 }}>Xem tất cả →</button>
          </div>
          {deadlineGanDay.length === 0
            ? <p style={{ color: 'var(--text-faint)', padding: '16px 0', fontSize: 12 }}>Không có deadline nào</p>
            : deadlineGanDay.map(t => (
              <div key={t.id} style={styles.taskRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{t.taskName}</div>
                  {t.deadline && (
                    <div style={{ fontSize: 11, color: t.daysUntilDeadline < 2 ? 'var(--accent-red)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {t.daysUntilDeadline < 2 && <IconAlertTriangle size={10} />}
                      {t.deadline}
                    </div>
                  )}
                </div>
                <span className={`tag ${mucUuTien(t.priority).cls}`}>{mucUuTien(t.priority).nhan}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { flex: 1, overflow: 'auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 },
  shortcutCard: { padding: '16px', borderRadius: 8, cursor: 'pointer', border: '.5px solid var(--border)', transition: 'opacity .15s' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  panel: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 8, padding: '14px 16px' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '.5px solid var(--border)' },
  noteRow: { padding: '7px 0', borderBottom: '.5px solid var(--border-light)', cursor: 'pointer' },
  taskRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '.5px solid var(--border-light)' },
}
