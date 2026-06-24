import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

export default function Modal({ tieu_de, onDong, children, width = 480 }) {
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onDong()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onDong])

  return (
    <div style={styles.overlay} onClick={onDong}>
      <div style={{ ...styles.box, width }} onClick={e => e.stopPropagation()} className="fade-in">
        <div style={styles.header}>
          <span style={{ fontWeight: 500 }}>{tieu_de}</span>
          <button className="btn-ghost" onClick={onDong} style={{ padding: 4 }}>
            <IconX size={15} />
          </button>
        </div>
        <div style={{ padding: '14px 18px' }}>{children}</div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  box:     { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '.5px solid var(--border)' },
}
