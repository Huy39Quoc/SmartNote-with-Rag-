export default function AppFooter() {
    return (
        <footer style={styles.footer}>
            <div style={styles.left}>
                Velora SmartNote
            </div>

            <div style={styles.center}>
                AI Notes · RAG Chat · Speech to Text · Knowledge Grouping
            </div>

            <div style={styles.right}>
                Student Learning Workspace
            </div>
        </footer>
    )
}

const styles = {
    footer: {
        height: 28,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '0 14px',
        background: 'var(--bg-surface)',
        borderTop: '.5px solid var(--border)',
        color: 'var(--text-faint)',
        fontSize: 10,
    },

    left: {
        whiteSpace: 'nowrap',
        fontWeight: 500,
    },

    center: {
        flex: 1,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    right: {
        whiteSpace: 'nowrap',
    },
}