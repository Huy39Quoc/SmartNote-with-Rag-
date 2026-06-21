import { useEffect, useState } from 'react'
import { IconPlus, IconCheck, IconTrash, IconAlertTriangle, IconSparkles, IconCalendar } from '@tabler/icons-react'
import scheduleApi from '../../lib/api/scheduleApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const NHOM = [
  { key: 'overdue', nhan: 'Quá hạn',    mau: 'var(--accent-red)' },
  { key: 'urgent',  nhan: 'Khẩn',       mau: 'var(--accent-amber)' },
  { key: 'high',    nhan: 'Ưu tiên cao', mau: 'var(--accent-amber)' },
  { key: 'medium',  nhan: 'Trung bình',  mau: 'var(--accent-blue-dim)' },
  { key: 'low',     nhan: 'Thấp',        mau: 'var(--text-muted)' },
]

export default function Lich() {
  const [nhomTask, setNhomTask] = useState({})
  const [dangTai, setDangTai]   = useState(true)
  const [hienForm, setHienForm] = useState(false)
  const [form, setForm]         = useState({ taskName: '', deadline: '', priority: 'MEDIUM' })
  const [dangTrichXuat, setDangTrichXuat] = useState(false)
  const [noiDungGhiChu, setNoiDungGhiChu] = useState('')

  const tai = async () => {
    setDangTai(true)
    try {
      const { data } = await scheduleApi.layUuTien()
      setNhomTask(data.data || {})
    } catch {}
    setDangTai(false)
  }
  useEffect(() => { tai() }, [])

    const taoMoi = async () => {
        const taskName = form.taskName.trim()

        if (!taskName) {
            toast.error('Nhập tên công việc')
            return
        }

        if (form.deadline && form.deadline < homNay) {
            toast.error('Không được đặt deadline trong quá khứ')
            return
        }

        try {
            await scheduleApi.taoMoi({
                taskName,
                deadline: form.deadline || null,
                priority: form.priority,
            })

            toast.success('Đã thêm công việc')
            setForm({ taskName: '', deadline: '', priority: 'MEDIUM' })
            setHienForm(false)
            tai()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Thêm thất bại')
        }
    }

  const hoanThanh = async (id) => {
    try {
      await scheduleApi.capNhat(id, { isDone: true })
      tai()
    } catch {}
  }

  const xoa = async (id) => {
    await scheduleApi.xoa(id)
    tai()
  }

  const trichXuat = async () => {
    if (!noiDungGhiChu.trim()) { toast.error('Nhập nội dung ghi chú'); return }
    setDangTrichXuat(true)
    try {
      const { data } = await scheduleApi.trichXuatTuGhiChu({ content: noiDungGhiChu })
      toast.success(`AI tìm được ${data.data.totalFound} công việc!`)
      setNoiDungGhiChu('')
      tai()
    } catch { toast.error('AI không phản hồi') }
    setDangTrichXuat(false)
  }

  const formatNgay = (ngay) => {
    if (!ngay) return null
    return new Date(ngay).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

    const homNay = new Date().toISOString().slice(0, 10)

  const tatCaTask = Object.values(nhomTask).flat()

  return (
    <div style={styles.wrap}>
      {/* Trái: AI trích xuất */}
      <div style={styles.left}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '.5px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconSparkles size={13} style={{ color: 'var(--accent-blue-dim)' }} />
            Trích xuất deadline từ ghi chú
          </p>
          <textarea value={noiDungGhiChu} onChange={e => setNoiDungGhiChu(e.target.value)}
            placeholder="Dán nội dung ghi chú vào đây, AI sẽ tìm ra các deadline và công việc..."
            style={{ fontSize: 12, resize: 'none', minHeight: 100, marginBottom: 8 }} rows={5} />
          <button className="btn-ai" onClick={trichXuat} disabled={dangTrichXuat || !noiDungGhiChu.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '7px' }}>
            {dangTrichXuat ? <><Spinner size={12} />Đang phân tích...</> : <><IconSparkles size={12} />Phân tích AI</>}
          </button>
        </div>

        {/* Thêm task thủ công */}
        <div style={{ padding: '10px 12px', borderBottom: '.5px solid var(--border)' }}>
          <button className="btn-ghost" onClick={() => setHienForm(p => !p)}
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
            <IconPlus size={13} /> Thêm thủ công
          </button>
          {hienForm && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input placeholder="Tên công việc *" value={form.taskName}
                onChange={e => setForm(p => ({ ...p, taskName: e.target.value }))}
                style={{ fontSize: 12 }} />
                <input
                    type="date"
                    value={form.deadline}
                    min={homNay}
                    onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    style={{ fontSize: 12 }}
                />
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                style={{ fontSize: 12 }}>
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="btn-primary" onClick={taoMoi} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Thêm</button>
                <button onClick={() => setHienForm(false)} style={{ fontSize: 12 }}>Huỷ</button>
              </div>
            </div>
          )}
        </div>

        {/* Thống kê */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Tổng quan</div>
          {NHOM.map(({ key, nhan, mau }) => {
            const dem = nhomTask[key]?.length || 0
            if (dem === 0) return null
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: mau }}>{nhan}</span>
                <span style={{ color: 'var(--text-muted)' }}>{dem} việc</span>
              </div>
            )
          })}
          {tatCaTask.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Không có công việc nào</p>
          )}
        </div>
      </div>

      {/* Phải: Bảng công việc */}
      <div style={styles.right}>
        {dangTai
          ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><Spinner size={24} /></div>
          : tatCaTask.length === 0
            ? <EmptyState icon={IconCalendar} title="Không có công việc nào" desc="Thêm thủ công hoặc dùng AI trích xuất từ ghi chú" />
            : (
              <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
                {NHOM.map(({ key, nhan, mau }) => {
                  const tasks = nhomTask[key] || []
                  if (tasks.length === 0) return null
                  return (
                    <div key={key} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        {key === 'overdue' && <IconAlertTriangle size={13} style={{ color: mau }} />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: mau, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {nhan} ({tasks.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {tasks.map(t => (
                          <div key={t.id} style={styles.taskCard}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.taskName}</div>
                              {t.deadline && (
                                <div style={{ fontSize: 11, color: key === 'overdue' ? mau : 'var(--text-muted)' }}>
                                  📅 {formatNgay(t.deadline)}
                                  {t.daysUntilDeadline !== undefined && t.daysUntilDeadline >= 0 && (
                                    <span style={{ marginLeft: 5 }}>— còn {t.daysUntilDeadline} ngày</span>
                                  )}
                                </div>
                              )}
                              {t.extractedByAi && (
                                <span className="tag tag-blue" style={{ fontSize: 9, marginTop: 4 }}>AI trích xuất</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button className="btn-ghost" onClick={() => hoanThanh(t.id)} title="Đánh dấu hoàn thành"
                                style={{ padding: 4, color: 'var(--accent-green)' }}>
                                <IconCheck size={13} />
                              </button>
                              <button className="btn-ghost btn-danger" onClick={() => xoa(t.id)} style={{ padding: 4 }}>
                                <IconTrash size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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
  wrap:     { display: 'flex', flex: 1, overflow: 'hidden' },
  left:     { width: 280, flexShrink: 0, borderRight: '.5px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  right:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  taskCard: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 6 },
}
