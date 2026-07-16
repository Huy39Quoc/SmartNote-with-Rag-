import { useEffect, useState } from 'react'
import { IconPlus, IconCheck, IconTrash, IconAlertTriangle, IconSparkles, IconCalendar } from '@tabler/icons-react'
import scheduleApi from '../../lib/api/scheduleApi'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { SCHEDULE_GROUPS } from '../../constants/scheduleConstants'

export default function Schedule() {
  const [taskGroups, setTaskGroups] = useState({})
  const [isLoading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ taskName: '', deadline: '', priority: 'MEDIUM' })
  const [isExtracting, setExtracting] = useState(false)
  const [noteContent, setNoteContent] = useState('')

  const download = async () => {
    setLoading(true)
    try {
      const { data } = await scheduleApi.getPriority()
      setTaskGroups(data.data || {})
    } catch {}
    setLoading(false)
  }
  useEffect(() => { download() }, [])

    const create = async () => {
        const taskName = form.taskName.trim()

        if (!taskName) {
            toast.error('Nhập tên công việc')
            return
        }

        if (form.deadline && form.deadline < today) {
            toast.error('Không được đặt deadline trong quá khứ')
            return
        }

        try {
            await scheduleApi.create({
                taskName,
                deadline: form.deadline || null,
                priority: form.priority,
            })

            toast.success('Đã thêm công việc')
            setForm({ taskName: '', deadline: '', priority: 'MEDIUM' })
            setShowForm(false)
            download()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Thêm thất bại')
        }
    }

  const complete = async (id) => {
    try {
      await scheduleApi.update(id, { isDone: true })
      download()
    } catch {}
  }

  const remove = async (id) => {
    await scheduleApi.remove(id)
    download()
  }

  const extract = async () => {
    if (!noteContent.trim()) { toast.error('Nhập nội dung ghi chú'); return }
    setExtracting(true)
    try {
      const { data } = await scheduleApi.extractFromNote({ content: noteContent })
      toast.success(`AI tìm được ${data.data.totalFound} công việc!`)
      setNoteContent('')
      download()
    } catch { toast.error('AI không phản hồi') }
    setExtracting(false)
  }

  const formatDate = (date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

    const today = new Date().toISOString().slice(0, 10)

  const allTasks = Object.values(taskGroups).flat()

  return (
    <div style={styles.wrap}>

      <div style={styles.left}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '.5px solid var(--border)' }}>
          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconSparkles size={13} style={{ color: 'var(--accent-blue-dim)' }} />
            Trích xuất deadline từ ghi chú
          </p>
          <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
            placeholder="Dán nội dung ghi chú vào đây, AI sẽ tìm ra các deadline và công việc..."
            style={{ fontSize: 12, resize: 'none', minHeight: 100, marginBottom: 8 }} rows={5} />
          <button className="btn-ai" onClick={extract} disabled={isExtracting || !noteContent.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '7px' }}>
            {isExtracting ? <><Spinner size={12} />Đang phân tích...</> : <><IconSparkles size={12} />Phân tích AI</>}
          </button>
        </div>

        <div style={{ padding: '10px 12px', borderBottom: '.5px solid var(--border)' }}>
          <button className="btn-ghost" onClick={() => setShowForm(p => !p)}
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
            <IconPlus size={13} /> Thêm thủ công
          </button>
          {showForm && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input placeholder="Tên công việc *" value={form.taskName}
                onChange={e => setForm(p => ({ ...p, taskName: e.target.value }))}
                style={{ fontSize: 12 }} />
                <input
                    type="date"
                    value={form.deadline}
                    min={today}
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
                <button className="btn-primary" onClick={create} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Thêm</button>
                <button onClick={() => setShowForm(false)} style={{ fontSize: 12 }}>Huỷ</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Tổng quan</div>
          {SCHEDULE_GROUPS.map(({ key, label, color }) => {
            const count = taskGroups[key]?.length || 0
            if (count === 0) return null
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: color }}>{label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{count} việc</span>
              </div>
            )
          })}
          {allTasks.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>Không có công việc nào</p>
          )}
        </div>
      </div>

      <div style={styles.right}>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><Spinner size={24} /></div>
          : allTasks.length === 0
            ? <EmptyState icon={IconCalendar} title="Không có công việc nào" desc="Thêm thủ công hoặc dùng AI trích xuất từ ghi chú" />
            : (
              <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
                {SCHEDULE_GROUPS.map(({ key, label, color }) => {
                  const tasks = taskGroups[key] || []
                  if (tasks.length === 0) return null
                  return (
                    <div key={key} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        {key === 'overdue' && <IconAlertTriangle size={13} style={{ color: color }} />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {label} ({tasks.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {tasks.map(t => (
                          <div key={t.id} style={styles.taskCard}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.taskName}</div>
                              {t.deadline && (
                                <div style={{ fontSize: 11, color: key === 'overdue' ? color : 'var(--text-muted)' }}>
                                  📅 {formatDate(t.deadline)}
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
                              <button className="btn-ghost" onClick={() => complete(t.id)} title="Đánh dấu hoàn thành"
                                style={{ padding: 4, color: 'var(--accent-green)' }}>
                                <IconCheck size={13} />
                              </button>
                              <button className="btn-ghost btn-danger" onClick={() => remove(t.id)} style={{ padding: 4 }}>
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
