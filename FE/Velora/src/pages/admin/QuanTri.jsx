import { useEffect, useState } from 'react'
import { IconUsers, IconBrain, IconChartBar, IconBell, IconEdit, IconCheck, IconX, IconTrash, IconShield } from '@tabler/icons-react'
import adminApi from '../../lib/api/adminApi'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

const TAB = [
  { key: 'thongke',    nhan: 'Thống kê',     icon: IconChartBar },
  { key: 'nguoidung',  nhan: 'Người dùng',   icon: IconUsers },
  { key: 'prompt',     nhan: 'System Prompt', icon: IconBrain },
  { key: 'thongbao',   nhan: 'Thông báo',    icon: IconBell },
]

export default function QuanTri() {
  const [tab, setTab]             = useState('thongke')
  const [thongKe, setThongKe]     = useState(null)
  const [nguoiDung, setNguoiDung] = useState([])
  const [prompts, setPrompts]     = useState([])
  const [dangTai, setDangTai]     = useState(false)
  const [suaPrompt, setSuaPrompt] = useState(null)
  const [promptText, setPromptText] = useState('')
  const [form, setForm] = useState({ title: '', message: '' })

  useEffect(() => {
    switch (tab) {
      case 'thongke':
        adminApi.layThongKe().then(r => setThongKe(r.data.data))
        break
      case 'nguoidung':
        setDangTai(true)
        adminApi.layDanhSachUser({ page: 0, size: 50 })
          .then(r => setNguoiDung(r.data.data?.content || []))
          .finally(() => setDangTai(false))
        break
      case 'prompt':
        adminApi.layPrompt().then(r => setPrompts(r.data.data || []))
        break
    }
  }, [tab])

  const capNhatUser = async (id, data) => {
    try {
      await adminApi.capNhatUser(id, data)
      setNguoiDung(p => p.map(u => u.id === id ? { ...u, ...data } : u))
      toast.success('Đã cập nhật')
    } catch { toast.error('Cập nhật thất bại') }
  }

  const xoaUser = async (id) => {
    if (!window.confirm('Xoá người dùng này?')) return
    await adminApi.xoaUser(id)
    setNguoiDung(p => p.filter(u => u.id !== id))
    toast.success('Đã xoá')
  }

  const luuPrompt = async () => {
    if (!suaPrompt) return
    await adminApi.capNhatPrompt(suaPrompt.id, promptText)
    setPrompts(p => p.map(pr => pr.id === suaPrompt.id ? { ...pr, promptText } : pr))
    setSuaPrompt(null)
    toast.success('Đã lưu prompt')
  }

  const guiQuangBa = async () => {
    if (!form.title || !form.message) { toast.error('Nhập đủ tiêu đề và nội dung'); return }
    await adminApi.phatQuangBa(form)
    setForm({ title: '', message: '' })
    toast.success('Đã gửi thông báo tới tất cả người dùng!')
  }

  return (
    <div style={styles.wrap}>
      {/* Sidebar tab */}
      <div style={styles.sidebar}>
        <div style={{ padding: '12px 10px', borderBottom: '.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconShield size={14} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Quản trị hệ thống</span>
        </div>
        {TAB.map(({ key, nhan, icon: Icon }) => (
          <div key={key} onClick={() => setTab(key)}
            style={{ ...styles.tabItem, background: tab === key ? 'var(--bg-selected)' : 'transparent', color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            <Icon size={14} />
            <span style={{ fontSize: 12 }}>{nhan}</span>
          </div>
        ))}
      </div>

      {/* Nội dung */}
      <div style={styles.content}>

        {/* Thống kê */}
        {tab === 'thongke' && (
          <div style={{ padding: 20 }}>
            <h2 style={{ marginBottom: 16 }}>Thống kê hệ thống</h2>
            {!thongKe
              ? <Spinner size={24} />
              : (
                <div style={styles.statGrid}>
                  {[
                    { nhan: 'Tổng người dùng', val: thongKe.totalUsers, mau: 'var(--accent-blue)' },
                    { nhan: 'Đang hoạt động', val: thongKe.activeUsers, mau: 'var(--accent-green)' },
                    { nhan: 'Tổng ghi chú', val: thongKe.totalNotes, mau: 'var(--accent-purple)' },
                    { nhan: 'Tổng tài liệu', val: thongKe.totalDocuments, mau: 'var(--accent-amber)' },
                    { nhan: 'Đã xử lý xong', val: thongKe.doneDocuments, mau: 'var(--accent-green)' },
                  ].map(({ nhan, val, mau }) => (
                    <div key={nhan} style={{ ...styles.statCard, borderLeft: `3px solid ${mau}` }}>
                      <div style={{ fontSize: 24, fontWeight: 600, color: mau }}>{val ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{nhan}</div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Người dùng */}
        {tab === 'nguoidung' && (
          <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
            <h2 style={{ marginBottom: 14 }}>Quản lý người dùng ({nguoiDung.length})</h2>
            {dangTai
              ? <Spinner size={24} />
              : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tr}>
                      {['Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Ghi chú', 'Thao tác'].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nguoiDung.map(u => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.td}>{u.fullName || '—'}</td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>
                          <span className={`tag ${u.role === 'ADMIN' ? 'tag-purple' : 'tag-blue'}`}>
                            {u.role === 'ADMIN' ? 'Quản trị' : 'Người dùng'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span className={`tag ${u.isActive ? 'tag-green' : 'tag-dim'}`}>
                            {u.isActive ? 'Hoạt động' : 'Khoá'}
                          </span>
                        </td>
                        <td style={styles.td}>{u.noteCount ?? 0}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-ghost" title={u.isActive ? 'Khoá tài khoản' : 'Mở khoá'}
                              onClick={() => capNhatUser(u.id, { isActive: !u.isActive })}
                              style={{ fontSize: 11, padding: '3px 8px' }}>
                              {u.isActive ? 'Khoá' : 'Mở khoá'}
                            </button>
                            {u.role !== 'ADMIN' && (
                              <button className="btn-ghost btn-danger" onClick={() => xoaUser(u.id)} style={{ padding: 4 }}>
                                <IconTrash size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* System Prompt */}
        {tab === 'prompt' && (
          <div style={{ padding: 20, overflow: 'auto' }}>
            <h2 style={{ marginBottom: 6 }}>System Prompt</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
              Chỉnh prompt để thay đổi cách AI hoạt động — không cần deploy lại.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prompts.map(p => (
                <div key={p.id} style={styles.promptCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue-dim)' }}>{p.promptKey}</span>
                      {p.description && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>— {p.description}</span>}
                    </div>
                    <button className="btn-ghost" onClick={() => { setSuaPrompt(p); setPromptText(p.promptText) }}
                      style={{ padding: 4 }}>
                      <IconEdit size={12} />
                    </button>
                  </div>
                  {suaPrompt?.id === p.id
                    ? (
                      <div>
                        <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
                          style={{ fontSize: 12, resize: 'vertical', minHeight: 80 }} rows={4} />
                        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                          <button className="btn-primary" onClick={luuPrompt} style={{ fontSize: 11, padding: '4px 12px' }}>
                            <IconCheck size={11} /> Lưu
                          </button>
                          <button onClick={() => setSuaPrompt(null)} style={{ fontSize: 11 }}>
                            <IconX size={11} /> Huỷ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', position: 'relative' }}>
                        {p.promptText}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thông báo */}
        {tab === 'thongbao' && (
          <div style={{ padding: 20 }}>
            <h2 style={{ marginBottom: 6 }}>Gửi thông báo toàn hệ thống</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
              Thông báo sẽ được gửi đến tất cả người dùng.
            </p>
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={styles.label}>Tiêu đề</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="VD: Bảo trì hệ thống" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label style={styles.label}>Nội dung</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Nội dung thông báo..." style={{ fontSize: 13 }} rows={4} />
              </div>
              <button className="btn-primary" onClick={guiQuangBa} style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>
                <IconBell size={13} /> Gửi tới tất cả người dùng
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  wrap:       { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:    { width: 200, borderRight: '.5px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  tabItem:    { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', margin: '2px 4px', borderRadius: 6 },
  content:    { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
  statGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 },
  statCard:   { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 8, padding: '14px 16px' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  tr:         { borderBottom: '.5px solid var(--border)' },
  th:         { padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11 },
  td:         { padding: '8px 10px', color: 'var(--text-secondary)' },
  promptCard: { background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' },
  label:      { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 },
}
