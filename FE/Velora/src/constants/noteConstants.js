export const AI_NOTE_ACTIONS = [
    { key: 'SUMMARIZE', label: 'Tóm tắt', features: ['AI_SUMMARY_BASIC'] },
    { key: 'STRUCTURE', label: 'Cải thiện cấu trúc', features: ['AI_NOTE_FORMAT'] },
    { key: 'CREATE_CHECKLIST', label: 'Tạo checklist', features: ['AI_NOTE_FORMAT', 'CHECKLIST_BASIC'] },
    { key: 'SUGGEST_TITLE', label: 'Đề xuất tiêu đề', features: ['AI_NOTE_FORMAT'] },
]

export const DEFAULT_NOTE_TITLE = 'Ghi chú mới'

export const EDITOR_COLORS = [
    '#000000', '#111827', '#374151', '#6b7280', '#e8e6de', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f87171',
    '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6',
]

export const EDITOR_FONT_FAMILIES = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
]

export const EDITOR_FONT_SIZES = [
    { label: '12', value: '12px' }, { label: '14', value: '14px' },
    { label: '16', value: '16px' }, { label: '18', value: '18px' },
    { label: '20', value: '20px' }, { label: '24', value: '24px' },
    { label: '32', value: '32px' },
]

export const EDITOR_IMAGE_WIDTHS = [
    { label: 'Ảnh S', value: '240px' }, { label: 'Ảnh M', value: '320px' },
    { label: 'Ảnh L', value: '420px' }, { label: 'Ảnh XL', value: '560px' },
    { label: 'Full', value: '100%' },
]

export const EDITOR_PRESENCE_COLORS = [
    '#2563eb', '#16a34a', '#dc2626', '#9333ea',
    '#0891b2', '#ea580c', '#be123c', '#4f46e5',
]

export const TABLE_PICKER_ROWS = 8
export const TABLE_PICKER_COLUMNS = 10
export const DEFAULT_TABLE_ROW_HEIGHT = 40
export const MIN_TABLE_ROW_HEIGHT = 24
export const MAX_TABLE_ROW_HEIGHT = 240
