import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import AppHeader from './AppHeader'
import AppFooter from './AppFooter'

export default function MainLayout() {
    return (
        <div style={styles.layout}>
            <Sidebar />

            <main style={styles.main}>
                <AppHeader />

                <section style={styles.content}>
                    <Outlet />
                </section>

                <AppFooter />
            </main>
        </div>
    )
}

const styles = {
    layout: {
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
    },

    main: {
        flex: 1,
        minWidth: 0,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-main, transparent)',
    },

    content: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
}
