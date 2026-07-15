import {
    IconBell, IconBrain, IconCalendar, IconFileText, IconFolderShare,
    IconLayoutDashboard, IconMessages, IconNotes, IconPackage, IconShare,
    IconShield, IconSparkles, IconUser,
} from '@tabler/icons-react'

export const SIDEBAR_MENU = [
    { to: '/overview', label: 'Tổng quan', icon: IconLayoutDashboard },
    { to: '/service-packages', label: 'Gói Premium', icon: IconSparkles },
    { to: '/notes', label: 'Ghi chú', icon: IconNotes },
    { to: '/shared-notes', label: 'Ghi chú được chia sẻ', icon: IconShare },
    { to: '/chat', label: 'Hỏi đáp AI', icon: IconMessages },
    { to: '/documents', label: 'Tài liệu', icon: IconFileText },
    { to: '/shared-documents', label: 'Tài liệu được chia sẻ', icon: IconFolderShare },
    { to: '/schedule', label: 'Lịch & Deadline', icon: IconCalendar },
    { to: '/knowledge', label: 'Kiến thức', icon: IconBrain },
    { to: '/account', label: 'Tài khoản', icon: IconUser },
    { to: '/notifications', label: 'Thông báo', icon: IconBell },
]

export const COMPACT_SIDEBAR_MENU = [
    { to: '/overview', label: 'Tổng quan', icon: IconLayoutDashboard },
    { to: '/service-packages', label: 'Gói Premium', icon: IconPackage },
    { to: '/notes', label: 'Ghi chú', icon: IconNotes },
    { to: '/shared-notes', label: 'Được chia sẻ', icon: IconShare },
    { to: '/chat', label: 'Hỏi đáp AI', icon: IconMessages },
    { to: '/documents', label: 'Tài liệu', icon: IconFileText },
    { to: '/shared-documents', label: 'TL được chia sẻ', icon: IconShare },
    { to: '/schedule', label: 'Lịch & Deadline', icon: IconCalendar },
    { to: '/knowledge', label: 'Kiến thức', icon: IconShare },
    { to: '/account', label: 'Tài khoản', icon: IconUser },
    { to: '/notifications', label: 'Thông báo', icon: IconBell },
]

export const PAGE_METADATA = [
    { test: path => path === '/overview', title: 'Tổng quan', desc: 'Theo dõi nhanh hoạt động học tập, ghi chú và tài liệu', icon: IconLayoutDashboard },
    { test: path => path === '/notes', title: 'Ghi chú', desc: 'Quản lý, soạn thảo và nâng cấp ghi chú bằng AI', icon: IconNotes },
    { test: path => /^\/notes\/[^/]+$/.test(path), title: 'Chi tiết ghi chú', desc: 'Chỉnh sửa nội dung, định dạng, chia sẻ và tạo sơ đồ từ ghi chú', icon: IconNotes },
    { test: path => /^\/notes\/[^/]+\/flashcards$/.test(path), title: 'Flashcards AI', desc: 'Tạo flashcard tự động từ nội dung ghi chú', icon: IconBrain },
    { test: path => path === '/shared-notes', title: 'Ghi chú được chia sẻ', desc: 'Các ghi chú người khác đã chia sẻ với bạn', icon: IconShare },
    { test: path => path === '/chat', title: 'Hỏi đáp AI', desc: 'Trò chuyện với AI dựa trên ghi chú và tài liệu học tập', icon: IconMessages },
    { test: path => path === '/documents', title: 'Tài liệu', desc: 'Upload, phân tích, tóm tắt và hỏi đáp với tài liệu', icon: IconFileText },
    { test: path => path === '/shared-documents', title: 'Tài liệu được chia sẻ', desc: 'Các tài liệu được chia sẻ cho bạn', icon: IconFolderShare },
    { test: path => path === '/schedule', title: 'Lịch & Deadline', desc: 'Quản lý lịch học, deadline và nhắc nhở thông minh', icon: IconCalendar },
    { test: path => path === '/knowledge', title: 'Nhóm kiến thức', desc: 'Phân loại ghi chú bằng AI và đánh giá AI đúng hay sai', icon: IconBrain },
    { test: path => path === '/knowledge/graph', title: 'Bản đồ tri thức', desc: 'AI kết nối các ghi chú và tài liệu liên quan bằng ngữ nghĩa (RAG)', icon: IconBrain },
    { test: path => path === '/account', title: 'Tài khoản', desc: 'Quản lý thông message cá nhân và gói sử dụng', icon: IconUser },
    { test: path => path === '/notifications', title: 'Thông báo', desc: 'Theo dõi nhắc nhở, deadline và cập nhật hệ thống', icon: IconBell },
    { test: path => path === '/service-packages', title: 'Gói Premium', desc: 'Nâng cấp để mở khóa thêm tính năng AI', icon: IconSparkles },
    { test: path => path === '/admin', title: 'Quản trị hệ thống', desc: 'Theo dõi người dùng, doanh thu và hoạt động hệ thống', icon: IconShield },
    { test: path => path === '/admin/service-packages', title: 'Quản lý gói dịch vụ', desc: 'Cấu hình quyền lợi, giá và giới hạn sử dụng của từng gói', icon: IconShield },
]
