import { useEffect, useRef, useState } from 'react'
import { IconPlus, IconTrash, IconSend, IconMessages, IconRobot } from '@tabler/icons-react'
import chatApi from '../../lib/api/chatApi'
import MessageBubble from '../../components/chat/MessageBubble'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function Chat() {
  const [sessions, setSessions]         = useState([])
  const [sessionHienTai, setSessionHienTai] = useState(null)
  const [tinNhan, setTinNhan]           = useState([])
  const [cauHoi, setCauHoi]             = useState('')
  const [dangGui, setDangGui]           = useState(false)
  const [dangTai, setDangTai]           = useState(false)
  const cuoiChat = useRef(null)

  useEffect(() => {
    chatApi.layDanhSachSession().then(r => setSessions(r.data.data || []))
  }, [])

  useEffect(() => {
    cuoiChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tinNhan])

  const chonSession = async (s) => {
    setDangTai(true)
    try {
      const { data } = await chatApi.laySession(s.id)
      setSessionHienTai(data.data)
      setTinNhan(data.data.messages || [])
    } catch { toast.error('Không tải được cuộc trò chuyện') }
    setDangTai(false)
  }

  const taoSession = async () => {
    try {
      const { data } = await chatApi.taoSession()
      setSessions(p => [data.data, ...p])
      setSessionHienTai(data.data)
      setTinNhan([])
    } catch { toast.error('Không thể tạo cuộc trò chuyện') }
  }

  const xoaSession = async (id) => {
    if (!window.confirm('Xoá cuộc trò chuyện này?')) return
    await chatApi.xoaSession(id)
    setSessions(p => p.filter(s => s.id !== id))
    if (sessionHienTai?.id === id) { setSessionHienTai(null); setTinNhan([]) }
  }

  const gui = async () => {
    if (!cauHoi.trim() || !sessionHienTai || dangGui) return
    const cau = cauHoi.trim()
    setCauHoi('')
    setDangGui(true)

    // Thêm tin nhắn user ngay lập tức (optimistic)
    const tinUser = { id: Date.now(), role: 'USER', content: cau, createdAt: new Date() }
    setTinNhan(p => [...p, tinUser])

    try {
      const { data } = await chatApi.hoiDap(sessionHienTai.id, { message: cau })
      const { assistantMessage } = data.data
      setTinNhan(p => [...p, assistantMessage])

      // Cập nhật title session nếu là tin đầu
      if (tinNhan.length === 0) {
        setSessions(p => p.map(s => s.id === sessionHienTai.id
          ? { ...s, title: cau.slice(0, 40) } : s))
      }
    } catch { toast.error('AI không phản hồi, kiểm tra LM Studio') }
    setDangGui(false)
  }

  const nhimEnter = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gui() } }

  return (
    <div style={styles.wrap}>
      {/* Sidebar sessions */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Hỏi đáp AI</span>
          <button className="btn-ghost" onClick={taoSession} style={{ padding: 4 }} title="Cuộc trò chuyện mới">
            <IconPlus size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0
            ? <div style={{ padding: 12, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>Chưa có cuộc trò chuyện</div>
            : sessions.map(s => (
              <div key={s.id}
                style={{ ...styles.sessionRow, background: sessionHienTai?.id === s.id ? 'var(--bg-selected)' : 'transparent' }}
                onClick={() => chonSession(s)}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title || 'Cuộc trò chuyện mới'}
                  </div>
                  {s.lastMessage && (
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {s.lastMessage}
                    </div>
                  )}
                </div>
                <button className="btn-ghost btn-danger" onClick={e => { e.stopPropagation(); xoaSession(s.id) }} style={{ padding: 3, flexShrink: 0, opacity: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <IconTrash size={11} />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Khu vực chat */}
      <div style={styles.chatArea}>
        {!sessionHienTai
          ? (
            <EmptyState icon={IconMessages} title="Chọn hoặc tạo cuộc trò chuyện"
              desc="AI sẽ trả lời dựa trên ghi chú và tài liệu của bạn"
              action={<button className="btn-primary" onClick={taoSession}><IconPlus size={13} />Bắt đầu hỏi đáp</button>} />
          ) : (
            <>
              {/* Tin nhắn */}
              <div style={styles.messages}>
                {dangTai
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
                  : tinNhan.length === 0
                    ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <IconRobot size={32} style={{ color: 'var(--text-faint)', marginBottom: 10 }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          Hỏi bất cứ điều gì về ghi chú và tài liệu của bạn
                        </p>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                          {['Tóm tắt ghi chú về OOP', 'Deadline gần nhất?', 'Giải thích khái niệm Interface'].map(q => (
                            <button key={q} className="btn-ghost" onClick={() => setCauHoi(q)} style={{ fontSize: 11 }}>{q}</button>
                          ))}
                        </div>
                      </div>
                    )
                    : tinNhan.map(t => <MessageBubble key={t.id} tin={t} />)}
                {dangGui && (
                  <div style={{ display: 'flex', gap: 8, padding: '0 0 4px', alignItems: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spinner size={12} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI đang trả lời...</span>
                  </div>
                )}
                <div ref={cuoiChat} />
              </div>

              {/* Input */}
              <div style={styles.inputArea}>
                <textarea value={cauHoi} onChange={e => setCauHoi(e.target.value)}
                  onKeyDown={nhimEnter}
                  placeholder="Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
                  style={styles.input} rows={2} />
                <button className="btn-primary" onClick={gui} disabled={!cauHoi.trim() || dangGui}
                  style={{ padding: '8px 14px', alignSelf: 'flex-end' }}>
                  <IconSend size={14} />
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  )
}

const styles = {
  wrap:          { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:       { width: 220, borderRight: '.5px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '.5px solid var(--border)' },
  sessionRow:    { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', cursor: 'pointer', borderRadius: 4, margin: '2px 4px' },
  chatArea:      { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  messages:      { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' },
  inputArea:     { display: 'flex', gap: 8, padding: '10px 16px', borderTop: '.5px solid var(--border)', background: 'var(--bg-surface)' },
  input:         { flex: 1, resize: 'none', fontSize: 13, padding: '8px 10px', lineHeight: 1.5 },
}
