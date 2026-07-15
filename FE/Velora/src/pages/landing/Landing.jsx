import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconSparkles, IconUpload, IconMessages, IconCalendar,
  IconSitemap, IconMicrophone, IconArrowRight, IconStar,
} from '@tabler/icons-react'
import logo from '../../assets/logo.svg'
import landingApi from '../../lib/api/landingApi'

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
  ctaDescription: 'Đăng ký date — hoàn toàn miễn phí, không yêu cầu thẻ tín dụng',
  ctaButtonText: 'Tạo tài khoản miễn phí',
  footerText: '© 2026 Velora · SmartNote with AI',
  textStyles: {},
}

const ICONS = {
  sparkles: IconSparkles, upload: IconUpload, microphone: IconMicrophone,
  messages: IconMessages, calendar: IconCalendar, sitemap: IconSitemap, star: IconStar,
}

export default function Landing({ previewContent = null, editor = null }) {
  const navigate = useNavigate()
  const [content, setContent] = useState(previewContent || LANDING_DEFAULTS)

  useEffect(() => {
    if (previewContent) {
      setContent({ ...LANDING_DEFAULTS, ...previewContent })
      return
    }
    landingApi.getPublishedContent()
      .then(({ data }) => setContent({ ...LANDING_DEFAULTS, ...(data.data || {}) }))
      .catch(() => setContent(LANDING_DEFAULTS))
  }, [previewContent])

  return (
    <div style={styles.wrap}>
      <nav style={styles.nav}>
        <img src={logo} alt="Velora" style={{ height: 26 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => !editor && navigate('/login')}><Editable value={content.secondaryButtonText} styleKey="secondaryButtonText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('secondaryButtonText', value)} /></button>
          <button className="btn-primary" onClick={() => !editor && navigate('/register')}><Editable value={content.primaryButtonText} styleKey="primaryButtonText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('primaryButtonText', value)} /></button>
        </div>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <section style={styles.hero}>
          <div style={styles.heroBadge}><IconSparkles size={12} /><Editable value={content.heroBadge} styleKey="heroBadge" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('heroBadge', value)} /></div>
          <h1 style={styles.heroTitle}><Editable value={content.heroTitle} styleKey="heroTitle" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('heroTitle', value)} /><br /><span style={{ color: 'var(--accent-blue)' }}><Editable value={content.heroHighlight} styleKey="heroHighlight" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('heroHighlight', value)} /></span></h1>
          <div style={styles.heroDesc}><Editable value={content.heroDescription} styleKey="heroDescription" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('heroDescription', value)} multiline /></div>
          <div style={styles.actions}>
            <button className="btn-primary" onClick={() => !editor && navigate('/register')} style={styles.primaryAction}>
              <Editable value={content.primaryButtonText} styleKey="primaryButtonText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('primaryButtonText', value)} /> <IconArrowRight size={15} />
            </button>
            <button className="btn-ghost" onClick={() => !editor && navigate('/login')} style={styles.secondaryAction}><Editable value={content.secondaryButtonText} styleKey="secondaryButtonText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('secondaryButtonText', value)} /></button>
          </div>
        </section>

        <section style={styles.section}>
          <SectionHeader title={content.featureSectionTitle} description={content.featureSectionDescription} editor={editor} textStyles={content.textStyles} titleField="featureSectionTitle" descriptionField="featureSectionDescription" />
          <div style={styles.featureGrid}>
            {(content.features || []).map((feature, index) => {
              const Icon = ICONS[feature.icon] || IconStar
              return <div key={index} style={{ ...styles.featureCard, ...(editor ? styles.editableCard : {}) }}>
                <div style={styles.featureIcon}><Icon size={18} /></div>
                {editor && <select value={feature.icon} onChange={event => editor.setListItem('features', index, 'icon', event.target.value)} style={styles.iconSelect}>{Object.keys(ICONS).map(icon => <option key={icon}>{icon}</option>)}</select>}
                <h3 style={styles.cardTitle}><Editable value={feature.title} styleKey={`features.${index}.title`} editor={editor} styles={content.textStyles} onChange={value => editor?.setListItem('features', index, 'title', value)} /></h3>
                <div style={styles.cardDescription}><Editable value={feature.description} styleKey={`features.${index}.description`} editor={editor} styles={content.textStyles} onChange={value => editor?.setListItem('features', index, 'description', value)} multiline /></div>
                {editor && <button className="btn-danger" onClick={() => editor.removeItem('features', index)} style={styles.removeButton}>Xóa</button>}
              </div>
            })}
          </div>
          {editor && <button onClick={() => editor.addFeature()} style={styles.addButton}>+ Thêm tính năng</button>}
        </section>

        <section style={{ ...styles.section, ...styles.stepsSection }}>
          <SectionHeader title={content.stepSectionTitle} description={content.stepSectionDescription} editor={editor} textStyles={content.textStyles} titleField="stepSectionTitle" descriptionField="stepSectionDescription" />
          <div style={styles.stepsGrid}>
            {(content.steps || []).map((step, index) => <div key={index} style={{ ...styles.stepCard, ...(editor ? styles.editableCard : {}) }}>
              <div style={styles.stepNo}><Editable value={step.number} styleKey={`steps.${index}.number`} editor={editor} styles={content.textStyles} onChange={value => editor?.setListItem('steps', index, 'number', value)} /></div>
              <h3 style={styles.stepTitle}><Editable value={step.title} styleKey={`steps.${index}.title`} editor={editor} styles={content.textStyles} onChange={value => editor?.setListItem('steps', index, 'title', value)} /></h3>
              <div style={styles.cardDescription}><Editable value={step.description} styleKey={`steps.${index}.description`} editor={editor} styles={content.textStyles} onChange={value => editor?.setListItem('steps', index, 'description', value)} multiline /></div>
              {editor && <button className="btn-danger" onClick={() => editor.removeItem('steps', index)} style={styles.removeButton}>Xóa</button>}
            </div>)}
          </div>
          {editor && <button onClick={() => editor.addStep()} style={styles.addButton}>+ Thêm bước</button>}
        </section>

        <section style={{ ...styles.section, textAlign: 'center' }}>
          <h2 style={styles.ctaTitle}><Editable value={content.ctaTitle} styleKey="ctaTitle" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('ctaTitle', value)} /></h2>
          <div style={styles.ctaDescription}><Editable value={content.ctaDescription} styleKey="ctaDescription" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('ctaDescription', value)} multiline /></div>
          <button className="btn-primary" onClick={() => !editor && navigate('/register')} style={styles.ctaButton}>
            <Editable value={content.ctaButtonText} styleKey="ctaButtonText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('ctaButtonText', value)} /> <IconArrowRight size={15} />
          </button>
        </section>

        <footer style={styles.footer}>
          <img src={logo} alt="Velora" style={{ height: 22, opacity: .6 }} />
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}><Editable value={content.footerText} styleKey="footerText" editor={editor} styles={content.textStyles} onChange={value => editor?.setField('footerText', value)} /></div>
        </footer>
      </div>
    </div>
  )
}

