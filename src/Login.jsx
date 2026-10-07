import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "./auth";
import "./App.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      {/* Cột trái — giới thiệu */}
      <div className="login-intro">
        <div className="login-logo">📋</div>
        <h1>Điểm danh lớp 11A3</h1>
        <p className="login-tagline">
          Hệ thống điểm danh thông minh bằng <b>khuôn mặt</b> và{" "}
          <b>QR CCCD</b>
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
            <span className="feature-icon">🪪</span>
            <div>
              <b>Quét QR CCCD</b>
              <p>Phương án dự phòng khi mặt khó nhận diện</p>
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
          <h2>🔐 Đăng nhập</h2>
          <p className="login-subtitle">Nhập tài khoản để tiếp tục</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                placeholder="Ví dụ: giaovien"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login">
              🚀 Đăng nhập
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="login-hint">
            <p>
              💡 Tài khoản mặc định: <b>giaovien</b> / <b>123456</b>
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
    </div>
  );
}