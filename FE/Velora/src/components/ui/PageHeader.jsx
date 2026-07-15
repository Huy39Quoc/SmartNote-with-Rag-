export default function PageHeader({ icon: Icon, title, description, action }) {
    return (
        <div style={styles.header}>
            <div>
                <h2 style={styles.title}>
                    {Icon && <Icon size={20} />}
                    {title}
                </h2>
                {description && <p style={styles.description}>{description}</p>}
            </div>
            {action && <div style={styles.action}>{action}</div>}
        </div>
    )
}

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
    title: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
    description: { color: 'var(--text-muted)', fontSize: 13, marginTop: 6, lineHeight: 1.5, maxWidth: 640 },
    action: { flexShrink: 0 },
}
