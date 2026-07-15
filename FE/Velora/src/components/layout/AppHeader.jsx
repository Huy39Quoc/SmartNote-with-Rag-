import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { IconSparkles } from '@tabler/icons-react'
import { PAGE_METADATA } from '../../constants/layoutConstants'

function getPageMeta(pathname) {
    return PAGE_METADATA.find(item => item.test(pathname)) || {
        title: 'Velora',
        desc: 'Không gian học tập thông minh tích hợp AI',
        icon: IconSparkles,
    }
}

export default function AppHeader() {
    const location = useLocation()
    const meta = useMemo(() => getPageMeta(location.pathname), [location.pathname])
    const Icon = meta.icon

    return (
        <header
            className="flex items-center justify-between gap-3 px-5 shrink-0"
            style={{ height: 64, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 38, height: 38, background: 'var(--bg-ai)', color: 'var(--accent-blue)' }}
                >
                    <Icon size={19} />
                </div>

                <div className="min-w-0">
                    <h1
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}
                    >
                        {meta.title}
                    </h1>

                    <p
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', maxWidth: 680 }}
                    >
                        {meta.desc}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span
                    className="rounded-full whitespace-nowrap"
                    style={{
                        padding: '6px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        fontSize: 11.5,
                        fontWeight: 500,
                    }}
                >
                    SmartNote Workspace
                </span>
            </div>
        </header>
    )
}
