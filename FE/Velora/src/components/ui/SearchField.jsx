import { IconSearch } from '@tabler/icons-react'

export default function SearchField({ value, onChange, placeholder, style }) {
    return (
        <div style={{ ...styles.wrapper, ...style }}>
            <IconSearch size={14} style={styles.icon} />
            <input
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                style={styles.input}
            />
        </div>
    )
}

const styles = {
    wrapper: { position: 'relative', marginBottom: 18 },
    icon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
    input: { width: '100%', height: 38, paddingLeft: 34, fontSize: 13, boxSizing: 'border-box' },
}
