import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import {
  getAttendance,
  markAttendance,
  xoaDiemDanh,
  xoaTatCaCuaHocSinh,
  getAttendanceByDate,
  getDanhSachNgay,
  updateAttendance,
  xoaDiemDanhTheoNgay,
  tinhThongKeThang,
} from "./storage";
import { getQRs, saveQR, deleteQR, findStudentByQR } from "./qrStorage";
import { logout, getUser } from "./auth";
import News from "./News";
import TabThiDua from "./TabThiDua";
import QuanLyLop from "./QuanLyLop";
import { useStudents } from "./StudentsContext";
import "./App.css";

export default function App() {
  const [nhom, setNhom] = useState("diemdanh");
  const [tabCon, setTabCon] = useState("homnay");
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState("");
  const [msg, setMsg] = useState("");
  const [buoiDangChon, setBuoiDangChon] = useState(() => {
    const gio = new Date().getHours();
    return gio >= 12 ? "chieu" : "sang";
  });

  const [ngayXem, setNgayXem] = useState("");
  const [attendanceNgay, setAttendanceNgay] = useState({});
  const [danhSachNgay, setDanhSachNgay] = useState([]);
  const [thangThongKe, setThangThongKe] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [duLieuThongKe, setDuLieuThongKe] = useState(null);

  const navigate = useNavigate();
  const user = getUser();
  const { students, maLop, danhSachLop, chonLop } = useStudents();

  useEffect(() => {
    const d = new Date().toISOString().slice(0, 10);
    setToday(d);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự chuyển buổi theo giờ
  useEffect(() => {
    if (nhom === "diemdanh") {
      const gio = new Date().getHours();
      setBuoiDangChon(gio >= 12 ? "chieu" : "sang");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nhom, tabCon]);

  // ============ LOAD DATA ============
  async function loadData() {
    try {
      const data = await getAttendance();
      const d = new Date().toISOString().slice(0, 10);
      setAttendance(data[d] || {});
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setMsg("Lỗi tải dữ liệu từ cloud: " + err.message);
    }
  }

  async function refresh() {
    try {
      const data = await getAttendance();
      setAttendance(data[today] || {});
    } catch (err) {
      console.error(err);
    }
  }

  // ============ ĐIỂM DANH HÔM NAY ============
  async function handleMark(id, buoi) {
    try {
      const res = await markAttendance(id, buoi);
      setMsg(
        res.ok
          ? `Đã điểm danh buổi ${
              buoi === "sang" ? "sáng" : "chiều"
            } lúc ${res.time} — ${res.status}`
          : res.message
      );
      await refresh();
      setTimeout(() => setMsg(""), 3000);
      return res;
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
  }

  async function handleXoa(id, buoi) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `Xóa điểm danh buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        } của:\n\n${hs?.name} (${hs?.id})?`
      )
    )
      return;
    try {
      await xoaDiemDanh(id, buoi);
      setMsg(`Đã xóa điểm danh của ${hs?.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Lỗi xóa: " + err.message);
    }
  }

  async function handleSuaHomNay(id, buoi, status, time) {
    try {
      const data = await getAttendance();
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!data[todayStr]) data[todayStr] = {};
      if (!data[todayStr][id]) data[todayStr][id] = {};

      data[todayStr][id][buoi] = { status, time };
      const { saveAttendance } = await import("./storage");
      await saveAttendance(data);

      setMsg(`✅ Đã sửa điểm danh`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi sửa: " + err.message);
    }
  }

  async function handleXoaTatCa(id) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `⚠️ XÓA TẤT CẢ dữ liệu của:\n\n${hs?.name} (${hs?.id})\n\n` +
          `Bao gồm:\n` +
          `• Điểm danh\n` +
          `• Khuôn mặt đã đăng ký\n` +
          `• QR CCCD\n\n` +
          `Hành động này KHÔNG THỂ hoàn tác!`
      )
    )
      return;

    try {
      setMsg(`⏳ Đang xóa dữ liệu của ${hs?.name}...`);
      await xoaTatCaCuaHocSinh(id);
      setMsg(`✅ Đã xóa toàn bộ dữ liệu của ${hs?.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi xóa: " + err.message);
    }
  }

  // ============ LỊCH SỬ ============
  async function loadLichSu() {
    try {
      const ds = await getDanhSachNgay();
      setDanhSachNgay(ds);
      const ngay = ngayXem || new Date().toISOString().slice(0, 10);
      if (!ngayXem) setNgayXem(ngay);
      const data = await getAttendanceByDate(ngay);
      setAttendanceNgay(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function doiNgay(ngay) {
    setNgayXem(ngay);
    const data = await getAttendanceByDate(ngay);
    setAttendanceNgay(data);
  }

  async function handleSuaDiemDanh(studentId, buoi, status, time) {
    await updateAttendance(studentId, ngayXem, buoi, status, time);
    setMsg(`Đã sửa điểm danh`);
    await doiNgay(ngayXem);
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleXoaNgay(studentId, buoi) {
    const hs = students.find((s) => s.id === studentId);
    if (
      !window.confirm(
        `Xóa điểm danh ${buoi === "sang" ? "sáng" : "chiều"} ngày ${
          ngayXem
        } của ${hs?.name}?`
      )
    )
      return;
    await xoaDiemDanhTheoNgay(studentId, ngayXem, buoi);
    await doiNgay(ngayXem);
    setMsg(`Đã xóa điểm danh của ${hs?.name}`);
    setTimeout(() => setMsg(""), 3000);
  }

  // ============ THỐNG KÊ ============
  async function loadThongKe(thang) {
    try {
      const thangDung = thang || thangThongKe;
      setThangThongKe(thangDung);
      const data = await tinhThongKeThang(thangDung, students);
      setDuLieuThongKe(data);
    } catch (err) {
      console.error("Lỗi thống kê:", err);
      setMsg("Lỗi tải thống kê: " + err.message);
    }
  }

  // ============ EXCEL ============
  function exportExcel() {
    const rows = students.map((s, i) => {
      const a = attendance[s.id] || {};
      const sang = a.sang || {};
      const chieu = a.chieu || {};
      return {
        STT: i + 1,
        "Mã HS": s.id,
        "Họ tên": s.name,
        "Lớp": s.class,
        "Sáng - Trạng thái": sang.status || "Vắng",
        "Sáng - Giờ vào": sang.time || "",
        "Chiều - Trạng thái": chieu.status || "Vắng",
        "Chiều - Giờ vào": chieu.time || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DiemDanh");
    XLSX.writeFile(wb, `DiemDanh_${today}.xlsx`);
  }

  // ============ XÓA HẾT ============
  async function xoaDuLieu() {
    if (
      !window.confirm(
        "⚠️ XÓA HẾT dữ liệu điểm danh, khuôn mặt, QR CCCD trên CLOUD?\n\nKhông thể hoàn tác!"
      )
    )
      return;
    try {
      const { saveAttendance } = await import("./storage");
      await saveAttendance({});
      const { getFaces } = await import("./faceStorage");
      const faces = await getFaces();
      for (const id of Object.keys(faces)) {
        const { clearFaces } = await import("./faceStorage");
        await clearFaces(id);
      }
      alert("✅ Đã xóa hết dữ liệu!");
      window.location.reload();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  }

  function handleLogout() {
    if (window.confirm("Đăng xuất?")) {
      logout();
      navigate("/login");
    }
  }

  const total = students.length;

  return (
    <div className="container">
      <div className="header-row">
        <h1>📋 Điểm danh {maLop ? `lớp ${maLop}` : "lớp 11A3"}</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {Object.keys(danhSachLop).length > 0 && (
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
                  Lớp {k} ({danhSachLop[k].soHS} HS)
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => navigate("/khach")}
            style={{ background: "#10b981" }}
          >
            👀 Trang khách
          </button>
          <button onClick={handleLogout} style={{ background: "#64748b" }}>
            🚪 Đăng xuất ({user})
          </button>
        </div>
      </div>

      {/* 5 NHÓM CHÍNH */}
      <div className="nhom-tabs">
        <button
          className={nhom === "diemdanh" ? "active" : ""}
          onClick={() => {
            setNhom("diemdanh");
            setTabCon("homnay");
          }}
        >
          📋 Điểm danh
        </button>
        <button
          className={nhom === "hocsinh" ? "active" : ""}
          onClick={() => {
            setNhom("hocsinh");
            setTabCon("dangky");
          }}
        >
          👥 Học sinh
        </button>
        <button
          className={nhom === "news" ? "active" : ""}
          onClick={() => setNhom("news")}
        >
          📰 Bản tin
        </button>
        <button
          className={nhom === "thidua" ? "active" : ""}
          onClick={() => setNhom("thidua")}
        >
          🎯 Thi đua
        </button>
        <button
          className={nhom === "caidat" ? "active" : ""}
          onClick={() => setNhom("caidat")}
        >
          ⚙️ Cài đặt
        </button>
      </div>

      {msg && <div className="msg">{msg}</div>}

      {/* NHÓM ĐIỂM DANH */}
      {nhom === "diemdanh" && (
        <>
          <div className="tabcon">
            <button
              className={tabCon === "homnay" ? "active" : ""}
              onClick={() => setTabCon("homnay")}
            >
              📋 Hôm nay
            </button>
            <button
              className={tabCon === "camera" ? "active" : ""}
              onClick={() => setTabCon("camera")}
            >
              🎥 Camera AI
            </button>
            <button
              className={tabCon === "lichsu" ? "active" : ""}
              onClick={() => {
                setTabCon("lichsu");
                loadLichSu();
              }}
            >
              📅 Lịch sử
            </button>
            <button
              className={tabCon === "thongke" ? "active" : ""}
              onClick={() => {
                setTabCon("thongke");
                loadThongKe();
              }}
            >
              📊 Thống kê
            </button>
          </div>

          {tabCon === "homnay" && (
            <>
              <div className="chon-buoi">
                <span>Buổi:</span>
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
              <TabDiemDanh
                students={students}
                attendance={attendance}
                today={today}
                total={total}
                buoi={buoiDangChon}
                onMark={handleMark}
                onXoa={handleXoa}
                onXoaTatCa={handleXoaTatCa}
                onSua={handleSuaHomNay}
              />
            </>
          )}

          {tabCon === "camera" && (
            <TabCameraAI
              students={students}
              buoi={buoiDangChon}
              onMark={handleMark}
            />
          )}

          {tabCon === "lichsu" && (
            <TabLichSu
              students={students}
              ngayXem={ngayXem}
              danhSachNgay={danhSachNgay}
              attendanceNgay={attendanceNgay}
              onDoiNgay={doiNgay}
              onSua={handleSuaDiemDanh}
              onXoa={handleXoaNgay}
            />
          )}

          {tabCon === "thongke" && (
            <TabThongKe
              students={students}
              thangThongKe={thangThongKe}
              duLieuThongKe={duLieuThongKe}
              onDoiThang={loadThongKe}
            />
          )}
        </>
      )}

      {/* NHÓM HỌC SINH */}
      {nhom === "hocsinh" && (
        <>
          <div className="tabcon">
            <button
              className={tabCon === "dangky" ? "active" : ""}
              onClick={() => setTabCon("dangky")}
            >
              🧑 Đăng ký mặt
            </button>
            <button
              className={tabCon === "cccd" ? "active" : ""}
              onClick={() => setTabCon("cccd")}
            >
              🪪 Đăng ký CCCD
            </button>
            <button
              className={tabCon === "quanly" ? "active" : ""}
              onClick={() => setTabCon("quanly")}
            >
              📋 Quản lý lớp
            </button>
          </div>

          {tabCon === "dangky" && <TabDangKyMat students={students} />}
          {tabCon === "cccd" && <TabDangKyQR students={students} />}
          {tabCon === "quanly" && <QuanLyLop />}
        </>
      )}

      {/* NHÓM BẢN TIN */}
      {nhom === "news" && <News laGiaoVien={true} tenNguoiDung={user} />}

      {/* NHÓM THI ĐUA */}
      {nhom === "thidua" && <TabThiDua />}

      {/* NHÓM CÀI ĐẶT */}
      {nhom === "caidat" && (
        <div className="caidat-box">
          <h3>⚙️ Cài đặt & Báo cáo</h3>
          <div className="caidat-grid">
            <button onClick={exportExcel} className="caidat-btn">
              📊 Xuất Excel hôm nay
            </button>
            <button onClick={xoaDuLieu} className="caidat-btn danger">
              🗑️ Xóa toàn bộ dữ liệu
            </button>
            <button onClick={handleLogout} className="caidat-btn">
              🚪 Đăng xuất
            </button>
          </div>
          <div className="caidat-info">
            <p>
              <b>Tài khoản:</b> {user}
            </p>
            <p>
              <b>Tổng học sinh:</b> {total}
            </p>
            <p>
              <b>Ngày hiện tại:</b> {today}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================
   CÁC COMPONENT CON — nhận students qua props
   ============================================================= */

/* ---------- TAB ĐIỂM DANH ---------- */
function TabDiemDanh({
  students,
  attendance,
  today,
  total,
  buoi,
  onMark,
  onXoa,
  onXoaTatCa,
  onSua,
}) {
  const [suaModal, setSuaModal] = useState(null);
  const [suaStatus, setSuaStatus] = useState("Đúng giờ");
  const [suaTime, setSuaTime] = useState("");

  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0 };
  students.forEach((s) => {
    const a = (attendance[s.id] || {})[buoi];
    if (!a) dem["Vắng"]++;
    else dem[a.status] = (dem[a.status] || 0) + 1;
  });

  const tenBuoi = buoi === "sang" ? "Sáng" : "Chiều";
  const gioChuan = buoi === "sang" ? "7h00" : "13h30";
  const hanTre = buoi === "sang" ? "7h45" : "14h15";

  function moSuaModal(studentId) {
    const hs = students.find((s) => s.id === studentId);
    const a = (attendance[studentId] || {})[buoi];
    setSuaModal({ studentId, hs });
    setSuaStatus(a?.status || "Đúng giờ");
    setSuaTime(a?.time || new Date().toTimeString().slice(0, 5));
  }

  function luuSua() {
    if (suaModal && onSua) {
      onSua(suaModal.studentId, buoi, suaStatus, suaTime);
      setSuaModal(null);
    }
  }

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
            <th>Mã HS</th>
            <th>Họ tên</th>
            <th>Trạng thái ({tenBuoi})</th>
            <th>Giờ vào</th>
            <th>Hành động</th>
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
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.time : "—"}</td>
                <td>
                  {!a && (
                    <button onClick={() => onMark(s.id, buoi)}>
                      Điểm danh
                    </button>
                  )}
                  {a && (
                    <button
                      onClick={() => onXoa(s.id, buoi)}
                      style={{
                        background: "#f59e0b",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                    >
                      🗑️
                    </button>
                  )}
                  <button
                    onClick={() => moSuaModal(s.id)}
                    style={{
                      background: "#3b82f6",
                      marginLeft: 4,
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => onXoaTatCa(s.id)}
                    style={{
                      background: "#dc2626",
                      marginLeft: 4,
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ❌
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {suaModal && (
        <div className="modal-sua" onClick={() => setSuaModal(null)}>
          <div className="modal-sua-box" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Sửa điểm danh</h3>
            <p>
              <b>{suaModal.hs?.name}</b> — Buổi{" "}
              {buoi === "sang" ? "Sáng" : "Chiều"} ngày {today}
            </p>

            <div className="sua-group">
              <label>Trạng thái:</label>
              <select
                value={suaStatus}
                onChange={(e) => setSuaStatus(e.target.value)}
              >
                <option value="Đúng giờ">✅ Đúng giờ</option>
                <option value="Đi trễ">🟡 Đi trễ</option>
                <option value="Vắng">❌ Vắng</option>
              </select>
            </div>

            <div className="sua-group">
              <label>Giờ vào (hh:mm):</label>
              <input
                type="time"
                value={suaTime}
                onChange={(e) => setSuaTime(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button
                onClick={() => setSuaModal(null)}
                style={{ background: "#94a3b8" }}
              >
                ❌ Hủy
              </button>
              <button onClick={luuSua} style={{ background: "#10b981" }}>
                ✅ Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- TAB CAMERA AI ---------- */
function TabCameraAI({ students, buoi, onMark }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("face");
  const [lastLog, setLastLog] = useState([]);
  const [soNhanDien, setSoNhanDien] = useState(0);

  const qrScannerRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const markedInSessionRef = useRef(new Set());
  const faceapiRef = useRef(null);
  const matcherRef = useRef(null);
  const lastDetectRef = useRef(0);

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [`[${time}] ${text}`, ...prev].slice(0, 30));
  }

  async function start() {
    setMsg("Đang tải model...");
    setLastLog([]);
    setSoNhanDien(0);
    markedInSessionRef.current = new Set();

    if (mode === "face" || mode === "both") {
      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);

      const { getFaces } = await import("./faceStorage");
      const faces = await getFaces();
      const labeled = Object.keys(faces).map((id) => {
        const descs = faces[id].map((d) => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(id, descs);
      });

      if (labeled.length > 0) {
        matcherRef.current = new faceapi.FaceMatcher(labeled, 0.5);
        addLog(`✅ Đã load ${labeled.length} khuôn mặt`);
      } else {
        matcherRef.current = null;
        addLog("⚠️ Chưa có khuôn mặt nào đăng ký");
      }
    }

    setMsg("Đang mở camera...");
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 100));

    const scanner = new Html5Qrcode("qr-reader-inline");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: { width: 400, height: 400 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          const studentId = await findStudentByQR(decodedText);
          if (!studentId) {
            addLog(`❓ QR lạ`);
            return;
          }
          if (markedInSessionRef.current.has(studentId)) return;
          markedInSessionRef.current.add(studentId);

          const hs = students.find((s) => s.id === studentId);
          const res = await onMark(studentId, buoi);
          setSoNhanDien((c) => c + 1);
          addLog(`🪪 ${hs?.name}${res?.ok ? "" : " — " + (res?.message || "")}`);
        },
        () => {}
      );
      setRunning(true);
      setMsg("");
      if (mode === "face" || mode === "both") startFace();
    } catch (err) {
      setMsg("Không mở được camera: " + err.message);
    }
  }

  function startFace() {
    const faceapi = faceapiRef.current;
    if (!matcherRef.current) {
      addLog("⚠️ Bỏ qua nhận diện mặt — chưa có dữ liệu");
      return;
    }

    const TINY_OPTIONS = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.4,
    });

    faceIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      if (now - lastDetectRef.current < 300) return;
      lastDetectRef.current = now;

      const videoEl = document.querySelector("#qr-reader-inline video");
      if (!videoEl || videoEl.readyState < 2) return;

      try {
        const det = await faceapi
          .detectSingleFace(videoEl, TINY_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (det) {
          const best = matcherRef.current.findBestMatch(det.descriptor);
          if (best.label !== "unknown") {
            const hs = students.find((s) => s.id === best.label);
            if (hs && !markedInSessionRef.current.has(hs.id)) {
              markedInSessionRef.current.add(hs.id);
              const res = await onMark(hs.id, buoi);
              setSoNhanDien((c) => c + 1);
              addLog(
                `🤖 ${hs.name} (${Math.round(
                  (1 - best.distance) * 100
                )}%)${res?.ok ? "" : " — " + (res?.message || "")}`
              );
            }
          }
        }
      } catch (e) {}
    }, 400);
  }

  async function stop() {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (e) {}
      qrScannerRef.current = null;
    }
    setRunning(false);
    setMsg("");
  }

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenBuoi = buoi === "sang" ? "Sáng (7h00)" : "Chiều (13h30)";

  return (
    <>
      <p>
        Buổi: <b>{tenBuoi}</b>. Đã nhận diện:{" "}
        <b style={{ color: "#10b981" }}>{soNhanDien}</b> học sinh
      </p>

      <div className="camera-mode">
        <label>
          <input
            type="radio"
            checked={mode === "face"}
            onChange={() => setMode("face")}
            disabled={running}
          />
          🤖 Chỉ Mặt
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "qr"}
            onChange={() => setMode("qr")}
            disabled={running}
          />
          📷 Chỉ QR CCCD
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "both"}
            onChange={() => setMode("both")}
            disabled={running}
          />
          ⚡ Cả hai
        </label>
      </div>

      <div
        id="qr-reader-inline"
        style={{
          width: 600,
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      ></div>

      {!running ? (
        <button onClick={start} style={{ fontSize: 18, padding: "12px 24px" }}>
          ▶ Bật camera
        </button>
      ) : (
        <button
          onClick={stop}
          style={{
            background: "#e74c3c",
            fontSize: 18,
            padding: "12px 24px",
          }}
        >
          ⏹ Tắt camera
        </button>
      )}

      {msg && <div className="msg">{msg}</div>}

      {lastLog.length > 0 && (
        <div className="log-box">
          <h4>Nhật ký ({lastLog.length})</h4>
          <ul>
            {lastLog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/* ---------- TAB ĐĂNG KÝ KHUÔN MẶT ---------- */
function TabDangKyMat({ students }) {
  const [selected, setSelected] = useState(students[0]?.id || "");
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [soDaChup, setSoDaChup] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceapiRef = useRef(null);

  useEffect(() => {
    if (students.length > 0 && !students.find((s) => s.id === selected)) {
      setSelected(students[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  useEffect(() => {
    async function init() {
      try {
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoaded(true);
        setStatus("✅ Camera sẵn sàng — chọn học sinh và bấm Chụp");
      } catch (err) {
        setStatus("❌ Lỗi: " + err.message);
      }
    }
    init();
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    if (saving) return;
    setSaving(true);
    setStatus("⏳ Đang nhận diện khuôn mặt...");

    try {
      const faceapi = faceapiRef.current;
      if (!faceapi) {
        setStatus("❌ Model chưa load xong");
        setSaving(false);
        return;
      }

      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.4,
      });

      const det = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        setStatus("❌ Không thấy khuôn mặt");
        setSaving(false);
        return;
      }

      setStatus("⏳ Đang lưu...");
      const { saveFace } = await import("./faceStorage");
      await saveFace(selected, det.descriptor);

      const hs = students.find((s) => s.id === selected);
      setStatus(`✅ Đã lưu khuôn mặt: ${hs?.name}`);
      setSoDaChup((c) => c + 1);

      const idx = students.findIndex((s) => s.id === selected);
      if (idx < students.length - 1) {
        setTimeout(() => setSelected(students[idx + 1].id), 800);
      }
    } catch (err) {
      setStatus("❌ Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function xoaMat() {
    const hs = students.find((s) => s.id === selected);
    if (!window.confirm(`Xóa khuôn mặt của ${hs?.name}?`)) return;
    setSaving(true);
    try {
      const { clearFaces } = await import("./faceStorage");
      await clearFaces(selected);
      setStatus(`🗑️ Đã xóa khuôn mặt của ${hs?.name}`);
    } catch (err) {
      setStatus("❌ Lỗi xóa: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const hs = students.find((s) => s.id === selected);
  const idx = students.findIndex((s) => s.id === selected);

  return (
    <>
      <p style={{ background: "#dbeafe", padding: 10, borderRadius: 8 }}>
        💡 Chọn học sinh → nhìn thẳng camera → bấm <b>📸 Chụp</b>
      </p>

      <p>
        Đã chụp phiên này: <b style={{ color: "#10b981" }}>{soDaChup}</b> /{" "}
        {students.length}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        >
          {students.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.id} — {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            if (idx > 0) setSelected(students[idx - 1].id);
          }}
          style={{ background: "#94a3b8" }}
        >
          ⬅ Trước
        </button>
        <button
          onClick={() => {
            if (idx < students.length - 1) setSelected(students[idx + 1].id);
          }}
          style={{ background: "#94a3b8" }}
        >
          Sau ➡
        </button>
      </div>

      <div>
        <video
          ref={videoRef}
          autoPlay
          muted
          width="400"
          style={{
            borderRadius: 12,
            display: "block",
            marginBottom: 10,
            border: "3px solid #3b82f6",
          }}
        />
      </div>

      <button
        onClick={capture}
        disabled={!loaded || saving}
        style={{
          fontSize: 18,
          padding: "12px 24px",
          background: saving ? "#94a3b8" : "#3b82f6",
        }}
      >
        {saving ? "⏳ Đang xử lý..." : `📸 Chụp khuôn mặt cho ${hs?.name}`}
      </button>
      <button
        onClick={xoaMat}
        disabled={!loaded || saving}
        style={{ background: "#e74c3c", marginLeft: 10, padding: "12px 20px" }}
      >
        🗑️ Xóa khuôn mặt
      </button>

      {status && <div className="msg">{status}</div>}
    </>
  );
}

/* ---------- TAB ĐĂNG KÝ QR CCCD ---------- */
function TabDangKyQR({ students }) {
  const [selected, setSelected] = useState(students[0]?.id || "");
  const [status, setStatus] = useState("");
  const [scanning, setScanning] = useState(false);
  const [qrList, setQrList] = useState({});
  const [manual, setManual] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    loadQRs();
  }, []);

  useEffect(() => {
    if (students.length > 0 && !students.find((s) => s.id === selected)) {
      setSelected(students[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  async function loadQRs() {
    try {
      const data = await getQRs();
      setQrList(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function startScan() {
    setStatus("");
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 200));

    const scanner = new Html5Qrcode("qr-reader-dangky");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: { width: 350, height: 350 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          await saveQR(selected, decodedText);
          const hs = students.find((s) => s.id === selected);
          setStatus(`✅ Đã lưu QR cho: ${hs?.name}`);
          await loadQRs();
          stopScan();
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setStatus("Không mở được camera: " + err.message);
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function xoaQR(id) {
    const hs = students.find((s) => s.id === id);
    if (!window.confirm(`Xóa QR của ${hs?.name}?`)) return;
    await deleteQR(id);
    await loadQRs();
    setStatus(`🗑️ Đã xóa QR của ${hs?.name}`);
  }

  async function luuThuCong() {
    if (!manual.trim()) {
      setStatus("❌ Chưa nhập gì!");
      return;
    }
    await saveQR(selected, manual.trim());
    const hs = students.find((s) => s.id === selected);
    setStatus(`✅ Đã lưu thủ công cho: ${hs?.name}`);
    await loadQRs();
    setManual("");
  }

  const hs = students.find((s) => s.id === selected);
  const daDangKy = Object.keys(qrList).length;

  return (
    <>
      <p>
        Đã đăng ký: <b>{daDangKy}</b> / {students.length} học sinh
      </p>
      <p style={{ background: "#fef3c7", padding: 10, borderRadius: 8 }}>
        💡 Đưa CCCD cách camera 10–15cm, giữ yên 2–3 giây
      </p>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ padding: 8, fontSize: 16, marginBottom: 10 }}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id} — {s.name}
            {qrList[s.id] ? " ✅" : ""}
          </option>
        ))}
      </select>

      <div
        id="qr-reader-dangky"
        style={{
          width: 500,
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      ></div>

      {!scanning ? (
        <button onClick={startScan}>📷 Bắt đầu quét</button>
      ) : (
        <button onClick={stopScan} style={{ background: "#e74c3c" }}>
          ⏹ Dừng
        </button>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 15,
          background: "#f3f4f6",
          borderRadius: 8,
        }}
      >
        <b>⌨️ Nhập tay:</b>
        <div
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
        >
          <input
            type="text"
            placeholder="Dán nội dung QR"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "10px 14px",
              fontSize: 15,
              borderRadius: 8,
              border: "2px solid #e5e7eb",
            }}
          />
          <button onClick={luuThuCong}>💾 Lưu</button>
        </div>
      </div>

      {status && <div className="msg">{status}</div>}

      <h3 style={{ marginTop: 30 }}>Danh sách đã đăng ký</h3>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id} className={qrList[s.id] ? "dunggio" : "vang"}>
              <td>{i + 1}</td>
              <td>{s.name}</td>
              <td>{qrList[s.id] ? "✅ Đã có QR" : "❌ Chưa"}</td>
              <td>
                {qrList[s.id] && (
                  <button
                    onClick={() => xoaQR(s.id)}
                    style={{ background: "#e74c3c" }}
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------- TAB LỊCH SỬ ---------- */
function TabLichSu({
  students,
  ngayXem,
  danhSachNgay,
  attendanceNgay,
  onDoiNgay,
  onSua,
  onXoa,
}) {
  const [buoi, setBuoi] = useState("sang");
  const [suaModal, setSuaModal] = useState(null);
  const [suaStatus, setSuaStatus] = useState("Đúng giờ");
  const [suaTime, setSuaTime] = useState("");

  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0 };
  students.forEach((s) => {
    const a = (attendanceNgay[s.id] || {})[buoi];
    if (!a) dem["Vắng"]++;
    else dem[a.status] = (dem[a.status] || 0) + 1;
  });

  function moSuaModal(studentId) {
    const hs = students.find((s) => s.id === studentId);
    const a = (attendanceNgay[studentId] || {})[buoi];
    setSuaModal({ studentId, hs });
    setSuaStatus(a?.status || "Đúng giờ");
    setSuaTime(a?.time || new Date().toTimeString().slice(0, 5));
  }

  function luuSua() {
    if (suaModal) {
      onSua(suaModal.studentId, buoi, suaStatus, suaTime);
      setSuaModal(null);
    }
  }

  function formatNgay(ngay) {
    if (!ngay) return "";
    const [y, m, d] = ngay.split("-");
    return `${d}/${m}/${y}`;
  }

  if (!ngayXem) return <p>⏳ Đang tải...</p>;

  const [y, m, d] = ngayXem.split("-");
  const tenThu = new Date(`${y}-${m}-${d}`).toLocaleDateString("vi-VN", {
    weekday: "long",
  });

  return (
    <>
      <div className="chon-buoi" style={{ marginBottom: 15 }}>
        <span>Chọn buổi:</span>
        <button
          className={buoi === "sang" ? "active" : ""}
          onClick={() => setBuoi("sang")}
        >
          🌅 Sáng
        </button>
        <button
          className={buoi === "chieu" ? "active" : ""}
          onClick={() => setBuoi("chieu")}
        >
          🌆 Chiều
        </button>
      </div>

      <div className="lichsu-toolbar">
        <div className="lichsu-date-picker">
          <label>📅 Xem ngày:</label>
          <input
            type="date"
            value={ngayXem}
            onChange={(e) => onDoiNgay(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="lichsu-quick">
          <button
            onClick={() => onDoiNgay(new Date().toISOString().slice(0, 10))}
          >
            Hôm nay
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              onDoiNgay(d.toISOString().slice(0, 10));
            }}
          >
            Hôm qua
          </button>
        </div>
      </div>

      <p style={{ marginTop: 20 }}>
        📅 <b>{tenThu}</b>, ngày <b>{formatNgay(ngayXem)}</b> — Buổi{" "}
        <b>{buoi === "sang" ? "Sáng" : "Chiều"}</b>
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
            <th>Trạng thái</th>
            <th>Giờ vào</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const a = (attendanceNgay[s.id] || {})[buoi];
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
                <td>
                  <button
                    onClick={() => moSuaModal(s.id)}
                    style={{
                      background: "#3b82f6",
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ✏️ Sửa
                  </button>
                  {a && (
                    <button
                      onClick={() => onXoa(s.id, buoi)}
                      style={{
                        background: "#e74c3c",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {suaModal && (
        <div className="modal-sua" onClick={() => setSuaModal(null)}>
          <div className="modal-sua-box" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Sửa điểm danh</h3>
            <p>
              <b>{suaModal.hs?.name}</b> — Buổi{" "}
              {buoi === "sang" ? "Sáng" : "Chiều"} ngày {formatNgay(ngayXem)}
            </p>

            <div className="sua-group">
              <label>Trạng thái:</label>
              <select
                value={suaStatus}
                onChange={(e) => setSuaStatus(e.target.value)}
              >
                <option value="Đúng giờ">✅ Đúng giờ</option>
                <option value="Đi trễ">🟡 Đi trễ</option>
                <option value="Vắng">❌ Vắng</option>
              </select>
            </div>

            <div className="sua-group">
              <label>Giờ vào (hh:mm):</label>
              <input
                type="time"
                value={suaTime}
                onChange={(e) => setSuaTime(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button
                onClick={() => setSuaModal(null)}
                style={{ background: "#94a3b8" }}
              >
                ❌ Hủy
              </button>
              <button onClick={luuSua} style={{ background: "#10b981" }}>
                ✅ Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- TAB THỐNG KÊ ---------- */
function TabThongKe({ students, thangThongKe, duLieuThongKe, onDoiThang }) {
  const [sortBy, setSortBy] = useState("ten");

  if (!duLieuThongKe) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <p>⏳ Đang tải thống kê...</p>
      </div>
    );
  }

  const { soNgay, thongKe, dsNgay } = duLieuThongKe;

  const tongDungGio = thongKe.reduce((s, e) => s + e.dungGio, 0);
  const tongDiTre = thongKe.reduce((s, e) => s + e.diTre, 0);
  const tongVang = thongKe.reduce((s, e) => s + e.vang, 0);
  const tongBuoi = thongKe.reduce((s, e) => s + e.tongBuoi, 0);

  let dsSapXep = [...thongKe];
  if (sortBy === "ten") {
    dsSapXep.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "dunggio") {
    dsSapXep.sort((a, b) => b.dungGio - a.dungGio);
  } else if (sortBy === "tre") {
    dsSapXep.sort((a, b) => b.diTre - a.diTre);
  } else if (sortBy === "vang") {
    dsSapXep.sort((a, b) => b.vang - a.vang);
  }

  const top5Tre = [...thongKe]
    .filter((e) => e.diTre > 0)
    .sort((a, b) => b.diTre - a.diTre)
    .slice(0, 5);

  const top5Vang = [...thongKe]
    .filter((e) => e.vang > 0)
    .sort((a, b) => b.vang - a.vang)
    .slice(0, 5);

  function formatThang(t) {
    const [y, m] = t.split("-");
    return `Tháng ${parseInt(m)}/${y}`;
  }

  function tiLe(e) {
    if (e.tongBuoi === 0) return 0;
    return Math.round(((e.dungGio + e.diTre) / e.tongBuoi) * 100);
  }

  async function xuatExcel() {
    const XLSX = await import("xlsx");
    const rows = thongKe.map((e, i) => ({
      STT: i + 1,
      "Mã HS": e.id,
      "Họ tên": e.name,
      "Đúng giờ": e.dungGio,
      "Đi trễ": e.diTre,
      Vắng: e.vang,
      "Tổng buổi": e.tongBuoi,
      "Tỉ lệ chuyên cần (%)": tiLe(e),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ThongKe");
    XLSX.writeFile(wb, `ThongKe_${thangThongKe}.xlsx`);
  }

  return (
    <>
      <div className="lichsu-toolbar">
        <div className="lichsu-date-picker">
          <label>📅 Chọn tháng:</label>
          <input
            type="month"
            value={thangThongKe}
            onChange={(e) => onDoiThang(e.target.value)}
            max={new Date().toISOString().slice(0, 7)}
          />
        </div>
        <button onClick={xuatExcel} style={{ background: "#10b981" }}>
          📥 Xuất Excel tháng
        </button>
      </div>

      <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
        📊 Thống kê {formatThang(thangThongKe)}
      </h3>
      <p style={{ textAlign: "center", color: "#64748b" }}>
        Có <b>{soNgay}</b> ngày điểm danh trong tháng
      </p>

      <div className="thong-ke">
        <div className="card dunggio">
          ✅ Tổng đúng giờ <b>{tongDungGio}</b>
        </div>
        <div className="card tre">
          🟡 Tổng đi trễ <b>{tongDiTre}</b>
        </div>
        <div className="card vang">
          ❌ Tổng vắng <b>{tongVang}</b>
        </div>
      </div>

      <div className="top-grid">
        <div className="top-box">
          <h4>🥇 Top 5 đi trễ nhiều nhất</h4>
          {top5Tre.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>
              🎉 Không có ai đi trễ
            </p>
          ) : (
            <ol>
              {top5Tre.map((e, i) => (
                <li key={e.id}>
                  <span>
                    {i + 1}. {e.name}
                  </span>
                  <b style={{ color: "#f59e0b" }}>{e.diTre} lần</b>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="top-box">
          <h4>🥇 Top 5 vắng nhiều nhất</h4>
          {top5Vang.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>
              🎉 Không có ai vắng
            </p>
          ) : (
            <ol>
              {top5Vang.map((e, i) => (
                <li key={e.id}>
                  <span>
                    {i + 1}. {e.name}
                  </span>
                  <b style={{ color: "#dc2626" }}>{e.vang} buổi</b>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div style={{ marginTop: 25, marginBottom: 10 }}>
        <b>Sắp xếp theo: </b>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="ten">Tên A → Z</option>
          <option value="dunggio">Đúng giờ nhiều nhất</option>
          <option value="tre">Đi trễ nhiều nhất</option>
          <option value="vang">Vắng nhiều nhất</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã HS</th>
            <th>Họ tên</th>
            <th style={{ textAlign: "center" }}>✅ Đúng</th>
            <th style={{ textAlign: "center" }}>🟡 Trễ</th>
            <th style={{ textAlign: "center" }}>❌ Vắng</th>
            <th style={{ textAlign: "center" }}>Tổng</th>
            <th style={{ textAlign: "center" }}>Tỉ lệ</th>
          </tr>
        </thead>
        <tbody>
          {dsSapXep.map((e, i) => {
            const tl = tiLe(e);
            let cls = "vang";
            if (tl >= 90) cls = "dunggio";
            else if (tl >= 70) cls = "tre";
            return (
              <tr key={e.id} className={cls}>
                <td>{i + 1}</td>
                <td>{e.id}</td>
                <td>{e.name}</td>
                <td style={{ textAlign: "center", color: "#10b981" }}>
                  <b>{e.dungGio}</b>
                </td>
                <td style={{ textAlign: "center", color: "#f59e0b" }}>
                  <b>{e.diTre}</b>
                </td>
                <td style={{ textAlign: "center", color: "#dc2626" }}>
                  <b>{e.vang}</b>
                </td>
                <td style={{ textAlign: "center" }}>{e.tongBuoi}</td>
                <td style={{ textAlign: "center" }}>
                  <b>{tl}%</b>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {dsNgay.length > 0 && (
        <p style={{ marginTop: 15, fontSize: 13, color: "#94a3b8" }}>
          📅 Các ngày có dữ liệu: {dsNgay.join(", ")}
        </p>
      )}
    </>
  );
}