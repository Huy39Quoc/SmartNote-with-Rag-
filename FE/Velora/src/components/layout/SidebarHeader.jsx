import logo from '../../assets/logo.svg'

export default function SidebarHeader() {
  return (
    <div style={styles.header}>
      <img src={logo} alt="Velora" style={{ height: 22 }} />
    </div>
  )
}

const styles = {
  header: {
    padding: '14px 12px',
    borderBottom: '.5px solid var(--border)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
}
