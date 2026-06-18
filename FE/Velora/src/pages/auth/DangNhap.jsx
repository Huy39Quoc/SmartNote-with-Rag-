import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'

export default function DangNhap() {
    const location = useLocation()

    const [form, setForm] = useState({
        email: location.state?.email || '',
        matKhau: '',
    })
  const [hienMatKhau, setHienMatKhau] = useState(false)
  const [loi, setLoi] = useState({})
  const { dangNhap, dangTai } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.email)        e.email = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.matKhau)      e.matKhau = 'Vui lòng nhập mật khẩu'
    return e
  }

  const xuLyDangNhap = async e => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) { setLoi(err); return }
    const ok = await dangNhap(form.email, form.matKhau)
    if (ok) navigate('/ghi-chu')
  }

  return (
    <div style={styles.wrap}>
      {/* Cột trái - branding */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <img src={logo} alt="Velora" style={{ height: 32, marginBottom: 24 }} />
          <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>
            Ghi chú thông minh
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 340 }}>
            Velora giúp bạn ghi chú, tổ chức kiến thức và quản lý deadline
            bằng sức mạnh của AI — hoàn toàn chạy local, bảo mật tuyệt đối.
          </p>
          <div style={styles.features}>
            {['Ghi chú & hỏi đáp AI', 'Upload tài liệu PDF/DOCX', 'Ghi âm & phân tích', 'Quản lý deadline thông minh'].map(f => (
              <div key={f} style={styles.featureItem}>
                <span style={{ color: 'var(--accent-green)', marginRight: 8 }}>✓</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cột phải - form */}
      <div style={styles.right}>
        <div style={styles.form}>
          <h2 style={{ marginBottom: 6 }}>Đăng nhập</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
                {location.state?.registered
                    ? 'Đăng ký thành công. Hãy đăng nhập để tiếp tục.'
                    : 'Chào mừng trở lại'}
            </p>

          <form onSubmit={xuLyDangNhap} noValidate>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email" placeholder="ban@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                style={loi.email ? styles.inputLoi : {}}
                autoFocus
              />
              {loi.email && <span style={styles.loiText}>{loi.email}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.matKhau}
                  onChange={e => setForm(p => ({ ...p, matKhau: e.target.value }))}
                  style={{ ...loi.matKhau ? styles.inputLoi : {}, paddingRight: 36 }}
                />
                <button type="button" onClick={() => setHienMatKhau(p => !p)}
                  style={styles.eyeBtn} className="btn-ghost">
                  {hienMatKhau ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
              {loi.matKhau && <span style={styles.loiText}>{loi.matKhau}</span>}
            </div>

            <button type="submit" className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 8 }}
              disabled={dangTai}>
              {dangTai ? <><div className="spinner" style={{ width: 14, height: 14 }} />Đang đăng nhập...</> : 'Đăng nhập'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/dang-ky" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap:        { display: 'flex', height: '100vh', overflow: 'hidden' },
  left:        { flex: 1, background: 'var(--bg-surface)', borderRight: '.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  leftContent: { maxWidth: 400 },
  features:    { marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 },
  featureItem: { display: 'flex', alignItems: 'center' },
  right:       { width: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  form:        { width: '100%' },
  field:       { marginBottom: 16 },
  label:       { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 },
  inputLoi:    { borderColor: 'var(--accent-red)' },
  loiText:     { fontSize: 11, color: 'var(--accent-red)', marginTop: 3, display: 'block' },
  eyeBtn:      { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', padding: 4 },
}
