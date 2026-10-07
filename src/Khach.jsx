import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { students } from "./data";
import { getAttendance } from "./storage";

export default function Khach() {
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState("");
  const [buoiDangChon, setBuoiDangChon] = useState("sang");

  useEffect(() => {
    const d = new Date().toISOString().slice(0, 10);
    setToday(d);
    const data = getAttendance();
    setAttendance(data[d] || {});
  }, []);

  const total = students.length;

  return (
    <div className="container">
      <div className="header-row">
        <h1>📋 Điểm danh lớp 11A3</h1>
        <Link to="/login">
          <button style={{ background: "#64748b" }}>🔐 Giáo viên</button>
        </Link>
      </div>

      <p style={{ background: "#dbeafe", padding: 12, borderRadius: 8 }}>
        👋 Trang này để <b>xem bảng điểm danh</b>. Để tự điểm danh, học sinh cần
        giáo viên mở camera chấm tại lớp.
      </p>

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
        attendance={attendance}
        today={today}
        total={total}
        buoi={buoiDangChon}
      />
    </div>
  );
}

/* ---------- BẢNG ĐIỂM DANH CHO KHÁCH ---------- */
function TabBangKhach({ attendance, today, total, buoi }) {
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