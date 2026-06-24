import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react'

export default function NoteCard({ note, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      ...styles.card,
      background: active ? 'var(--bg-selected)' : 'transparent',
      borderLeft: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
    }}>
      <div style={styles.title}>{note.title || 'Ghi chú không có tiêu đề'}</div>
      <div style={styles.preview}>{note.contentPreview || '—'}</div>
      <div style={styles.meta}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {note.tags?.slice(0, 3).map(t => (
            <span key={t.id} className="tag tag-dim" style={{ fontSize: 11 }}>{t.name}</span>
          ))}
        </div>
        {note.isBookmarked && <IconBookmarkFilled size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />}
      </div>
    </div>
  )
}

const styles = {
  card:    { padding: '8px 10px', cursor: 'pointer', borderRadius: 6, transition: 'background .12s' },
  title:   { fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  preview: { fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 },
  meta:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
}
