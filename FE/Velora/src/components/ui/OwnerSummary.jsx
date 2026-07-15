export default function OwnerSummary({ name, email }) {
    const initial = name?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || 'U'

    return (
        <div style={styles.wrapper}>
            <div style={styles.avatar}>{initial}</div>
            <div style={styles.details}>
                <div style={styles.name}>{name || 'Người dùng'}</div>
                <div style={styles.email}>{email}</div>
            </div>
        </div>
    )
}

const styles = {
    wrapper: { display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--bg-elevated)', border: '.5px solid var(--border)', borderRadius: 8 },
    avatar: { width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-ai)', color: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
    details: { flex: 1, minWidth: 0 },
    name: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    email: { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 },
}
