import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import useAuthStore from '../../service/authStore'
import logo from '../../assets/logo.svg'

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
      if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!form.email)    e.email  = 'Vui lòng nhập email'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.password)  e.password = 'Vui lòng nhập mật khẩu'
    else if (form.password.length < 6) e.password = 'Mật khẩu ít nhất 6 ký tự'
    else if (form.password !== form.password.trim()) {
        e.password = 'Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng'
    }
    if (form.confirm !== form.password) e.confirm = 'Mật khẩu không khớp'
    return e
  }

  const handleRegister = async e => {
      e.preventDefault()
      const err = validate()
      if (Object.keys(err).length) {
          setErrors(err);
          return
      }

      const ok = await register(
          form.email.trim().toLowerCase(),
          form.password,
          form.fullName.trim()
      )

        if (ok) {
          navigate('/login', {
              replace: true,
              state: {
                  email: form.email,
                  registered: true,
              },
          })
      }
  }
  return (
    <div className="flex" style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <div className="hidden md:flex flex-1 items-center justify-center p-12" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 380 }}>
          <img src={logo} alt="Velora" style={{ height: 34, marginBottom: 26 }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>Bắt đầu miễn phí</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14.5 }}>
            Tạo tài khoản để sử dụng đầy đủ tính năng AI của Velora.
            Dữ liệu của bạn được lưu trữ an toàn trên server của nhóm.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-10" style={{ width: 440 }}>
        <div className="w-full">
          <h2 style={{ marginBottom: 6, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Tạo tài khoản</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Điền thông message để đăng ký</p>

          <form onSubmit={handleRegister} noValidate>
            {[
              { key: 'fullName',   label: 'Họ và tên',       type: 'text',     placeholder: 'Nguyễn Văn A' },
              { key: 'email',   label: 'Email',            type: 'email',    placeholder: 'ban@example.com' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input type={type} placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="rounded-xl"
                  style={errors[key] ? styles.inputLoi : {}} />
                {errors[key] && <span style={styles.errorText}>{errors[key]}</span>}
              </div>
            ))}

            {['password', 'confirm'].map(key => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{key === 'password' ? 'Mật khẩu' : 'Xác nhận mật khẩu'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'}
                    placeholder={key === 'password' ? 'Ít nhất 6 ký tự' : 'Nhập lại mật khẩu'}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="rounded-xl"
                    style={{ ...errors[key] ? styles.inputLoi : {}, paddingRight: 36 }} />
                  {key === 'password' && (
                    <button type="button" className="btn-ghost"
                      onClick={() => setShowPassword(p => !p)}
                      style={styles.eyeBtn}>
                      {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </button>
                  )}
                </div>
                {errors[key] && <span style={styles.errorText}>{errors[key]}</span>}
              </div>
            ))}

            <button type="submit" className="btn-primary rounded-xl"
              style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 8 }}
              disabled={isLoading}>
              {isLoading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Đang đăng ký...</> : 'Tạo tài khoản'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Đăng nhập</Link>
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
  errorText: { fontSize: 11, color: 'var(--accent-red)', marginTop: 3, display: 'block' },
  eyeBtn: { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', padding: 4 },
}
