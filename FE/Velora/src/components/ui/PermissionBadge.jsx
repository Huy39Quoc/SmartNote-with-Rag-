import { IconEdit, IconEye } from '@tabler/icons-react'

const PERMISSIONS = {
    EDIT: { label: 'Có thể chỉnh sửa', icon: IconEdit, className: 'tag-blue' },
    VIEW: { label: 'Chỉ xem', icon: IconEye, className: 'tag-dim' },
}

export default function PermissionBadge({ permission }) {
    const info = PERMISSIONS[permission] || PERMISSIONS.VIEW
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
