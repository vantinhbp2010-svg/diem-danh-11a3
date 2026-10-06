// Đăng nhập giả lập — lưu trong localStorage
const AUTH_KEY = "auth_11A3";

// Tài khoản mặc định (có thể sửa)
export const ACCOUNTS = {
  giaovien: "123456",
  admin: "admin123",
};

export function login(username, password) {
  if (ACCOUNTS[username] && ACCOUNTS[username] === password) {
    localStorage.setItem(AUTH_KEY, username);
    return { ok: true };
  }
  return { ok: false, message: "Sai tên đăng nhập hoặc mật khẩu!" };
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function getUser() {
  return localStorage.getItem(AUTH_KEY);
}

export function isLoggedIn() {
  return !!localStorage.getItem(AUTH_KEY);
}