import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'

export default function DangKy() {
  const [form, setForm] = useState({ hoTen: '', email: '', matKhau: '', xacNhan: '' })
  const [hienMatKhau, setHienMatKhau] = useState(false)
  const [loi, setLoi] = useState({})
  const { dangKy, dangTai } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
      if (!form.hoTen.trim()) e.hoTen = 'Vui lòng nhập họ tên'
    if (!form.email)    e.email  = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.matKhau)  e.matKhau = 'Vui lòng nhập mật khẩu'
    else if (form.matKhau.length < 6) e.matKhau = 'Mật khẩu ít nhất 6 ký tự'
    else if (form.matKhau !== form.matKhau.trim()) {
        e.matKhau = 'Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng'
    }
    if (form.xacNhan !== form.matKhau) e.xacNhan = 'Mật khẩu không khớp'
    return e
  }

  const xuLyDangKy = async e => {
      e.preventDefault()
      const err = validate()
      if (Object.keys(err).length) {
          setLoi(err);
          return
      }

      const ok = await dangKy(
          form.email.trim().toLowerCase(),
          form.matKhau,
          form.hoTen.trim()
      )

      if (ok) {
          navigate('/dang-nhap', {
              replace: true,
              state: {
                  email: form.email,
                  registered: true,
              },
          })
      }
  }
  return (
    <div style={styles.wrap}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <img src={logo} alt="Velora" style={{ height: 32, marginBottom: 24 }} />
          <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>Bắt đầu miễn phí</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Tạo tài khoản để sử dụng đầy đủ tính năng AI của Velora.
            Dữ liệu của bạn được lưu trữ an toàn trên server của nhóm.
          </p>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.form}>
          <h2 style={{ marginBottom: 6 }}>Tạo tài khoản</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>Điền thông tin để đăng ký</p>

          <form onSubmit={xuLyDangKy} noValidate>
            {[
              { key: 'hoTen',   label: 'Họ và tên',       type: 'text',     placeholder: 'Nguyễn Văn A' },
              { key: 'email',   label: 'Email',            type: 'email',    placeholder: 'ban@example.com' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input type={type} placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={loi[key] ? styles.inputLoi : {}} />
                {loi[key] && <span style={styles.loiText}>{loi[key]}</span>}
              </div>
            ))}

            {['matKhau', 'xacNhan'].map(key => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{key === 'matKhau' ? 'Mật khẩu' : 'Xác nhận mật khẩu'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={hienMatKhau ? 'text' : 'password'}
                    placeholder={key === 'matKhau' ? 'Ít nhất 6 ký tự' : 'Nhập lại mật khẩu'}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ ...loi[key] ? styles.inputLoi : {}, paddingRight: 36 }} />
                  {key === 'matKhau' && (
                    <button type="button" className="btn-ghost"
                      onClick={() => setHienMatKhau(p => !p)}
                      style={styles.eyeBtn}>
                      {hienMatKhau ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                  )}
                </div>
                {loi[key] && <span style={styles.loiText}>{loi[key]}</span>}
              </div>
            ))}

            <button type="submit" className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: 10, marginTop: 8 }}
              disabled={dangTai}>
              {dangTai ? <><div className="spinner" style={{ width: 14, height: 14 }} />Đang đăng ký...</> : 'Tạo tài khoản'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Đã có tài khoản?{' '}
            <Link to="/dang-nhap" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', height: '100vh' },
  left: { flex: 1, background: 'var(--bg-surface)', borderRight: '.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  leftContent: { maxWidth: 380 },
  right: { width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  form: { width: '100%' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 },
  inputLoi: { borderColor: 'var(--accent-red)' },
  loiText: { fontSize: 11, color: 'var(--accent-red)', marginTop: 3, display: 'block' },
  eyeBtn: { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', padding: 4 },
}
