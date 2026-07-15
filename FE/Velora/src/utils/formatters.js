export const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const parseLocalDate = (value) => {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

    const normalizedValue = typeof value === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
        ? `${value}Z`
        : value
    const date = new Date(normalizedValue)

    return Number.isNaN(date.getTime()) ? null : date
}

export const formatLocalDate = (value, options = {}) => {
    if (!value) return ''

    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }

    try {
        return new Date(value).toLocaleDateString('vi-VN', { ...defaultOptions, ...options })
    } catch {
        return ''
    }
}
