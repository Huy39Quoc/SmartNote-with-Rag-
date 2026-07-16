import { PERMISSION_BADGE_CONFIG } from '../../constants/uiConstants'

export default function PermissionBadge({ permission }) {
    const info = PERMISSION_BADGE_CONFIG[permission] || PERMISSION_BADGE_CONFIG.VIEW
    const Icon = info.icon

    return (
        <span className={`tag ${info.className}`} style={styles.badge}>
            <Icon size={11} />
            {info.label}
        </span>
    )
}

const styles = {
    badge: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, whiteSpace: 'nowrap' },
}
