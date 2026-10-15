import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStudents } from "./StudentsContext";
import { getAttendance } from "./storage";
import News from "./News";
import "./App.css";

export default function Khach() {
  const { students, maLop, danhSachLop, chonLop } = useStudents();
  const [tab, setTab] = useState("bang");
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState("");
  const [buoiDangChon, setBuoiDangChon] = useState("sang");

  useEffect(() => {
    const d = new Date().toISOString().slice(0, 10);
    setToday(d);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data khi đổi lớp
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maLop]);

  async function loadData() {
    try {
      const data = await getAttendance();
      const d = new Date().toISOString().slice(0, 10);
      setAttendance(data[d] || {});
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    }
  }

  const total = students.length;
  const chuaCoLop = !maLop || students.length === 0;

  return (
    <div className="container">
      <div className="header-row">
        <h1>
          📋{" "}
          {chuaCoLop
            ? "Chưa có danh sách học sinh"
            : `Điểm danh lớp ${danhSachLop[maLop]?.tenHienThi || maLop}`}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!chuaCoLop && Object.keys(danhSachLop).length > 0 && (
            <select
              value={maLop}
              onChange={(e) => chonLop(e.target.value)}
              style={{
                padding: "8px 14px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                border: "2px solid #667eea",
                background: "white",
                color: "#1f2937",
                cursor: "pointer",
              }}
            >
              {Object.keys(danhSachLop).map((k) => (
                <option key={k} value={k}>
                  {danhSachLop[k].tenHienThi || `Lớp ${k}`} ({danhSachLop[k].soHS} HS)
                </option>
              ))}
            </select>
          )}
          <Link to="/login">
            <button style={{ background: "#64748b" }}>🔐 Giáo viên</button>
          </Link>
        </div>
      </div>

      {/* ✅ MÀN HÌNH CHƯA CÓ DS */}
      {chuaCoLop ? (
        <>
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "#f8fafc",
              borderRadius: 16,
              border: "2px dashed #cbd5e1",
              margin: "20px 0",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
            <h2
              style={{
                fontSize: 22,
                color: "#1e40af",
                margin: "0 0 12px",
                fontWeight: 700,
              }}
            >
              Chưa có danh sách học sinh
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: 15,
                marginBottom: 0,
                maxWidth: 480,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.6,
              }}
            >
              Giáo viên chưa nhập danh sách lớp. Vui lòng liên hệ giáo viên chủ
              nhiệm để được cập nhật.
            </p>
          </div>

          {/* Vẫn xem được bản tin */}
          <div className="tabs">
            <button
              className={tab === "news" ? "active" : ""}
              onClick={() => setTab("news")}
            >
              📰 Bản tin lớp
            </button>
          </div>

          {tab === "news" && <News laGiaoVien={false} tenNguoiDung="" />}
        </>
      ) : (
        <>
          {/* ✅ CÓ DS → hiện đầy đủ */}
          <p style={{ background: "#dbeafe", padding: 12, borderRadius: 8 }}>
            👋 Trang này để <b>xem bảng điểm danh</b> và <b>bản tin lớp</b>. Học
            sinh có thể đăng tin — tin sẽ chờ giáo viên duyệt.
          </p>

          <div className="tabs">
            <button
              className={tab === "bang" ? "active" : ""}
              onClick={() => setTab("bang")}
            >
              📋 Xem điểm danh
            </button>
            <button
              className={tab === "news" ? "active" : ""}
              onClick={() => setTab("news")}
            >
              📰 Bản tin lớp
            </button>
          </div>

          {tab === "bang" && (
            <>
              <div className="chon-buoi">
                <span>Chọn buổi:</span>
                <button
                  className={buoiDangChon === "sang" ? "active" : ""}
                  onClick={() => setBuoiDangChon("sang")}
                >
                  🌅 Sáng (7h00 — trễ sau 7h45)
                </button>
                <button
                  className={buoiDangChon === "chieu" ? "active" : ""}
                  onClick={() => setBuoiDangChon("chieu")}
                >
                  🌆 Chiều (13h30 — trễ sau 14h15)
                </button>
              </div>

              <TabBangKhach
                students={students}
                attendance={attendance}
                today={today}
                total={total}
                buoi={buoiDangChon}
              />
            </>
          )}

          {tab === "news" && <News laGiaoVien={false} tenNguoiDung="" />}
        </>
      )}
    </div>
  );
}

/* ---------- BẢNG ĐIỂM DANH CHO KHÁCH ---------- */
function TabBangKhach({ students, attendance, today, total, buoi }) {
  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0 };
  students.forEach((s) => {
    const a = (attendance[s.id] || {})[buoi];
    if (!a) {
      dem["Vắng"]++;
    } else {
      dem[a.status] = (dem[a.status] || 0) + 1;
    }
  });

  const tenBuoi = buoi === "sang" ? "Sáng" : "Chiều";
  const gioChuan = buoi === "sang" ? "7h00" : "13h30";
  const hanTre = buoi === "sang" ? "7h45" : "14h15";

  return (
    <>
      <p>
        Ngày: {today} — Buổi <b>{tenBuoi}</b> — Giờ vào lớp: <b>{gioChuan}</b>{" "}
        (quá {hanTre} tính vắng)
      </p>

      <div className="thong-ke">
        <div className="card dunggio">
          ✅ Đúng giờ <b>{dem["Đúng giờ"]}</b>
        </div>
        <div className="card tre">
          🟡 Đi trễ <b>{dem["Đi trễ"]}</b>
        </div>
        <div className="card vang">
          ❌ Vắng <b>{dem["Vắng"]}</b>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Trạng thái ({tenBuoi})</th>
            <th>Giờ vào</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const a = (attendance[s.id] || {})[buoi];
            let status = "❌ Vắng";
            let cls = "vang";
            if (a) {
              if (a.status === "Đúng giờ") {
                status = "✅ Đúng giờ";
                cls = "dunggio";
              } else if (a.status === "Đi trễ") {
                status = "🟡 Đi trễ";
                cls = "tre";
              }
            }
            return (
              <tr key={s.id} className={cls}>
                <td>{i + 1}</td>
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.time : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}