function SectionHeader({ title, description, editor, textStyles, titleField, descriptionField }) {
  return <div style={styles.sectionHeader}><h2 style={styles.sectionTitle}><Editable value={title} styleKey={titleField} editor={editor} styles={textStyles} onChange={value => editor?.setField(titleField, value)} /></h2><div style={styles.sectionDescription}><Editable value={description} styleKey={descriptionField} editor={editor} styles={textStyles} onChange={value => editor?.setField(descriptionField, value)} /></div></div>
}

function Editable({ value, onChange, multiline = false, styleKey, editor, styles: textStyles = {} }) {
  const customStyle = textStyles?.[styleKey] || {}
  const renderedStyle = {
    ...customStyle,
    letterSpacing: customStyle.letterSpacing == null ? undefined : `${customStyle.letterSpacing}px`,
    display: customStyle.textAlign ? 'block' : 'inline-block',
    width: customStyle.textAlign ? '100%' : undefined,
  }
  if (!editor || !onChange) return <span style={renderedStyle} dangerouslySetInnerHTML={{ __html: value }} />
  return <span
    contentEditable
    suppressContentEditableWarning
    title="Bấm để chỉnh sửa"
    onFocus={event => editor?.captureSelection(styleKey, event.currentTarget)}
    onClick={event => { event.stopPropagation(); editor?.captureSelection(styleKey, event.currentTarget) }}
    onMouseUp={event => editor?.captureSelection(styleKey, event.currentTarget)}
    onKeyUp={event => editor?.captureSelection(styleKey, event.currentTarget)}
    onBlur={event => editor?.commitRichText(styleKey, event.currentTarget.innerHTML)}
    onKeyDown={event => { if (!multiline && event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
    style={{ ...styles.editableText, ...renderedStyle }}
    dangerouslySetInnerHTML={{ __html: value }}
  />
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 48px', borderBottom: '.5px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  hero: { padding: '72px 48px 60px', textAlign: 'center', maxWidth: 720, margin: '0 auto' },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-ai)', border: '.5px solid var(--border-blue)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--accent-blue-dim)', marginBottom: 24 },
  heroTitle: { fontSize: 40, fontWeight: 700, lineHeight: 1.2, marginBottom: 18, letterSpacing: '-0.5px' },
  heroDesc: { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  primaryAction: { padding: '11px 28px', fontSize: 14 }, secondaryAction: { padding: '11px 24px', fontSize: 14 },
  section: { padding: '52px 48px' }, sectionHeader: { textAlign: 'center', marginBottom: 36 },
  sectionTitle: { fontSize: 26, fontWeight: 700, marginBottom: 8 }, sectionDescription: { color: 'var(--text-muted)', fontSize: 14 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, maxWidth: 960, margin: '0 auto' },
  featureCard: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 10, padding: '18px 20px' },
  featureIcon: { width: 36, height: 36, background: 'var(--bg-ai)', color: 'var(--accent-blue-dim)', border: '.5px solid var(--border-blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 6 }, cardDescription: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  stepsSection: { background: 'var(--bg-surface)', borderTop: '.5px solid var(--border)', borderBottom: '.5px solid var(--border)' },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, maxWidth: 800, margin: '0 auto' },
  stepCard: { textAlign: 'center', padding: 20 }, stepNo: { fontSize: 32, fontWeight: 800, color: 'var(--accent-blue)', opacity: .4, marginBottom: 12, fontFamily: 'var(--font-mono)' },
  stepTitle: { fontSize: 15, fontWeight: 600, marginBottom: 8 }, ctaTitle: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
  ctaDescription: { color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }, ctaButton: { padding: '12px 32px', fontSize: 15 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderTop: '.5px solid var(--border)', background: 'var(--bg-surface)' },
  editableText: { outline: '1px dashed rgba(16,185,129,.55)', outlineOffset: 3, borderRadius: 3, cursor: 'text', minWidth: 20, display: 'inline-block' },
  editableCard: { position: 'relative', paddingBottom: 48 }, iconSelect: { width: 130, marginBottom: 10, fontSize: 11, padding: '5px 7px' },
  removeButton: { position: 'absolute', right: 12, bottom: 10, padding: '4px 9px', fontSize: 11 },
  addButton: { display: 'flex', margin: '18px auto 0' },
}
