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
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {note.tags?.slice(0, 3).map(t => (
            <span key={t.id} className="tag tag-dim" style={{ fontSize: 10 }}>{t.name}</span>
          ))}
        </div>
        {note.isBookmarked && <IconBookmarkFilled size={12} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />}
      </div>
    </div>
  )
}

const styles = {
  card:    { padding: '10px 12px', cursor: 'pointer', borderRadius: 4, transition: 'background .1s' },
  title:   { fontSize: 12, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  preview: { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 },
  meta:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
}
