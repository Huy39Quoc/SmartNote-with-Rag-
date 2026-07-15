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
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isSending, setSending] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [isRecording, setRecording] = useState(false)
  const [isRecognizing, setRecognizing] = useState(false)

  const chatEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

  useEffect(() => {
    chatApi.getSessions()
      .then(r => setSessions(r.data.data || []))
      .catch(() => toast.error('Không tải được danh sách trò chuyện'))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const selectSession = async (s) => {
    setLoading(true)

    try {
      const { data } = await chatApi.getSession(s.id)
      setCurrentSession(data.data)
      setMessages(data.data.messages || [])
    } catch {
      toast.error('Không tải được cuộc trò chuyện')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    try {
      const { data } = await chatApi.createSession()
      setSessions(p => [data.data, ...p])
      setCurrentSession(data.data)
      setMessages([])
    } catch {
      toast.error('Không thể tạo cuộc trò chuyện')
    }
  }

  const deleteSession = async (id) => {
    if (!window.confirm('Xoá cuộc trò chuyện này?')) return

    await chatApi.deleteSession(id)
    setSessions(p => p.filter(s => s.id !== id))

    if (currentSession?.id === id) {
      setCurrentSession(null)
      setMessages([])
    }
  }

  const sendContent = async (content) => {
    const cau = content.trim()
    if (!cau || !currentSession || isSending) return

    setQuestion('')
    setSending(true)

    const userMessage = {
      id: Date.now(),
      role: 'USER',
      content: cau,
      createdAt: new Date(),
    }

    setMessages(p => [...p, userMessage])

    try {
      const { data } = await chatApi.hoiDap(currentSession.id, { message: cau })
      const { assistantMessage } = data.data

      setMessages(p => [...p, assistantMessage])

      if (messages.length === 0) {
        setSessions(p => p.map(s => s.id === currentSession.id
          ? { ...s, title: cau.slice(0, 40) }
          : s
        ))
      }
    } catch {
      toast.error('AI không phản hồi, kiểm tra LM Studio')
    } finally {
      setSending(false)
    }
  }

  const send = () => sendContent(question)

  const startRecording = async () => {
    if (isRecording || isRecognizing) return

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
        setRecording(false)

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        audioChunksRef.current = []

        if (blob.size === 0) {
          toast.error('Không thu được âm thanh')
          return
        }

        await recognizeAndFillChat(blob)
      }

      recorder.start()
      setRecording(true)
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

  const recognizeAndFillChat = async (blob) => {
    setRecognizing(true)

    try {
      const formData = new FormData()
      formData.append('file', blob, `chat-voice-${Date.now()}.webm`)

      const { data } = await chatApi.recognizeSpeech(formData)
      const transcript = data.data?.transcript?.trim()

      if (!transcript) {
        toast.error('Không nhận dạng được nội dung giọng nói')
        return
      }

      setQuestion(transcript)
      toast.success('Đã chuyển giọng nói thành văn bản')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể nhận dạng giọng nói')
    } finally {
      setRecognizing(false)
    }
  }

  const nhimEnter = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Hỏi đáp AI</span>
          <button
            className="btn-ghost"
            onClick={createSession}
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
                background: currentSession?.id === s.id
                  ? 'var(--bg-selected)'
                  : 'transparent',
              }}
              onClick={() => selectSession(s)}
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
                  deleteSession(s.id)
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
        {!currentSession ? (
          <EmptyState
            icon={IconMessages}
            title="Chọn hoặc tạo cuộc trò chuyện"
            desc="AI sẽ trả lời dựa trên ghi chú và tài liệu của bạn"
            action={
              <button className="btn-primary" onClick={createSession}>
                <IconPlus size={13} />
                Bắt đầu hỏi đáp
              </button>
            }
          />
        ) : (
          <>
            <div style={styles.messages}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
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
                        onClick={() => setQuestion(q)}
                        style={{ fontSize: 11 }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(t => <MessageBubble key={t.id} message={t} />)
              )}

              {isSending && (
                <div style={styles.typingRow}>
                  <div style={styles.aiAvatar}>
                    <Spinner size={12} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    AI đang trả lời...
                  </span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div style={styles.inputArea}>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={nhimEnter}
                placeholder={
                  isRecording
                    ? 'Đang ghi âm... bấm nút dừng để nhận dạng'
                    : isRecognizing
                      ? 'Đang chuyển giọng nói thành văn bản...'
                      : 'Nhập câu hỏi hoặc bấm micro để nói...'
                }
                style={styles.input}
                rows={2}
                disabled={isRecognizing}
              />

              <button
                className={isRecording ? 'btn-danger' : 'btn-ghost'}
                onClick={isRecording ? dungGhiAm : startRecording}
                disabled={isSending || isRecognizing}
                style={styles.voiceButton}
                title={isRecording ? 'Dừng ghi âm' : 'Ghi âm câu hỏi'}
              >
                {isRecording ? <IconPlayerStop size={15} /> : <IconMicrophone size={15} />}
                <span style={{ fontSize: 12 }}>
                  {isRecording ? 'Dừng' : isRecognizing ? 'Đang nghe...' : 'Nói'}
                </span>
              </button>

              <button
                className="btn-primary"
                onClick={send}
                disabled={!question.trim() || isSending || isRecognizing}
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
