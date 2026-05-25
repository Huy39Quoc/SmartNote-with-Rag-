export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={36} style={{ opacity: .35 }} />}
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</p>
      {desc && <p style={{ fontSize: 12 }}>{desc}</p>}
      {action}
    </div>
  )
}
