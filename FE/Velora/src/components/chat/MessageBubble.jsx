import { IconRobot, IconUser } from '@tabler/icons-react'

export default function MessageBubble({ message }) {
  const isAi = message.role === 'ASSISTANT'

  return (
    <div style={{ ...styles.wrap, flexDirection: isAi ? 'row' : 'row-reverse' }}>
      <div style={{ ...styles.avatar, background: isAi ? 'var(--bg-ai)' : 'var(--bg-elevated)' }}>
        {isAi ? <IconRobot size={13} style={{ color: 'var(--accent-blue-dim)' }} />
               : <IconUser size={13} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div style={{ maxWidth: '72%' }}>
        <div style={{ ...styles.bubble, background: isAi ? 'var(--bg-surface)' : 'var(--bg-ai)', border: '.5px solid var(--border)', borderRadius: isAi ? '2px 8px 8px 8px' : '8px 2px 8px 8px' }}>
          <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontSize: 13 }}>{message.content}</p>
        </div>
        {isAi && message.sourceChunks?.filter(Boolean).length > 0 && (
          <div style={styles.source}>
            <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>Nguồn: </span>
            {message.sourceChunks.filter(Boolean).slice(0, 2).map((c, i) => (
              <span key={i} className="tag tag-dim" style={{ fontSize: 9, marginLeft: 3 }}>đoạn {i + 1}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, textAlign: isAi ? 'left' : 'right' }}>
          {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap:   { display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-start' },
  avatar: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  bubble: { padding: '9px 13px' },
  source:  { display: 'flex', alignItems: 'center', marginTop: 4 },
}
