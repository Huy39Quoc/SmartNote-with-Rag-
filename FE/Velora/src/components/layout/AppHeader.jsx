import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
    IconBell,
    IconBrain,
    IconCalendar,
    IconFileText,
    IconFolderShare,
    IconLayoutDashboard,
    IconMessages,
    IconNotes,
    IconShare,
    IconShield,
    IconSparkles,
    IconUser,
} from '@tabler/icons-react'

const PAGE_META = [
    {
        test: pathname => pathname === '/overview',
        title: 'Tổng quan',
        desc: 'Theo dõi nhanh hoạt động học tập, ghi chú và tài liệu',
        icon: IconLayoutDashboard,
    },
    {
        test: pathname => pathname === '/notes',
        title: 'Ghi chú',
        desc: 'Quản lý, soạn thảo và nâng cấp ghi chú bằng AI',
        icon: IconNotes,
    },
    {
        test: pathname => /^\/notes\/[^/]+$/.test(pathname),
        title: 'Chi tiết ghi chú',
        desc: 'Chỉnh sửa nội dung, định dạng, chia sẻ và tạo sơ đồ từ ghi chú',
        icon: IconNotes,
    },
    {
        test: pathname => /^\/notes\/[^/]+\/flashcards$/.test(pathname),
        title: 'Flashcards AI',
        desc: 'Tạo flashcard tự động từ nội dung ghi chú',
        icon: IconBrain,
    },
    {
        test: pathname => pathname === '/shared-notes',
        title: 'Ghi chú được chia sẻ',
        desc: 'Các ghi chú người khác đã chia sẻ với bạn',
        icon: IconShare,
    },
    {
        test: pathname => pathname === '/chat',
        title: 'Hỏi đáp AI',
        desc: 'Trò chuyện với AI dựa trên ghi chú và tài liệu học tập',
        icon: IconMessages,
    },
    {
        test: pathname => pathname === '/documents',
        title: 'Tài liệu',
        desc: 'Upload, phân tích, tóm tắt và hỏi đáp với tài liệu',
        icon: IconFileText,
    },
    {
        test: pathname => pathname === '/shared-documents',
        title: 'Tài liệu được chia sẻ',
        desc: 'Các tài liệu được chia sẻ cho bạn',
        icon: IconFolderShare,
    },
    {
        test: pathname => pathname === '/schedule',
        title: 'Lịch & Deadline',
        desc: 'Quản lý lịch học, deadline và nhắc nhở thông minh',
        icon: IconCalendar,
    },
    {
        test: pathname => pathname === '/knowledge',
        title: 'Nhóm kiến thức',
        desc: 'Phân loại ghi chú bằng AI và đánh giá AI đúng hay sai',
        icon: IconBrain,
    },
    {
        test: pathname => pathname === '/knowledge/graph',
        title: 'Bản đồ tri thức',
        desc: 'AI kết nối các ghi chú và tài liệu liên quan bằng ngữ nghĩa (RAG)',
        icon: IconBrain,
    },
    {
        test: pathname => pathname === '/account',
        title: 'Tài khoản',
        desc: 'Quản lý thông message cá nhân và gói sử dụng',
        icon: IconUser,
    },
    {
        test: pathname => pathname === '/notifications',
        title: 'Thông báo',
        desc: 'Theo dõi nhắc nhở, deadline và cập nhật hệ thống',
        icon: IconBell,
    },
    {
        test: pathname => pathname === '/service-packages',
        title: 'Gói Premium',
        desc: 'Nâng cấp để mở khóa thêm tính năng AI',
        icon: IconSparkles,
    },
    {
        test: pathname => pathname === '/admin',
        title: 'Quản trị hệ thống',
        desc: 'Theo dõi người dùng, doanh thu và hoạt động hệ thống',
        icon: IconShield,
    },
    {
        test: pathname => pathname === '/admin/service-packages',
        title: 'Quản lý gói dịch vụ',
        desc: 'Cấu hình quyền lợi, giá và giới hạn sử dụng của từng gói',
        icon: IconShield,
    },
]

function getPageMeta(pathname) {
    return PAGE_META.find(item => item.test(pathname)) || {
        title: 'Velora',
        desc: 'Không gian học tập thông minh tích hợp AI',
        icon: IconSparkles,
    }
}

export default function AppHeader() {
    const location = useLocation()

    const meta = useMemo(
        () => getPageMeta(location.pathname),
        [location.pathname]
    )

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