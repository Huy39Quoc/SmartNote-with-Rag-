export const FEATURE_LABELS = {
    TAG_SUBJECT: 'Tag môn học / chủ đề',
    CHECKLIST_BASIC: 'Checklist công việc cơ bản',
    AI_NOTE_FORMAT: 'AI format ghi chú',
    AI_SUMMARY_BASIC: 'Tóm tắt AI cơ bản',
    AI_SUMMARY_ADVANCED: 'Tóm tắt & phân tích AI nâng cao',
    AI_CHAT: 'Hỏi đáp AI với ghi chú / tài liệu',
    AI_ANALYZE: 'AI phân tích tài liệu',
    DOCUMENT_UPLOAD: 'Upload tài liệu',
    EXTRACT_SCHEDULE: 'AI trích xuất deadline từ ghi chú',
    AI_FLASHCARD: 'Flashcard AI tự động',
    DEADLINE_MANAGEMENT: 'Quản lý deadline thông minh',
    PRIORITY_SUGGESTION: 'Gợi ý ưu tiên công việc',
    EXPORT_FILE: 'Export PDF / Word',
    TEAM_WORK: 'Học nhóm & chia sẻ ghi chú',
    AI_PROGRESS_ANALYTICS: 'AI phân tích tiến độ học tập',
    TEAM_DASHBOARD: 'Dashboard tiến độ nhóm',
    GOOGLE_CALENDAR: 'Tích hợp Google Calendar',
    MANAGE_MEMBERS: 'Quản lý thành viên nhóm',
    CUSTOM_WORKSPACE: 'Custom workspace theo nhóm',
    PRIORITY_SUPPORT: 'Ưu tiên hỗ trợ khách hàng',
}

export const parsePackageFeatures = (nguoiDung) => {
    const raw = nguoiDung?.packageFeatures || ''

    return raw
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
}

export const hasFeature = (nguoiDung, featureCode) => {
    if (!nguoiDung || !featureCode) {
        return false
    }

    const packageName =
        nguoiDung.packageName ||
        nguoiDung.currentPackageName ||
        nguoiDung.package?.name ||
        nguoiDung.currentPackage?.name ||
        'FREE'

    if (packageName.toUpperCase() === 'PLUS') {
        return true
    }

    const rawFeatures =
        nguoiDung.features ||
        nguoiDung.packageFeatures ||
        nguoiDung.currentPackage?.features ||
        nguoiDung.package?.features ||
        ''

    if (Array.isArray(rawFeatures)) {
        return rawFeatures
            .map(item => String(item).trim().toUpperCase())
            .includes(featureCode.toUpperCase())
    }

    if (typeof rawFeatures === 'string') {
        return rawFeatures
            .split(',')
            .map(item => item.trim().toUpperCase())
            .includes(featureCode.toUpperCase())
    }

    return false
}

export const hasAllFeatures = (nguoiDung, featureCodes = []) => {
    return featureCodes.every(code => hasFeature(nguoiDung, code))
}

export const getFeatureLabel = (featureCode) => {
    return FEATURE_LABELS[featureCode] || featureCode
}

export const getUpgradeMessage = (featureCode) => {
    const label = getFeatureLabel(featureCode)
    return `Tính năng "${label}" chỉ có ở gói cao hơn. Vui lòng nâng cấp để sử dụng.`
}