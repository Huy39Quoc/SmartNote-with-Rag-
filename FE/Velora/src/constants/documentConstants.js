export const DOCUMENT_STATUS_CONFIG = {
    PENDING: { label: 'Chờ xử lý', color: 'var(--text-muted)' },
    PROCESSING: { label: 'Đang xử lý', color: 'var(--accent-amber)' },
    DONE: { label: 'Hoàn tất', color: 'var(--accent-green)' },
    SUCCESS: { label: 'Hoàn tất', color: 'var(--accent-green)' },
    FAILED: { label: 'Lỗi', color: 'var(--accent-red)' },
}

export const DOCUMENT_UPLOAD_ACCEPT = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/mp4': ['.m4a'],
    'audio/webm': ['.webm'],
    'audio/ogg': ['.ogg'],
}

export const DOCUMENT_UPLOAD_MAX_FILES = 5
