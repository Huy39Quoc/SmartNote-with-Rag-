import {
    IconBell,
    IconBrain,
    IconChartBar,
    IconHomeEdit,
    IconReceipt,
    IconUsers,
} from '@tabler/icons-react'

export const ADMIN_TABS = [
    { key: 'stats', label: 'Thống kê', icon: IconChartBar },
    { key: 'users', label: 'Người dùng', icon: IconUsers },
    { key: 'prompt', label: 'System Prompt', icon: IconBrain },
    { key: 'notifications', label: 'Thông báo', icon: IconBell },
    { key: 'landing', label: 'Trang chủ', icon: IconHomeEdit },
    { key: 'transactions', label: 'Giao dịch', icon: IconReceipt },
]

export const TRANSACTION_STATUSES = [
    '',
    'PENDING',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED',
]

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

export const DEFAULT_TRANSACTION_FILTERS = {
    status: '',
    keyword: '',
    from: monthAgo,
    to: today,
}

export const DEFAULT_PACKAGE_FORM = {
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    description: '',
    maxNotes: -1,
    maxAiFormatsPerMonth: -1,
    storageGb: 0,
    maxDevices: -1,
    features: [],
}
