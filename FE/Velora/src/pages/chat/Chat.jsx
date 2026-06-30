import { useEffect, useRef, useState } from 'react'
import {
  IconMicrophone,
  IconMessages,
  IconPlayerStop,
  IconPlus,
  IconRobot,
  IconSend,
  IconTrash,
} from '@tabler/icons-react'
import chatApi from '../../lib/api/chatApi'
import MessageBubble from '../../components/chat/MessageBubble'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

export default function Chat() {
  const [sessions, setSessions] = useState([])
  const [sessionHienTai, setSessionHienTai] = useState(null)
  const [tinNhan, setTinNhan] = useState([])
  const [cauHoi, setCauHoi] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [dangTai, setDangTai] = useState(false)
  const [dangGhiAm, setDangGhiAm] = useState(false)
  const [dangNhanDang, setDangNhanDang] = useState(false)

  const cuoiChat = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    chatApi.layDanhSachSession()
      .then(r => setSessions(r.data.data || []))
      .catch(() => toast.error('Không tải được danh sách trò chuyện'))
  }, [])

  useEffect(() => {
    cuoiChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tinNhan])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const chonSession = async (s) => {
    setDangTai(true)

    try {
      const { data } = await chatApi.laySession(s.id)
      setSessionHienTai(data.data)
      setTinNhan(data.data.messages || [])
    } catch {
      toast.error('Không tải được cuộc trò chuyện')
    } finally {
      setDangTai(false)
    }
  }

  const taoSession = async () => {
    try {
      const { data } = await chatApi.taoSession()
      setSessions(p => [data.data, ...p])
      setSessionHienTai(data.data)
      setTinNhan([])
    } catch {
      toast.error('Không thể tạo cuộc trò chuyện')
    }
  }

  const xoaSession = async (id) => {
    if (!window.confirm('Xoá cuộc trò chuyện này?')) return

    await chatApi.xoaSession(id)
    setSessions(p => p.filter(s => s.id !== id))

    if (sessionHienTai?.id === id) {
      setSessionHienTai(null)
      setTinNhan([])
    }
  }

  const guiNoiDung = async (noiDung) => {
    const cau = noiDung.trim()
    if (!cau || !sessionHienTai || dangGui) return

    setCauHoi('')
    setDangGui(true)

    const tinUser = {
      id: Date.now(),
      role: 'USER',
      content: cau,
      createdAt: new Date(),
    }

    setTinNhan(p => [...p, tinUser])

    try {
      const { data } = await chatApi.hoiDap(sessionHienTai.id, { message: cau })
      const { assistantMessage } = data.data

      setTinNhan(p => [...p, assistantMessage])

      if (tinNhan.length === 0) {
        setSessions(p => p.map(s => s.id === sessionHienTai.id
          ? { ...s, title: cau.slice(0, 40) }
          : s
        ))
      }
    } catch {
      toast.error('AI không phản hồi, kiểm tra LM Studio')
    } finally {
      setDangGui(false)
    }
  }

  const gui = () => guiNoiDung(cauHoi)

  const batDauGhiAm = async () => {
    if (dangGhiAm || dangNhanDang) return

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error('Trình duyệt không hỗ trợ ghi âm')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      streamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = event => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setDangGhiAm(false)

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        audioChunksRef.current = []

        if (blob.size === 0) {
          toast.error('Không thu được âm thanh')
          return
        }

        await nhanDangVaDienVaoChat(blob)
      }

      recorder.start()
      setDangGhiAm(true)
      toast.success('Đang ghi âm...')
    } catch {
      toast.error('Không thể truy cập micro. Hãy cho phép quyền microphone.')
    }
  }

  const dungGhiAm = () => {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const nhanDangVaDienVaoChat = async (blob) => {
    setDangNhanDang(true)

    try {
      const formData = new FormData()
      formData.append('file', blob, `chat-voice-${Date.now()}.webm`)

      const { data } = await chatApi.nhanDangGiongNoi(formData)
      const transcript = data.data?.transcript?.trim()

      if (!transcript) {
        toast.error('Không nhận dạng được nội dung giọng nói')
        return
      }

      setCauHoi(transcript)
      toast.success('Đã chuyển giọng nói thành văn bản')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận dạng giọng nói')
    } finally {
      setDangNhanDang(false)
    }
  }

  const nhimEnter = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      gui()
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Hỏi đáp AI</span>
          <button
            className="btn-ghost"
            onClick={taoSession}
            style={{ padding: 4 }}
            title="Cuộc trò chuyện mới"
          >
            <IconPlus size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0 ? (
            <div style={styles.emptySessions}>
              Chưa có cuộc trò chuyện
            </div>
          ) : sessions.map(s => (
            <div
              key={s.id}
              style={{
                ...styles.sessionRow,
                background: sessionHienTai?.id === s.id
                  ? 'var(--bg-selected)'
                  : 'transparent',
              }}
              onClick={() => chonSession(s)}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={styles.sessionTitle}>
                  {s.title || 'Cuộc trò chuyện mới'}
                </div>

                {s.lastMessage && (
                  <div style={styles.lastMessage}>
                    {s.lastMessage}
                  </div>
                )}
              </div>

              <button
                className="btn-ghost btn-danger"
                onClick={e => {
                  e.stopPropagation()
                  xoaSession(s.id)
                }}
                style={styles.deleteSessionButton}
              >
                <IconTrash size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.chatArea}>
        {!sessionHienTai ? (
          <EmptyState
            icon={IconMessages}
            title="Chọn hoặc tạo cuộc trò chuyện"
            desc="AI sẽ trả lời dựa trên ghi chú và tài liệu của bạn"
            action={
              <button className="btn-primary" onClick={taoSession}>
                <IconPlus size={13} />
                Bắt đầu hỏi đáp
              </button>
            }
          />
        ) : (
          <>
            <div style={styles.messages}>
              {dangTai ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Spinner />
                </div>
              ) : tinNhan.length === 0 ? (
                <div style={styles.emptyChat}>
                  <IconRobot size={32} style={{ color: 'var(--text-faint)', marginBottom: 10 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    Hỏi bất cứ điều gì về ghi chú và tài liệu của bạn
                  </p>

                  <div style={styles.suggestions}>
                    {[
                      'Tóm tắt ghi chú về OOP',
                      'Deadline gần nhất?',
                      'Giải thích khái niệm Interface',
                    ].map(q => (
                      <button
                        key={q}
                        className="btn-ghost"
                        onClick={() => setCauHoi(q)}
                        style={{ fontSize: 11 }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                tinNhan.map(t => <MessageBubble key={t.id} tin={t} />)
              )}

              {dangGui && (
                <div style={styles.typingRow}>
                  <div style={styles.aiAvatar}>
                    <Spinner size={12} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    AI đang trả lời...
                  </span>
                </div>
              )}

              <div ref={cuoiChat} />
            </div>

            <div style={styles.inputArea}>
              <textarea
                value={cauHoi}
                onChange={e => setCauHoi(e.target.value)}
                onKeyDown={nhimEnter}
                placeholder={
                  dangGhiAm
                    ? 'Đang ghi âm... bấm nút dừng để nhận dạng'
                    : dangNhanDang
                      ? 'Đang chuyển giọng nói thành văn bản...'
                      : 'Nhập câu hỏi hoặc bấm micro để nói...'
                }
                style={styles.input}
                rows={2}
                disabled={dangNhanDang}
              />

              <button
                className={dangGhiAm ? 'btn-danger' : 'btn-ghost'}
                onClick={dangGhiAm ? dungGhiAm : batDauGhiAm}
                disabled={dangGui || dangNhanDang}
                style={styles.voiceButton}
                title={dangGhiAm ? 'Dừng ghi âm' : 'Ghi âm câu hỏi'}
              >
                {dangGhiAm ? <IconPlayerStop size={15} /> : <IconMicrophone size={15} />}
                <span style={{ fontSize: 12 }}>
                  {dangGhiAm ? 'Dừng' : dangNhanDang ? 'Đang nghe...' : 'Nói'}
                </span>
              </button>

              <button
                className="btn-primary"
                onClick={gui}
                disabled={!cauHoi.trim() || dangGui || dangNhanDang}
                style={styles.sendButton}
              >
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
  wrap: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    borderRight: '.5px solid var(--border)',
    background: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '.5px solid var(--border)',
  },
  emptySessions: {
    padding: 12,
    fontSize: 11,
    color: 'var(--text-faint)',
    textAlign: 'center',
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    borderRadius: 4,
    margin: '2px 4px',
  },
  sessionTitle: {
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lastMessage: {
    fontSize: 10,
    color: 'var(--text-faint)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 2,
  },
  deleteSessionButton: {
    padding: 3,
    flexShrink: 0,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyChat: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  suggestions: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  typingRow: {
    display: 'flex',
    gap: 8,
    padding: '0 0 4px',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--bg-ai)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputArea: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px',
    borderTop: '.5px solid var(--border)',
    background: 'var(--bg-surface)',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    resize: 'none',
    fontSize: 13,
    padding: '8px 10px',
    lineHeight: 1.5,
  },
  voiceButton: {
    minWidth: 82,
    justifyContent: 'center',
    padding: '8px 10px',
    alignSelf: 'flex-end',
  },
  sendButton: {
    padding: '8px 14px',
    alignSelf: 'flex-end',
  },
}
