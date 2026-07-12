const ALLOWED_TAGS = new Set([
    'B',
    'I',
    'U',
    'S',
    'STRONG',
    'EM',
    'FONT',
    'SPAN',
    'P',
    'DIV',
    'BR',
    'UL',
    'OL',
    'LI',
    'LABEL',
    'INPUT',
    'H1',
    'H2',
    'H3',
    'BLOCKQUOTE',
    'A',
    'IMG',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TH',
    'TD',
])

function normalizeColor(value = '') {
    const color = value.trim().toLowerCase()
    const rgbMatch = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/)

    if (!rgbMatch) return color

    return rgbMatch
        .slice(1)
        .map(part => Number(part).toString(16).padStart(2, '0'))
        .join('')
        .replace(/^/, '#')
}

const ALLOWED_COLORS = new Set([
    '#000000',
    '#111827',
    '#374151',
    '#6b7280',
    '#e8e6de',
    '#ffffff',

    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#22c55e',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',

    '#f87171',
    '#fb923c',
    '#facc15',
    '#4ade80',
    '#38bdf8',
    '#a78bfa',
    '#f472b6',
])
const ALLOWED_FONT_SIZES = new Set([
    '12px',
    '14px',
    '16px',
    '18px',
    '20px',
    '24px',
    '32px',
])

const ALLOWED_FONT_FAMILIES = new Map([
    ['inter, sans-serif', 'Inter, sans-serif'],
    ['arial, sans-serif', 'Arial, sans-serif'],
    ['times new roman, serif', '"Times New Roman", serif'],
    ['georgia, serif', 'Georgia, serif'],
    ['courier new, monospace', '"Courier New", monospace'],
])

function normalizeFontSize(value = '') {
    const size = value.trim().toLowerCase()
    return ALLOWED_FONT_SIZES.has(size) ? size : ''
}

function normalizeFontFamily(value = '') {
    return value
        .trim()
        .replace(/["']/g, '')
        .replace(/\s*,\s*/g, ', ')
        .toLowerCase()
}
const ALLOWED_TEXT_ALIGN = new Set(['left', 'center', 'right', 'justify'])

function decodeBasicEntities(value = '') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
}

function isSafeUrl(value = '') {
    const url = value.trim()
    return /^(https?:|mailto:|tel:)/i.test(url)
}

function isSafeImageSrc(value = '') {
    const src = value.trim()
    return /^(https?:|data:image\/(?:png|jpe?g|gif|webp);base64,)/i.test(src)
}

export function sanitizeRichText(html = '') {
    if (typeof window === 'undefined') return html || ''

    const template = document.createElement('template')
    const source = decodeBasicEntities(html || '')
    const hasTags = /<\/?[a-z][\s\S]*>/i.test(source)

    template.innerHTML = hasTags
        ? source
        : source
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\r?\n/g, '<br>')

    const cleanNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.cloneNode()
        if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('')

        if (!ALLOWED_TAGS.has(node.tagName)) {
            const fragment = document.createDocumentFragment()
            node.childNodes.forEach(child => fragment.appendChild(cleanNode(child)))
            return fragment
        }

        const clean = document.createElement(node.tagName === 'FONT' ? 'span' : node.tagName.toLowerCase())

        if (node.tagName === 'SPAN' || node.tagName === 'FONT') {
            const color = normalizeColor(node.style.color || node.getAttribute('color') || '')
            if (ALLOWED_COLORS.has(color)) {
                clean.style.color = color
            }

            const fontSize = normalizeFontSize(node.style.fontSize || '')
            if (fontSize) {
                clean.style.fontSize = fontSize
            }

            const fontFamilyKey = normalizeFontFamily(node.style.fontFamily || '')
            const safeFontFamily = ALLOWED_FONT_FAMILIES.get(fontFamilyKey)
            if (safeFontFamily) {
                clean.style.fontFamily = safeFontFamily
            }
        }

        if (
            ['P', 'DIV', 'H1', 'H2', 'H3', 'TH', 'TD'].includes(node.tagName) &&
            ALLOWED_TEXT_ALIGN.has((node.style.textAlign || '').toLowerCase())
        ) {
            clean.style.textAlign = node.style.textAlign.toLowerCase()
        }

        if (node.tagName === 'A') {
            const href = node.getAttribute('href') || ''
            if (isSafeUrl(href)) {
                clean.setAttribute('href', href.trim())
                clean.setAttribute('target', '_blank')
                clean.setAttribute('rel', 'noopener noreferrer')
            }
        }

        if (node.tagName === 'IMG') {
            const src = node.getAttribute('src') || ''
            const alt = node.getAttribute('alt') || ''

            if (isSafeImageSrc(src)) {
                clean.setAttribute('src', src.trim())
                if (alt) clean.setAttribute('alt', alt.slice(0, 200))
            }
        }

        if (node.tagName === 'UL' && node.getAttribute('data-type') === 'taskList') {
            clean.setAttribute('data-type', 'taskList')
        }

        if (node.tagName === 'LI' && node.getAttribute('data-type') === 'taskItem') {
            clean.setAttribute('data-type', 'taskItem')
            const checked = node.getAttribute('data-checked')
            clean.setAttribute('data-checked', checked === '' || checked === 'true' ? 'true' : 'false')
        }

        if (node.tagName === 'INPUT') {
            // Chỉ cho phép checkbox của checklist, không cho phép loại input khác
            // (tránh chèn form field tuỳ ý qua nội dung ghi chú).
            if (node.getAttribute('type') !== 'checkbox') {
                return document.createTextNode('')
            }
            clean.setAttribute('type', 'checkbox')
            clean.setAttribute('disabled', 'disabled')
            if (node.hasAttribute('checked')) {
                clean.setAttribute('checked', 'checked')
            }
        }

        node.childNodes.forEach(child => clean.appendChild(cleanNode(child)))
        return clean
    }

    const fragment = document.createDocumentFragment()
    template.content.childNodes.forEach(node => fragment.appendChild(cleanNode(node)))

    const container = document.createElement('div')
    container.appendChild(fragment)
    return container.innerHTML
}

export function richTextToPlainText(html = '') {
    if (typeof window === 'undefined') {
        return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    const template = document.createElement('template')
    template.innerHTML = sanitizeRichText(html || '')
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim()
}

export function hasRichTextContent(html = '') {
    return richTextToPlainText(html).length > 0
}
