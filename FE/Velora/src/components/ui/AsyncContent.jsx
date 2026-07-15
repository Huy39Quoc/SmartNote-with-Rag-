import Spinner from './Spinner'
import EmptyState from './EmptyState'

export default function AsyncContent({ loading, empty, emptyState, children, loadingSize = 24 }) {
    if (loading) {
        return <div style={styles.loading}><Spinner size={loadingSize} /></div>
    }

    if (empty) {
        return (
            <div style={styles.empty}>
                <EmptyState {...emptyState} />
            </div>
        )
    }

    return children
}

const styles = {
    loading: { minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    empty: { minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 12 },
}
