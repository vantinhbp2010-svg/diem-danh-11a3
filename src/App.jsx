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
  xacNhanKhongVang,
} from "./storage";
import { logout, getUser } from "./auth";
import News from "./News";
import TabThiDua from "./TabThiDua";
import QuanLyLop from "./QuanLyLop";
import TabThoiKhoaBieu from "./TabThoiKhoaBieu";
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

    // Tự động chuyển vắng khi mở app
    import("./storage").then(({ tuDongChuyenVang }) => {
      tuDongChuyenVang().then(() => loadData());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ============ ĐIỂM DANH ============
  async function handleMark(id, buoi, tiet) {
    try {
      const res = await markAttendance(id, buoi, tiet);
      setMsg(
        res.ok
          ? `Đã điểm danh tiết ${tiet} buổi ${
              buoi === "sang" ? "sáng" : "chiều"
            } lúc ${res.gioVao} — ${res.trangThai}${
              res.phutTre > 0 ? ` (trễ ${res.phutTre} phút)` : ""
            }`
          : res.message
      );
      await refresh();
      setTimeout(() => setMsg(""), 3000);
      return res;
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
  }

  async function handleXoa(id, buoi, tiet) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `Xóa điểm danh tiết ${tiet} buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        } của:\n\n${hs?.name} (${hs?.id})?`
      )
    )
      return;
    try {
      await xoaDiemDanh(id, buoi, tiet);
      setMsg(`Đã xóa điểm danh của ${hs?.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Lỗi xóa: " + err.message);
    }
  }

  async function handleSuaHomNay(id, buoi, tiet, status, time) {
    try {
      const data = await getAttendance();
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!data[todayStr]) data[todayStr] = {};
      if (!data[todayStr][id]) data[todayStr][id] = {};
      if (!data[todayStr][id][buoi]) data[todayStr][id][buoi] = {};

      let diemTru = 0;
      if (status === "Đi trễ") diemTru = -3;
      else if (status === "Vắng") diemTru = -10;
      else if (status === "Có phép") diemTru = -5;

      data[todayStr][id][buoi][`tiet${tiet}`] = {
        trangThai: status,
        gioVao: time,
        phutTre: 0,
        diemTru,
      };
      const { saveAttendance } = await import("./storage");
      await saveAttendance(data);

      setMsg(`✅ Đã sửa điểm danh`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi sửa: " + err.message);
    }
  }

  async function handleXacNhan(id, buoi, tiet) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `Xác nhận "${hs?.name}" VẮNG CÓ PHÉP tiết ${tiet} buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        }?\n\n` + `→ Chỉ trừ 5đ thay vì 10đ.`
      )
    )
      return;

    try {
      const res = await xacNhanKhongVang(id, today, buoi, tiet);
      if (res.ok) {
        setMsg(`✅ Đã xác nhận: ${hs?.name} — vắng có phép (chỉ trừ 5đ)`);
        await refresh();
      } else {
        setMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  async function handleXoaTatCa(id) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `⚠️ XÓA TẤT CẢ dữ liệu của:\n\n${hs?.name} (${hs?.id})\n\n` +
          `Bao gồm:\n` +
          `• Điểm danh\n` +
          `• Khuôn mặt đã đăng ký\n\n` +
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
    await updateAttendance(studentId, ngayXem, buoi, 1, status, time);
    setMsg(`Đã sửa điểm danh`);
    await doiNgay(ngayXem);
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleXoaNgay(studentId, buoi) {
    const hs = students.find((s) => s.id === studentId);
    if (
      !window.confirm(
        `Xóa TẤT CẢ điểm danh ${buoi === "sang" ? "sáng" : "chiều"} ngày ${
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
        "Sáng": JSON.stringify(sang),
        "Chiều": JSON.stringify(chieu),
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
        "⚠️ XÓA HẾT dữ liệu điểm danh, khuôn mặt trên CLOUD?\n\nKhông thể hoàn tác!"
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
            <TabDiemDanh
              students={students}
              attendance={attendance}
              today={today}
              total={total}
              buoi={buoiDangChon}
              maLop={maLop}
              onMark={handleMark}
              onXoa={handleXoa}
              onXoaTatCa={handleXoaTatCa}
              onSua={handleSuaHomNay}
              onXacNhan={handleXacNhan}
            />
          )}

          {tabCon === "camera" && (
            <TabCameraAI students={students} onMark={handleMark} />
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
              className={tabCon === "quanly" ? "active" : ""}
              onClick={() => setTabCon("quanly")}
            >
              📋 Quản lý lớp
            </button>
            <button
              className={tabCon === "tkb" ? "active" : ""}
              onClick={() => setTabCon("tkb")}
            >
              📅 Thời khóa biểu
            </button>
          </div>

          {tabCon === "dangky" && <TabDangKyMat students={students} />}
          {tabCon === "quanly" && <QuanLyLop />}
          {tabCon === "tkb" && <TabThoiKhoaBieu />}
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
   TAB ĐIỂM DANH
   ============================================================= */
function TabDiemDanh({
  students,
  attendance,
  today,
  total,
  buoi,
  maLop,
  onMark,
  onXoa,
  onXoaTatCa,
  onSua,
  onXacNhan,
}) {
  const [tietHienTai, setTietHienTai] = useState(null);
  const [tietThuCong, setTietThuCong] = useState(1);
  const [buoiThuCong, setBuoiThuCong] = useState("sang");
  const [tkbLop, setTkbLop] = useState(null);
  const [suaModal, setSuaModal] = useState(null);
  const [suaStatus, setSuaStatus] = useState("Đúng giờ");
  const [suaTime, setSuaTime] = useState("");

  useEffect(() => {
    async function capNhat() {
      const { tietDangDienRaTheoGio } = await import("./thoiKhoaBieu");
      const t = tietDangDienRaTheoGio();
      setTietHienTai(t);
      if (t) {
        setTietThuCong(t.tiet);
        setBuoiThuCong(t.buoi);
      }
    }
    capNhat();
    const timer = setInterval(capNhat, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadTKB() {
      try {
        if (!maLop) return;
        const { getTKB } = await import("./tkbStorage");
        const tkb = await getTKB(maLop);
        setTkbLop(tkb);
      } catch (err) {
        console.error("Lỗi load TKB:", err);
      }
    }
    loadTKB();
  }, [maLop]);

  const tiet = tietHienTai?.tiet || tietThuCong;
  const buoiHienTai = tietHienTai?.buoi || buoiThuCong;

  function tietCoHoc() {
    if (!tkbLop) return false;
    const day = new Date().getDay();
    if (day === 0) return false;
    const thu = `thu${day + 1}`;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoiHienTai === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoiHienTai === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  const coTiet = tietCoHoc();

  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0, "Có phép": 0 };
  students.forEach((s) => {
    const a = (attendance[s.id] || {})[buoiHienTai]?.[`tiet${tiet}`];
    if (!a) {
      if (coTiet) dem["Vắng"]++;
    } else {
      dem[a.trangThai] = (dem[a.trangThai] || 0) + 1;
    }
  });

  const tenBuoi = buoiHienTai === "sang" ? "Sáng" : "Chiều";

  function moSuaModal(studentId) {
    const hs = students.find((s) => s.id === studentId);
    const a = (attendance[studentId] || {})[buoiHienTai]?.[`tiet${tiet}`];
    setSuaModal({ studentId, hs });
    setSuaStatus(a?.trangThai || "Đúng giờ");
    setSuaTime(a?.gioVao || new Date().toTimeString().slice(0, 5));
  }

  function luuSua() {
    if (suaModal && onSua) {
      onSua(suaModal.studentId, buoiHienTai, tiet, suaStatus, suaTime);
      setSuaModal(null);
    }
  }

  return (
    <>
      {!coTiet ? (
        <div
          style={{
            background: "#fee2e2",
            borderLeft: "6px solid #dc2626",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#991b1b",
            }}
          >
            📭 Tiết {tiet} buổi {tenBuoi} KHÔNG CÓ HỌC
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#b91c1c" }}>
            Theo thời khóa biểu lớp — tiết này đánh dấu trống. Không tính vắng.
          </p>
        </div>
      ) : tietHienTai ? (
        <div
          style={{
            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
            borderLeft: "6px solid #10b981",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#065f46",
            }}
          >
            📚 Đang tiết {tiet} — Buổi {tenBuoi}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: "#047857" }}>
            ⏰ Thời gian: {tietHienTai.vao} — {tietHienTai.ra}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fef3c7",
            borderLeft: "6px solid #f59e0b",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#78350f",
            }}
          >
            ⏰ Hiện không trong tiết học nào
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#92400e" }}>
            Giáo viên có thể chọn buổi và tiết bên dưới để điểm danh thủ công.
          </p>
        </div>
      )}

      <p>
        Ngày: {today} — Buổi <b>{tenBuoi}</b>
      </p>

      {!tietHienTai && (
        <div
          style={{
            padding: 12,
            background: "#dbeafe",
            borderRadius: 10,
            marginBottom: 15,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <b>📚 Chọn buổi và tiết:</b>

          <select
            value={buoiThuCong}
            onChange={(e) => {
              const b = e.target.value;
              setBuoiThuCong(b);
              setTietThuCong(b === "sang" ? 1 : 2);
            }}
            style={{ padding: "8px 14px", fontSize: 15 }}
          >
            <option value="sang">🌅 Sáng</option>
            <option value="chieu">🌆 Chiều</option>
          </select>

          <select
            value={tietThuCong}
            onChange={(e) => setTietThuCong(Number(e.target.value))}
            style={{ padding: "8px 14px", fontSize: 15 }}
          >
            {(buoiThuCong === "sang" ? [1, 2, 3, 4, 5] : [2, 3, 4, 5]).map(
              (t) => (
                <option key={t} value={t}>
                  Tiết {t}
                </option>
              )
            )}
          </select>
        </div>
      )}

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
        {dem["Có phép"] > 0 && (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
              color: "#1e40af",
              borderBottom: "4px solid #3b82f6",
            }}
          >
            📝 Có phép (-5đ) <b>{dem["Có phép"]}</b>
          </div>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã HS</th>
            <th>Họ tên</th>
            <th>
              Trạng thái (Tiết {tiet}
              {!coTiet ? " — trống" : ""})
            </th>
            <th>Giờ vào</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const a = (attendance[s.id] || {})[buoiHienTai]?.[`tiet${tiet}`];
            let status = coTiet ? "❌ Vắng" : "📭 Tiết trống";
            let cls = coTiet ? "vang" : "";
            let laVang = !a && coTiet;

            if (a) {
              if (a.trangThai === "Đúng giờ") {
                status = "✅ Đúng giờ";
                cls = "dunggio";
              } else if (a.trangThai === "Đi trễ") {
                status = `🟡 Đi trễ (${a.phutTre}p)`;
                cls = "tre";
              } else if (a.trangThai === "Có phép") {
                status = "📝 Có phép (-5đ)";
                cls = "dunggio";
              } else if (a.trangThai === "Vắng") {
                status = "❌ Vắng";
                cls = "vang";
                laVang = true;
              }
            }

            return (
              <tr key={s.id} className={cls}>
                <td>{i + 1}</td>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.gioVao || "—" : "—"}</td>
                <td>
                  {!a && coTiet && (
                    <button onClick={() => onMark(s.id, buoiHienTai, tiet)}>
                      Điểm danh
                    </button>
                  )}
                  {!a && !coTiet && (
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                  )}
                  {laVang && onXacNhan && (
                    <button
                      onClick={() => onXacNhan(s.id, buoiHienTai, tiet)}
                      style={{
                        background: "#10b981",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                      title="Vắng có phép → chỉ trừ 5đ"
                    >
                      📝 Có phép
                    </button>
                  )}
                  {a && (
                    <button
                      onClick={() => onXoa(s.id, buoiHienTai, tiet)}
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
              <b>{suaModal.hs?.name}</b> — Tiết {tiet} buổi {tenBuoi} ngày{" "}
              {today}
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
                <option value="Có phép">📝 Có phép (không trừ)</option>
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

/* =============================================================
   TAB CAMERA AI
   ============================================================= */
function TabCameraAI({ students, onMark }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastLog, setLastLog] = useState([]);
  const [soNhanDien, setSoNhanDien] = useState(0);
  const [tietHienTai, setTietHienTai] = useState(null);
  const [tkbLop, setTkbLop] = useState(null);

  const faceIntervalRef = useRef(null);
  const markedInSessionRef = useRef(new Set());
  const faceapiRef = useRef(null);
  const matcherRef = useRef(null);
  const lastDetectRef = useRef(0);
  const tietTimerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [`[${time}] ${text}`, ...prev].slice(0, 30));
  }

  useEffect(() => {
    async function capNhat() {
      const { tietDangDienRaTheoGio } = await import("./thoiKhoaBieu");
      const t = tietDangDienRaTheoGio();
      setTietHienTai(t);
    }
    capNhat();
    tietTimerRef.current = setInterval(capNhat, 30000);
    return () => {
      if (tietTimerRef.current) clearInterval(tietTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function loadTKB() {
      try {
        const maLopHienTai = localStorage.getItem("lop_dang_chon");
        if (!maLopHienTai) return;
        const { getTKB } = await import("./tkbStorage");
        const tkb = await getTKB(maLopHienTai);
        setTkbLop(tkb);
      } catch (err) {
        console.error("Lỗi load TKB:", err);
      }
    }
    loadTKB();
  }, []);

  function tietCoHoc(buoi, tiet) {
    if (!tkbLop) return false;
    const day = new Date().getDay();
    if (day === 0) return false;
    const thu = `thu${day + 1}`;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoi === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  async function start() {
    setMsg("Đang tải model...");
    setLastLog([]);
    setSoNhanDien(0);
    markedInSessionRef.current = new Set();

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

    setMsg("Đang mở camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setRunning(true);
      setMsg("");
      startFace();
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
      if (now - lastDetectRef.current < 500) return;
      lastDetectRef.current = now;

      const videoEl = videoRef.current;
      if (!videoEl) return;
      if (videoEl.readyState < 2) return;
      if (!videoEl.videoWidth || !videoEl.videoHeight) return;
      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

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

              const { tietDangDienRaTheoGio } = await import("./thoiKhoaBieu");
              const t = tietDangDienRaTheoGio();

              if (!t) {
                addLog(`⏰ ${hs.name} — Chưa tới giờ vào tiết`);
                return;
              }

              if (!tietCoHoc(t.buoi, t.tiet)) {
                addLog(`📭 ${hs.name} — Tiết ${t.tiet} không có học`);
                return;
              }

              const res = await onMark(hs.id, t.buoi, t.tiet);
              setSoNhanDien((c) => c + 1);
              addLog(
                `🤖 ${hs.name} (${Math.round(
                  (1 - best.distance) * 100
                )}%) — Tiết ${t.tiet}${
                  res?.ok
                    ? ` (${res.trangThai}${
                        res.phutTre > 0 ? `, trễ ${res.phutTre}p` : ""
                      })`
                    : ""
                }`
              );
            }
          }
        }
      } catch (e) {
        console.warn("Lỗi detect:", e);
      }
    }, 500);
  }

  async function stop() {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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

  return (
    <>
      {tietHienTai ? (
        <div
          style={{
            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
            borderLeft: "6px solid #10b981",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#065f46",
            }}
          >
            📚 Đang tiết {tietHienTai.tiet} — Buổi{" "}
            {tietHienTai.buoi === "sang" ? "Sáng" : "Chiều"}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: "#047857" }}>
            ⏰ Thời gian: {tietHienTai.vao} — {tietHienTai.ra}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fef3c7",
            borderLeft: "6px solid #f59e0b",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#78350f",
            }}
          >
            ⏰ Hiện không trong tiết học nào
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#92400e" }}>
            Camera vẫn bật được — chỉ thông báo khi nhận diện sai giờ
          </p>
        </div>
      )}

      <p>
        Đã nhận diện:{" "}
        <b style={{ color: "#10b981" }}>{soNhanDien}</b> học sinh
      </p>

      <div
        style={{
          width: 600,
          maxWidth: "100%",
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {!running ? (
        <button
          onClick={start}
          style={{ fontSize: 18, padding: "12px 24px" }}
        >
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

/* =============================================================
   TAB ĐĂNG KÝ KHUÔN MẶT
   ============================================================= */
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

      const videoEl = videoRef.current;
      if (!videoEl) {
        setStatus("❌ Camera chưa sẵn sàng");
        setSaving(false);
        return;
      }
      if (videoEl.readyState < 2) {
        setStatus("❌ Camera chưa load xong — đợi 2 giây rồi thử lại");
        setSaving(false);
        return;
      }
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        setStatus("❌ Camera chưa có hình — kiểm tra kết nối camera");
        setSaving(false);
        return;
      }

      const det = await faceapi
        .detectSingleFace(videoEl, options)
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

/* =============================================================
   TAB LỊCH SỬ
   ============================================================= */
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
  const [tietXem, setTietXem] = useState(1);
  const [suaModal, setSuaModal] = useState(null);
  const [suaStatus, setSuaStatus] = useState("Đúng giờ");
  const [suaTime, setSuaTime] = useState("");

  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0 };
  students.forEach((s) => {
    const a = (attendanceNgay[s.id] || {})[buoi]?.[`tiet${tietXem}`];
    if (!a) dem["Vắng"]++;
    else dem[a.trangThai] = (dem[a.trangThai] || 0) + 1;
  });

  function moSuaModal(studentId) {
    const hs = students.find((s) => s.id === studentId);
    const a = (attendanceNgay[studentId] || {})[buoi]?.[`tiet${tietXem}`];
    setSuaModal({ studentId, hs });
    setSuaStatus(a?.trangThai || "Đúng giờ");
    setSuaTime(a?.gioVao || new Date().toTimeString().slice(0, 5));
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
        <span>Buổi:</span>
        <button
          className={buoi === "sang" ? "active" : ""}
          onClick={() => {
            setBuoi("sang");
            setTietXem(1);
          }}
        >
          🌅 Sáng
        </button>
        <button
          className={buoi === "chieu" ? "active" : ""}
          onClick={() => {
            setBuoi("chieu");
            setTietXem(2);
          }}
        >
          🌆 Chiều
        </button>

        <span style={{ marginLeft: 15 }}>Tiết:</span>
        <select
          value={tietXem}
          onChange={(e) => setTietXem(Number(e.target.value))}
          style={{ padding: "8px 14px", fontSize: 15 }}
        >
          {(buoi === "sang" ? [1, 2, 3, 4, 5] : [2, 3, 4, 5]).map((t) => (
            <option key={t} value={t}>
              Tiết {t}
            </option>
          ))}
        </select>
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
        <b>{buoi === "sang" ? "Sáng" : "Chiều"}</b> — Tiết <b>{tietXem}</b>
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
            const a = (attendanceNgay[s.id] || {})[buoi]?.[`tiet${tietXem}`];
            let status = "❌ Vắng";
            let cls = "vang";
            if (a) {
              if (a.trangThai === "Đúng giờ") {
                status = "✅ Đúng giờ";
                cls = "dunggio";
              } else if (a.trangThai === "Đi trễ") {
                status = `🟡 Đi trễ (${a.phutTre}p)`;
                cls = "tre";
              }
            }
            return (
              <tr key={s.id} className={cls}>
                <td>{i + 1}</td>
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.gioVao : "—"}</td>
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
              {buoi === "sang" ? "Sáng" : "Chiều"} tiết {tietXem} ngày{" "}
              {formatNgay(ngayXem)}
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

/* =============================================================
   TAB THỐNG KÊ
   ============================================================= */
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