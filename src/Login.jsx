import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, subscribeTeacherState } from "./auth";
import "./App.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeTeacherState(({ user, isTeacher, error: authError }) => {
      if (isTeacher) {
        navigate("/diemdanhhocsinhlop11A3", { replace: true });
      } else if (authError) {
        setError(`Không thể xác thực tài khoản: ${authError.message}`);
      } else if (user) {
        setError("Tài khoản chưa được cấp quyền giáo viên.");
      }
    });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.ok) {
        navigate("/diemdanhhocsinhlop11A3");
      } else {
        setError(res.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Link to="/khach" className="login-home-link">
        ← Xem với tư cách học sinh
      </Link>

      {/* Cột trái — giới thiệu */}
      <div className="login-intro">
        <div className="login-logo">📋</div>
        <h1>Điểm danh lớp 11A3</h1>
        <p className="login-tagline">
          Hệ thống điểm danh thông minh bằng <b>khuôn mặt</b>
        </p>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <div>
              <b>Nhận diện khuôn mặt</b>
              <p>Tự động chấm công khi học sinh vào lớp</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">☁️</span>
            <div>
              <b>Lưu trữ Cloud</b>
              <p>Đồng bộ mọi máy, không sợ mất dữ liệu</p>
            </div>
          </div>

          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div>
              <b>Xuất Excel</b>
              <p>Báo cáo điểm danh cuối ngày, cuối tháng</p>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>👨‍🏫 Dành cho giáo viên và ban cán sự lớp</p>
        </div>
      </div>

      {/* Cột phải — form đăng nhập */}
      <div className="login-form-side">
        <div className="login-form-box">
          <h2>
            <span className="login-lock" aria-hidden="true">🔐</span>
            <span>Đăng nhập</span>
          </h2>
          <p className="login-subtitle">Đăng nhập bằng tài khoản giáo viên</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-email">Email</label>
              <div className="input-control">
                <span className="input-icon" aria-hidden="true">👤</span>
                <input
                  id="login-email"
                  type="email"
                  aria-label="Email"
                  placeholder="giaovien@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="input-control">
                <span className="input-icon" aria-hidden="true">🔒</span>
                <input
                  id="login-password"
                  type={passwordVisible ? "text" : "password"}
                  aria-label="Mật khẩu"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              <span className="login-rocket" aria-hidden="true">🚀</span>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="login-hint">
            <p>
              <span className="hint-icon" aria-hidden="true">💡</span>
              Tài khoản được quản trị viên tạo trong Firebase Authentication.
            </p>
          </div>

          <div className="login-divider">
            <span>hoặc</span>
          </div>

          <Link to="/khach" className="btn-guest">
            👀 Xem với tư cách học sinh (không cần đăng nhập)
          </Link>
        </div>
      </div>
      <span className="login-version">v1.0.0</span>
    </div>
  );
}