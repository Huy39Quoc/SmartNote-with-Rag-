import { useEffect, useRef, useState } from 'react'
import {
  IconAlignCenter, IconAlignLeft, IconAlignRight, IconBold, IconDeviceFloppy,
  IconInfoCircle, IconItalic, IconRestore, IconRocket, IconUnderline,
} from '@tabler/icons-react'
import toast from 'react-hot-toast'
import adminApi from '../../lib/api/adminApi'
import Spinner from '../../components/ui/Spinner'
import Landing, { LANDING_DEFAULTS } from '../landing/Landing'

export default function LandingEditor() {
  const [content, setContent] = useState(LANDING_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedText, setSelectedText] = useState(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const selectionRef = useRef(null)
  const richTextRef = useRef({})

  useEffect(() => {
    adminApi.layLandingDraft()
      .then(({ data }) => setContent({ ...LANDING_DEFAULTS, ...(data.data || {}) }))
      .catch(() => toast.error('Không thể tải nội dung Landing Page'))
      .finally(() => setLoading(false))
  }, [])

  const setField = (field, value) => setContent(current => ({ ...current, [field]: value }))
  const setListItem = (list, index, field, value) => setContent(current => ({
    ...current, [list]: current[list].map((entry, i) => i === index ? { ...entry, [field]: value } : entry),
  }))
  const removeItem = (list, index) => setContent(current => ({ ...current, [list]: current[list].filter((_, i) => i !== index) }))
  const addFeature = () => setField('features', [...content.features, { icon: 'star', title: 'Tính năng mới', description: 'Bấm để sửa mô tả.' }])
  const addStep = () => setField('steps', [...content.steps, { number: String(content.steps.length + 1).padStart(2, '0'), title: 'Bước mới', description: 'Bấm để sửa mô tả.' }])

  const captureSelection = (key, element) => {
    setSelectedText(key)
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null
    selectionRef.current = { key, element, range }
  }
  const commitRichText = (key, html) => { richTextRef.current[key] = html }
  const restoreSelection = () => {
    const saved = selectionRef.current
    if (!saved?.range || saved.range.collapsed) {
      toast.error('Hãy bôi đen phần chữ muốn định dạng')
      return null
    }
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(saved.range)
    return saved
  }
  const syncRichText = saved => {
    richTextRef.current[saved.key] = saved.element.innerHTML
    captureSelection(saved.key, saved.element)
  }
  const command = (name, value = null) => {
    const saved = restoreSelection()
    if (!saved) return
    document.execCommand('styleWithCSS', false, true)
    document.execCommand(name, false, value)
    syncRichText(saved)
  }
  const cssCommand = (property, value) => {
    const saved = restoreSelection()
    if (!saved) return
    document.execCommand('styleWithCSS', false, false)
    document.execCommand('fontSize', false, '7')
    saved.element.querySelectorAll('font[size="7"]').forEach(node => {
      node.removeAttribute('size')
      node.style[property] = value
    })
    syncRichText(saved)
  }
  const resetSelection = () => command('removeFormat')

  const applyPendingRichText = source => {
    const result = structuredClone(source)
    Object.entries(richTextRef.current).forEach(([key, html]) => {
      const parts = key.split('.')
      if (parts.length === 1) result[key] = html
      else result[parts[0]][Number(parts[1])][parts[2]] = html
    })
    return result
  }
  const requestBody = () => {
    const prepared = applyPendingRichText(content)
    const { status, updatedAt, ...body } = prepared
    return body
  }
  const saveDraft = async (notify = true) => {
    setSaving(true)
    try {
      const { data } = await adminApi.luuLandingDraft(requestBody())
      richTextRef.current = {}
      setContent({ ...LANDING_DEFAULTS, ...(data.data || {}) })
      if (notify) toast.success('Đã lưu bản nháp')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lưu bản nháp thất bại')
      return false
    } finally { setSaving(false) }
  }
  const publish = async () => {
    if (!await saveDraft(false)) return
    setSaving(true)
    try { await adminApi.xuatBanLanding(); setConfirmPublish(false); toast.success('Đã xuất bản Landing Page') }
    catch (error) { toast.error(error.response?.data?.message || 'Xuất bản thất bại') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={styles.loading}><Spinner size={24} /></div>
  const editor = { setField, setListItem, removeItem, addFeature, addStep, captureSelection, commitRichText }

  return <div style={styles.editor}>
    <div style={styles.toolbar}>
      <div><strong style={styles.title}>Chỉnh sửa trực tiếp Landing Page</strong><span style={styles.hint}><IconInfoCircle size={13} /> Bôi đen chữ rồi chọn định dạng</span></div>
      <div style={styles.actions}><button onClick={() => saveDraft()} disabled={saving}><IconDeviceFloppy size={14} /> Lưu nháp</button><button className="btn-primary" onClick={() => setConfirmPublish(true)} disabled={saving}><IconRocket size={14} /> Xuất bản</button></div>
    </div>
    {selectedText && <FormattingToolbar name={selectedText} command={command} cssCommand={cssCommand} reset={resetSelection} />}
    <div style={styles.canvas}><Landing previewContent={content} editor={editor} /></div>
    {confirmPublish && <div style={styles.modalBackdrop} onMouseDown={() => !saving && setConfirmPublish(false)}>
      <div style={styles.modal} onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <div style={styles.modalIcon}><IconRocket size={22} /></div>
        <h3 id="publish-title" style={styles.modalTitle}>Xuất bản Landing Page?</h3>
        <p style={styles.modalText}>Nội dung hiện tại sẽ được lưu và thay thế phiên bản đang hiển thị trên trang chủ.</p>
        <div style={styles.modalActions}>
          <button onClick={() => setConfirmPublish(false)} disabled={saving}>Hủy</button>
          <button className="btn-primary" onClick={publish} disabled={saving}><IconRocket size={14} /> {saving ? 'Đang xuất bản...' : 'Xác nhận xuất bản'}</button>
        </div>
      </div>
    </div>}
  </div>
}

function FormattingToolbar({ name, command, cssCommand, reset }) {
  return <div style={styles.formatBar}>
    <span style={styles.selectionName}>Đang chọn: {name}</span>
    <label style={styles.control}>Màu <input type="color" defaultValue="#e8e6de" onChange={e => command('foreColor', e.target.value)} style={styles.color} /></label>
    <label style={styles.control}>Cỡ <input type="number" min="10" max="96" defaultValue="16" onChange={e => cssCommand('fontSize', `${e.target.value}px`)} style={styles.number} /></label>
    <label style={styles.control}>Font <select defaultValue="Inter" onChange={e => command('fontName', e.target.value)} style={styles.select}>{['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Courier New'].map(font => <option key={font}>{font}</option>)}</select></label>
    <div style={styles.group}><Tool title="Đậm" click={() => command('bold')}><IconBold size={14} /></Tool><Tool title="Nghiêng" click={() => command('italic')}><IconItalic size={14} /></Tool><Tool title="Gạch chân" click={() => command('underline')}><IconUnderline size={14} /></Tool></div>
    <div style={styles.group}><Tool title="Căn trái" click={() => command('justifyLeft')}><IconAlignLeft size={14} /></Tool><Tool title="Căn giữa" click={() => command('justifyCenter')}><IconAlignCenter size={14} /></Tool><Tool title="Căn phải" click={() => command('justifyRight')}><IconAlignRight size={14} /></Tool></div>
    <label style={styles.control}>Dòng <input type="number" min="0.8" max="3" step="0.1" defaultValue="1.5" onChange={e => cssCommand('lineHeight', e.target.value)} style={styles.number} /></label>
    <label style={styles.control}>Chữ <input type="number" min="-3" max="20" step="0.5" defaultValue="0" onChange={e => cssCommand('letterSpacing', `${e.target.value}px`)} style={styles.number} /></label>
    <button onClick={reset}><IconRestore size={14} /> Mặc định</button>
  </div>
}
function Tool({ title, click, children }) { return <button title={title} onMouseDown={event => event.preventDefault()} onClick={click} style={styles.tool}>{children}</button> }

const styles = {
  editor: { width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#090d0b' }, toolbar: { flexShrink: 0, minHeight: 58, padding: '9px 14px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', zIndex: 5 },
  title: { display: 'block', fontSize: 13 }, hint: { display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }, actions: { display: 'flex', gap: 7 }, canvas: { flex: 1, minHeight: 0, overflow: 'hidden', border: '6px solid #090d0b' },
  formatBar: { flexShrink: 0, padding: '7px 10px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', zIndex: 6 }, selectionName: { color: 'var(--accent-blue-dim)', fontSize: 10, fontFamily: 'var(--font-mono)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' },
  control: { display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 10 }, color: { width: 30, height: 26, padding: 2 }, number: { width: 55, height: 28, padding: '4px 5px', fontSize: 11 }, select: { width: 112, height: 28, padding: '4px 5px', fontSize: 11 }, group: { display: 'flex', gap: 2 }, tool: { width: 28, height: 28, padding: 5, justifyContent: 'center' }, loading: { padding: 40, display: 'flex', justifyContent: 'center' },
  modalBackdrop: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' },
  modal: { width: '100%', maxWidth: 430, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: '0 24px 80px rgba(0,0,0,.55)', textAlign: 'center' },
  modalIcon: { width: 48, height: 48, margin: '0 auto 14px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue-dim)', background: 'var(--bg-ai)', border: '1px solid var(--border-blue)' },
  modalTitle: { fontSize: 18, marginBottom: 8 }, modalText: { color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }, modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
}
