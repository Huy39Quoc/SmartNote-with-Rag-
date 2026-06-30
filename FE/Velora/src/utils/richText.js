const ALLOWED_TAGS = new Set([
    'B',
    'I',
    'U',
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
    'H1',
    'H2',
    'H3',
    'BLOCKQUOTE',
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
    '#e8e6de',
    '#ffffff',
    '#f87171',
    '#fb923c',
    '#facc15',
    '#4ade80',
    '#38bdf8',
    '#a78bfa',
    '#f472b6',
])

function decodeBasicEntities(value = '') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
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
