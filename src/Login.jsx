import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { isLoggedIn, login } from "./auth";
import "./App.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/diemdanhhocsinhlop11A3", { replace: true });
    }
  }, [navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    const res = login(username, password);
    if (res.ok) {
      navigate("/diemdanhhocsinhlop11A3");
    } else {
      setError(res.message);
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
          <p className="login-subtitle">Nhập tài khoản để tiếp tục</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-username">Tên đăng nhập</label>
              <div className="input-control">
                <span className="input-icon" aria-hidden="true">👤</span>
                <input
                  id="login-username"
                  type="text"
                  aria-label="Tên đăng nhập"
                  placeholder="Ví dụ: giaovien"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
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

            <button type="submit" className="btn-login">
              <span className="login-rocket" aria-hidden="true">🚀</span>
              Đăng nhập
            </button>
          </form>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="login-hint">
            <p>
              <span className="hint-icon" aria-hidden="true">💡</span>
              Tài khoản mặc định: <b>giaovien</b> / <b>123456</b>
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