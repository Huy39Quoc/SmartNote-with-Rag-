export default function AppFooter() {
    return (
        <footer
            className="flex items-center justify-between gap-2.5 px-4 shrink-0"
            style={{
                height: 32,
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-faint)',
                fontSize: 10.5,
            }}
        >
            <div className="whitespace-nowrap" style={{ fontWeight: 600 }}>
                Velora SmartNote
            </div>

            <div className="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                AI Notes · RAG Chat · Speech to Text · Knowledge Grouping
            </div>

            <div className="whitespace-nowrap">
                Student Learning Workspace
            </div>
        </footer>
    )
}
