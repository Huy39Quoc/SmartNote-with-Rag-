import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'

export default function Login() {
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
        if (Object.keys(err).length) {
            setLoi(err)
            return
        }

        const ok = await dangNhap(form.email.trim().toLowerCase(), form.matKhau)
        if (ok) navigate('/notes')
    }

  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Cột trái - branding */}
      <div
        className="hidden md:flex flex-1 items-center justify-center p-12"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        <div style={{ maxWidth: 420 }}>
          <img src={logo} alt="Velora" style={{ height: 34, marginBottom: 26 }} />
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', lineHeight: 1.25 }}>
            Ghi chú thông minh<br />cho học tập hiện đại
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 380, fontSize: 14.5 }}>
            Velora giúp bạn ghi chú, tổ chức kiến thức và quản lý deadline
            bằng sức mạnh của AI — hoàn toàn chạy local, bảo mật tuyệt đối.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {[
              ['Ghi chú & hỏi đáp AI', 'Trò chuyện dựa trên ghi chú'],
              ['Upload tài liệu PDF/DOCX', 'Trích xuất & tóm tắt'],
              ['Ghi âm & phân tích', 'Speech to text tức thì'],
              ['Deadline thông minh', 'Tự nhắc theo lịch học'],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cột phải - form */}
      <div className="flex items-center justify-center p-10" style={{ width: 440 }}>
        <div className="w-full">
          <h2 style={{ marginBottom: 6, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Đăng nhập</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 26 }}>
                {location.state?.registered
                    ? 'Đăng ký thành công. Hãy đăng nhập để tiếp tục.'
                    : 'Chào mừng bạn quay lại Velora'}
            </p>

          <form onSubmit={xuLyDangNhap} noValidate>
            <div className="mb-4">
              <label className="block mb-1.5" style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>Email</label>
              <input
                type="email" placeholder="ban@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="rounded-xl"
                style={loi.email ? { borderColor: 'var(--accent-red)' } : {}}
                autoFocus
              />
              {loi.email && <span className="block mt-1" style={{ fontSize: 11.5, color: 'var(--accent-red)' }}>{loi.email}</span>}
            </div>

            <div className="mb-5">
              <label className="block mb-1.5" style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={form.matKhau}
                  onChange={e => setForm(p => ({ ...p, matKhau: e.target.value }))}
                  className="rounded-xl"
                  style={{ ...(loi.matKhau ? { borderColor: 'var(--accent-red)' } : {}), paddingRight: 36 }}
                />
                <button type="button" onClick={() => setHienMatKhau(p => !p)}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', padding: 4 }} className="btn-ghost">
                  {hienMatKhau ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
              {loi.matKhau && <span className="block mt-1" style={{ fontSize: 11.5, color: 'var(--accent-red)' }}>{loi.matKhau}</span>}
            </div>

            <button type="submit" className="btn-primary rounded-xl"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}
              disabled={dangTai}>
              {dangTai ? <><div className="spinner" style={{ width: 14, height: 14 }} />Đang đăng nhập...</> : 'Đăng nhập'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 12.5, color: 'var(--text-muted)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
