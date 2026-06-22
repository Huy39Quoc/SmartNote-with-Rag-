import { useNavigate } from 'react-router-dom'
import { IconSparkles, IconUpload, IconMessages, IconCalendar, IconSitemap, IconMicrophone, IconArrowRight } from '@tabler/icons-react'
import logo from '../../assets/logo.svg'

const TINH_NANG = [
  { icon: IconSparkles,    tieu_de: 'AI ghi chú thông minh',     mo_ta: 'Tự động tóm tắt, cải thiện cấu trúc và đề xuất tiêu đề cho ghi chú của bạn.' },
  { icon: IconUpload,      tieu_de: 'Upload tài liệu & phân tích', mo_ta: 'Tải lên PDF, DOCX, TXT — AI đọc và trả lời câu hỏi về nội dung tài liệu.' },
  { icon: IconMicrophone,  tieu_de: 'Ghi âm & phân tích',        mo_ta: 'Upload file audio, Whisper nhận dạng tiếng Việt và AI tạo ghi chú có cấu trúc.' },
  { icon: IconMessages,    tieu_de: 'Hỏi đáp với ghi chú',       mo_ta: 'Đặt câu hỏi về bất kỳ nội dung nào trong kho ghi chú và tài liệu của bạn.' },
  { icon: IconCalendar,    tieu_de: 'Quản lý deadline thông minh', mo_ta: 'AI tự động phát hiện deadline trong ghi chú và sắp xếp theo mức độ ưu tiên.' },
  { icon: IconSitemap,     tieu_de: 'Tổ chức kiến thức tự động',  mo_ta: 'AI phân loại ghi chú theo chủ đề và gợi ý liên kết giữa các nội dung.' },
]

const BUOC = [
  { so: '01', tieu_de: 'Tạo tài khoản',   mo_ta: 'Đăng ký miễn phí, không cần thẻ tín dụng.' },
  { so: '02', tieu_de: 'Ghi chú hoặc upload', mo_ta: 'Tạo ghi chú, tải lên tài liệu hoặc ghi âm bài giảng.' },
  { so: '03', tieu_de: 'Để AI làm phần còn lại', mo_ta: 'Tóm tắt, phân tích, hỏi đáp — tất cả chạy local, dữ liệu không rời máy.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={styles.wrap}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <img src={logo} alt="Velora" style={{ height: 26 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => navigate('/login')} style={{ fontSize: 13 }}>Đăng nhập</button>
          <button className="btn-primary" onClick={() => navigate('/register')} style={{ fontSize: 13, padding: '6px 16px' }}>
            Bắt đầu miễn phí
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <section style={styles.hero}>
          <div style={styles.heroBadge}>
            <IconSparkles size={12} style={{ color: 'var(--accent-blue-dim)' }} />
            <span>AI chạy hoàn toàn local · Dữ liệu bảo mật tuyệt đối</span>
          </div>
          <h1 style={styles.heroTitle}>
            Ghi chú thông minh<br />
            <span style={{ color: 'var(--accent-blue)' }}>bằng sức mạnh AI</span>
          </h1>
          <p style={styles.heroDesc}>
            Velora giúp sinh viên và người đi làm ghi chú, tổ chức kiến thức,
            quản lý deadline và hỏi đáp với tài liệu — tất cả nhờ AI chạy local,
            không cần internet, không lo lộ dữ liệu.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/register')}
              style={{ padding: '11px 28px', fontSize: 14 }}>
              Dùng thử miễn phí <IconArrowRight size={15} />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/login')}
              style={{ padding: '11px 24px', fontSize: 14 }}>
              Đăng nhập
            </button>
          </div>
        </section>

        {/* Tính năng */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Đầy đủ tính năng</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Mọi thứ bạn cần để học tập và làm việc hiệu quả hơn</p>
          </div>
          <div style={styles.featureGrid}>
            {TINH_NANG.map(({ icon: Icon, tieu_de, mo_ta }) => (
              <div key={tieu_de} style={styles.featureCard}>
                <div style={styles.featureIcon}>
                  <Icon size={18} style={{ color: 'var(--accent-blue-dim)' }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{tieu_de}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{mo_ta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cách hoạt động */}
        <section style={{ ...styles.section, background: 'var(--bg-surface)', borderTop: '.5px solid var(--border)', borderBottom: '.5px solid var(--border)' }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Cách hoạt động</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bắt đầu trong vài phút</p>
          </div>
          <div style={styles.stepsGrid}>
            {BUOC.map(({ so, tieu_de, mo_ta }) => (
              <div key={so} style={styles.stepCard}>
                <div style={styles.stepNo}>{so}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{tieu_de}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{mo_ta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ ...styles.section, textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            Sẵn sàng bắt đầu?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Đăng ký ngay — hoàn toàn miễn phí, không yêu cầu thẻ tín dụng
          </p>
          <button className="btn-primary" onClick={() => navigate('/register')}
            style={{ padding: '12px 32px', fontSize: 15 }}>
            Tạo tài khoản miễn phí <IconArrowRight size={15} />
          </button>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <img src={logo} alt="Velora" style={{ height: 22, opacity: .6 }} />
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            © 2025 Velora · Dự án sinh viên · Chạy hoàn toàn local
          </p>
        </footer>
      </div>
    </div>
  )
}

const styles = {
  wrap:          { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  nav:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 48px', borderBottom: '.5px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 },
  hero:          { padding: '72px 48px 60px', textAlign: 'center', maxWidth: 720, margin: '0 auto' },
  heroBadge:     { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-ai)', border: '.5px solid var(--border-blue)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--accent-blue-dim)', marginBottom: 24 },
  heroTitle:     { fontSize: 40, fontWeight: 700, lineHeight: 1.2, marginBottom: 18, letterSpacing: '-0.5px' },
  heroDesc:      { fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 },
  section:       { padding: '52px 48px' },
  sectionHeader: { textAlign: 'center', marginBottom: 36 },
  sectionTitle:  { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  featureGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, maxWidth: 960, margin: '0 auto' },
  featureCard:   { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 10, padding: '18px 20px' },
  featureIcon:   { width: 36, height: 36, background: 'var(--bg-ai)', border: '.5px solid var(--border-blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stepsGrid:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 800, margin: '0 auto' },
  stepCard:      { textAlign: 'center', padding: '20px' },
  stepNo:        { fontSize: 32, fontWeight: 800, color: 'var(--accent-blue)', opacity: .4, marginBottom: 12, fontFamily: 'var(--font-mono)' },
  footer:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderTop: '.5px solid var(--border)', background: 'var(--bg-surface)' },
}
