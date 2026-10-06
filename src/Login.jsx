import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "./auth";

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
    <div className="login-box">
      <h1>🔐 Đăng nhập</h1>
      <p>App điểm danh lớp 11A3</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Đăng nhập</button>
      </form>

      {error && <div className="error">{error}</div>}

      <p className="hint">
        Tài khoản mặc định: <b>giaovien</b> / <b>123456</b>
      </p>

      <p style={{ marginTop: 20 }}>
        <Link
          to="/khach"
          style={{
            color: "#3b82f6",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          👀 Vào với tư cách học sinh (không cần đăng nhập)
        </Link>
      </p>
    </div>
  );
}