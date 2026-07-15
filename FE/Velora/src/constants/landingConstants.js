import {
    IconCalendar,
    IconMessages,
    IconMicrophone,
    IconSitemap,
    IconSparkles,
    IconStar,
    IconUpload,
} from '@tabler/icons-react'

export const LANDING_DEFAULTS = {
    heroBadge: 'AI chạy hoàn toàn local · Dữ liệu bảo mật tuyệt đối',
    heroTitle: 'Ghi chú thông minh',
    heroHighlight: 'bằng sức mạnh AI',
    heroDescription: 'Velora giúp sinh viên và người đi làm ghi chú, tổ chức kiến thức, quản lý deadline và hỏi đáp với tài liệu — tất cả nhờ AI chạy local, không lo lộ dữ liệu.',
    primaryButtonText: 'Dùng thử miễn phí',
    secondaryButtonText: 'Đăng nhập',
    featureSectionTitle: 'Đầy đủ tính năng',
    featureSectionDescription: 'Mọi thứ bạn cần để học tập và làm việc hiệu quả hơn',
    features: [
        { icon: 'sparkles', title: 'AI ghi chú thông minh', description: 'Tự động tóm tắt, cải thiện cấu trúc và đề xuất tiêu đề cho ghi chú của bạn.' },
        { icon: 'upload', title: 'Upload tài liệu & phân tích', description: 'Tải lên PDF, DOCX, TXT — AI đọc và trả lời câu hỏi về nội dung tài liệu.' },
        { icon: 'microphone', title: 'Ghi âm & phân tích', description: 'Upload file audio, nhận dạng tiếng Việt và tạo ghi chú có cấu trúc.' },
        { icon: 'messages', title: 'Hỏi đáp với ghi chú', description: 'Đặt câu hỏi về nội dung trong kho ghi chú và tài liệu của bạn.' },
        { icon: 'calendar', title: 'Quản lý deadline thông minh', description: 'AI tự động phát hiện deadline và sắp xếp theo mức độ ưu tiên.' },
        { icon: 'sitemap', title: 'Tổ chức kiến thức tự động', description: 'AI phân loại ghi chú theo chủ đề và gợi ý liên kết giữa các nội dung.' },
    ],
    stepSectionTitle: 'Cách hoạt động',
    stepSectionDescription: 'Bắt đầu trong vài phút',
    steps: [
        { number: '01', title: 'Tạo tài khoản', description: 'Đăng ký miễn phí, không cần thẻ tín dụng.' },
        { number: '02', title: 'Ghi chú hoặc upload', description: 'Tạo ghi chú, tải lên tài liệu hoặc ghi âm bài giảng.' },
        { number: '03', title: 'Để AI làm phần còn lại', description: 'Tóm tắt, phân tích và hỏi đáp với nội dung của bạn.' },
    ],
    ctaTitle: 'Sẵn sàng bắt đầu?',
    ctaDescription: 'Đăng ký ngay — hoàn toàn miễn phí, không yêu cầu thẻ tín dụng',
    ctaButtonText: 'Tạo tài khoản miễn phí',
    footerText: '© 2026 Velora · SmartNote with AI',
    textStyles: {},
}

export const LANDING_ICONS = {
    sparkles: IconSparkles,
    upload: IconUpload,
    microphone: IconMicrophone,
    messages: IconMessages,
    calendar: IconCalendar,
    sitemap: IconSitemap,
    star: IconStar,
}
