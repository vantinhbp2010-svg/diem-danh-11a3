import { useCallback, useEffect, useState } from "react";
import { auth } from "./firebase";

async function adminRequest(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Yêu cầu thất bại (${response.status}).`);
  }
  return result;
}

export default function TabQuanLyTaiKhoan() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workingUid, setWorkingUid] = useState("");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminRequest("/api/admin/list-teachers");
      setTeachers(Array.isArray(result.teachers) ? result.teachers : []);
      setMsg("");
    } catch (error) {
      setMsg(`Lỗi tải danh sách: ${error.message}`);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadTeachers);
  }, [loadTeachers]);

  async function handleCreate(event) {
    event.preventDefault();
    setMsg("");
    setWorkingUid("create");
    try {
      await adminRequest("/api/admin/create-teacher", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setMsg(`Đã tạo tài khoản giáo viên ${email.trim()}.`);
      setEmail("");
      setPassword("");
      await loadTeachers();
    } catch (error) {
      setMsg(`Lỗi tạo tài khoản: ${error.message}`);
    } finally {
      setWorkingUid("");
    }
  }

  async function handleDelete(teacher) {
    if (!window.confirm(`Xóa tài khoản giáo viên ${teacher.email}?`)) return;
    setMsg("");
    setWorkingUid(teacher.uid);
    try {
      await adminRequest("/api/admin/delete-teacher", {
        method: "POST",
        body: JSON.stringify({ uid: teacher.uid }),
      });
      setMsg(`Đã xóa tài khoản ${teacher.email}.`);
      await loadTeachers();
    } catch (error) {
      setMsg(`Lỗi xóa tài khoản: ${error.message}`);
    } finally {
      setWorkingUid("");
    }
  }

  return (
    <section className="caidat-box" aria-labelledby="teacher-admin-title">
      <h3 id="teacher-admin-title">Quản lý tài khoản giáo viên</h3>
      {msg && <p role="status">{msg}</p>}

      <form
        onSubmit={handleCreate}
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <h4>Thêm giáo viên</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="email"
            autoComplete="email"
            aria-label="Email giáo viên"
            placeholder="Email giáo viên"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{
              flex: "1 1 220px",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label="Mật khẩu mới"
            placeholder="Mật khẩu (ít nhất 8 ký tự)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={128}
            required
            style={{
              flex: "1 1 220px",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <button
            type="submit"
            disabled={Boolean(workingUid)}
            style={{ background: "#10b981", padding: "10px 20px" }}
          >
            {workingUid === "create" ? "Đang tạo..." : "Thêm giáo viên"}
          </button>
        </div>
      </form>

      <div style={{ background: "#fff", padding: 20, borderRadius: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h4>Danh sách giáo viên ({teachers.length})</h4>
          <button type="button" onClick={loadTeachers} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
        {loading && teachers.length === 0 ? (
          <p role="status">Đang tải danh sách...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Ngày tạo</th>
                  <th>Đăng nhập gần nhất</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.uid}>
                    <td>{teacher.email}</td>
                    <td>
                      {teacher.createdAt
                        ? new Date(teacher.createdAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    <td>
                      {teacher.lastSignIn
                        ? new Date(teacher.lastSignIn).toLocaleDateString("vi-VN")
                        : "Chưa đăng nhập"}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDelete(teacher)}
                        disabled={Boolean(workingUid)}
                        style={{
                          background: "#dc2626",
                          padding: "5px 10px",
                          fontSize: 13,
                        }}
                      >
                        {workingUid === teacher.uid ? "Đang xóa..." : "Xóa"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && teachers.length === 0 && (
                  <tr>
                    <td colSpan={4}>Chưa có tài khoản giáo viên.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
