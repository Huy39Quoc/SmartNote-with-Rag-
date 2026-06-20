import { useState } from 'react'
import { IconSparkles, IconX, IconCheck, IconLoader2 } from '@tabler/icons-react'
import noteApi from '../../lib/api/noteApi'
import toast from 'react-hot-toast'

const HANH_DONG = [
  { key: 'SUMMARIZE',      nhan: 'Tóm tắt' },
  { key: 'STRUCTURE',      nhan: 'Cải thiện cấu trúc' },
  { key: 'CREATE_CHECKLIST', nhan: 'Tạo checklist' },
  { key: 'SUGGEST_TITLE',  nhan: 'Đề xuất tiêu đề' },
]

export default function AiPanel({ noteId, content, title, onApply, onDong }) {
  const [loading, setLoading] = useState(false)
  const [ketQua, setKetQua] = useState(null)
  const [hanhDong, setHanhDong] = useState('SUMMARIZE')
    const [cards, setCards] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

  const xuLy = async () => {
    if (!content?.trim()) { toast.error('Ghi chú đang trống'); return }
    setLoading(true); setKetQua(null)
    try {
      const { data } = await noteApi.caiThienAi(noteId, { content, title, action: hanhDong })
      setKetQua(data.data)
    } catch { toast.error('AI không phản hồi, thử lại sau') }
    setLoading(false)
  }

    const apDung = () => {
        if (!ketQua) return

        onApply?.(ketQua)
        onDong?.()
        toast.success('Đã áp dụng gợi ý AI')
    }
    const boQua = () => {
        setKetQua(null)
    }
    const handleGenerateFlashcards = async () => {
        setLoading(true);
        try {
            const response = await flashcardApi.generate(noteId);
            setCards(response.data);
            setIsModalOpen(true);
        } catch (error) {
            alert("Không thể tạo flashcard: " + error.message);
        } finally {
            setLoading(false);
        }
    };
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
  

        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconSparkles size={13} style={{ color: 'var(--accent-blue-dim)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Trợ lý AI</span>
        </span>
        <button className="btn-ghost" onClick={onDong} style={{ padding: 3 }}>
          <IconX size={13} />
        </button>
      </div>

      <div style={styles.body}>
        {/* Chọn hành động */}
        <div style={styles.actions}>
          {HANH_DONG.map(h => (
            <button key={h.key}
              onClick={() => { setHanhDong(h.key); setKetQua(null) }}
              className={hanhDong === h.key ? 'btn-ai' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '3px 9px' }}>
              {h.nhan}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={xuLy} disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '7px', fontSize: 12 }}>
          {loading ? <><div className="spinner" style={{ width: 12, height: 12 }} />Đang xử lý...</> : '▶ Chạy AI'}
        </button>

        {/* Kết quả */}
        {ketQua && (
          <div style={styles.result}>
            {ketQua.suggestedTitle && (
              <div style={{ marginBottom: 8 }}>
                <div style={styles.resultLabel}>Tiêu đề gợi ý</div>
                <div style={styles.resultText}>{ketQua.suggestedTitle}</div>
              </div>
            )}
            {ketQua.summary && (
              <div style={{ marginBottom: 8 }}>
                <div style={styles.resultLabel}>Tóm tắt</div>
                <div style={styles.resultText}>{ketQua.summary}</div>
              </div>
            )}
            {ketQua.checklist?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={styles.resultLabel}>Checklist</div>
                {ketQua.checklist.map((c, i) => (
                  <div key={i} style={styles.checkItem}>☐ {c}</div>
                ))}
              </div>
            )}
            {ketQua.improvedContent && (
              <div style={{ marginBottom: 8 }}>
                <div style={styles.resultLabel}>Nội dung đã cải thiện</div>
                <div style={{ ...styles.resultText, maxHeight: 120, overflow: 'auto' }}>{ketQua.improvedContent}</div>
              </div>
            )}
            <button className="btn-primary" onClick={apDung}
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
              <IconCheck size={12} /> Áp dụng
            </button>
            {ketQua.improvedContent && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={apDung}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                  <IconCheck size={12} /> Chấp nhận AI
                </button>
                <button className="btn-ghost" onClick={boQua}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                  Giữ nguyên
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
  panel: { width: 260, background: 'var(--bg-surface)', borderLeft: '.5px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '.5px solid var(--border)' },
  body: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  result: { background: 'var(--bg-elevated)', borderRadius: 6, padding: 10, border: '.5px solid var(--border)' },
  resultLabel: { fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  resultText: { fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  checkItem: { fontSize: 12, padding: '2px 0', color: 'var(--text-secondary)' },
}
