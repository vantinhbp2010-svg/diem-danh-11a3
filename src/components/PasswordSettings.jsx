import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("Mật khẩu mới phải có từ 8 đến 128 ký tự.");
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Đổi mật khẩu thành công.");
    } catch (requestError) {
      console.error("Không thể đổi mật khẩu:", requestError.code || requestError.message);
      if (
        requestError.code === "auth/invalid-credential" ||
        requestError.code === "auth/wrong-password"
      ) {
        setError("Mật khẩu hiện tại không chính xác.");
      } else if (requestError.code === "auth/weak-password") {
        setError("Mật khẩu mới chưa đủ mạnh.");
      } else if (requestError.code === "auth/requires-recent-login") {
        setError("Phiên đăng nhập đã cũ. Vui lòng đăng xuất và đăng nhập lại.");
      } else {
        setError("Không thể đổi mật khẩu lúc này. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="password-settings" aria-labelledby="password-settings-title">
      <h4 id="password-settings-title">Đổi mật khẩu của bạn</h4>
      <form className="password-settings-form" onSubmit={handleSubmit}>
        <input
          type="password"
          autoComplete="current-password"
          aria-label="Mật khẩu hiện tại"
          placeholder="Mật khẩu hiện tại"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          aria-label="Mật khẩu mới"
          placeholder="Mật khẩu mới (8–128 ký tự)"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </form>
      {message && <p className="password-settings-message" role="status">{message}</p>}
      {error && <p className="password-settings-error" role="alert">{error}</p>}
    </section>
  );
}
