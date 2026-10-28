import {
  lazy,
  Suspense,
  useCallback,
  useState,
  useEffect,
  Component,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { layNgayHomNay } from "./thoiKhoaBieu";
import {
  getAttendanceByMonth,
  markAttendance,
  xoaDiemDanh,
  xoaTatCaCuaHocSinh,
  getAttendanceByDate,
  updateAttendance,
  xoaDiemDanhTheoNgay,
  tinhThongKeThang,
  xacNhanKhongVang,
} from "./storage";
import { logout, getUser, subscribeTeacherState } from "./auth";
import { useStudents } from "./StudentsContext";
import "./App.css";

const News = lazy(() => import("./News"));
const TabThiDua = lazy(() => import("./TabThiDua"));
const QuanLyLop = lazy(() => import("./QuanLyLop"));
const TabThoiKhoaBieu = lazy(() => import("./TabThoiKhoaBieu"));
const TabQuanLyTaiKhoan = lazy(() => import("./TabQuanLyTaiKhoan"));
const TabDiemDanh = lazy(() => import("./tabs/TabDiemDanh"));
const TabCameraAI = lazy(() => import("./tabs/TabCameraAI"));
const TabLichSu = lazy(() => import("./tabs/TabLichSu"));
const TabThongKe = lazy(() => import("./tabs/TabThongKe"));
const TabDangKyMat = lazy(() => import("./tabs/TabDangKyMat"));

function SkeletonLoading() {
  return (
    <div className="tab-skeleton" role="status" aria-label="Đang tải nội dung">
      <span />
      <span />
      <span />
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            color: "#dc2626",
            background: "#fee2e2",
            borderRadius: 10,
            margin: "20px 0",
          }}
        >
          <h4 style={{ margin: "0 0 10px" }}>
            ⚠️ Có lỗi xảy ra khi tải tính năng này
          </h4>
          <p style={{ margin: 0, fontSize: 14 }}>
            {this.state.error?.message}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 13 }}>
            Vui lòng tải lại trang hoặc kiểm tra cấu hình Server (Vercel API).
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [nhom, setNhom] = useState("diemdanh");
  const [tabCon, setTabCon] = useState("homnay");
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState(() => layNgayHomNay());
  const [msg, setMsg] = useState("");

  const [ngayXem, setNgayXem] = useState("");
  const [attendanceNgay, setAttendanceNgay] = useState({});
  const [thangThongKe, setThangThongKe] = useState(() => {
    return layNgayHomNay().slice(0, 7);
  });
  const [duLieuThongKe, setDuLieuThongKe] = useState(null);

  const navigate = useNavigate();
  const user = getUser();
  const { students, maLop, danhSachLop, chonLop } = useStudents();

  useEffect(() => {
    return subscribeTeacherState(({ isAdmin: admin }) => {
      setIsAdmin(admin === true);
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const d = layNgayHomNay();
      const monthData = await getAttendanceByMonth(d.slice(0, 7));
      setAttendance(monthData[d] || {});
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setMsg("Lỗi tải dữ liệu từ cloud: " + err.message);
    }
  }, []);

  useEffect(() => {
    async function initApp() {
      try {
        const { tuDongChuyenVang } = await import("./storage");
        await tuDongChuyenVang();
      } catch (error) {
        console.error("Lỗi khởi tạo app:", error);
      }

      await loadData();
    }

    initApp();
  }, [loadData]);

  // ============ LOAD DATA ============
  const refresh = useCallback(async () => {
    try {
      const currentDate = layNgayHomNay();
      const monthData = await getAttendanceByMonth(currentDate.slice(0, 7));
      setToday(currentDate);
      setAttendance(monthData[currentDate] || {});
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ============ ĐIỂM DANH ============
  const handleMark = useCallback(async (id, buoi, tiet) => {
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
      return { ok: false, message: err.message };
    }
  }, [refresh]);

  const handleXoa = useCallback(async (id, buoi, tiet) => {
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
  }, [students, refresh]);

  const handleSuaHomNay = useCallback(async (id, buoi, tiet, status, time) => {
    try {
      const todayStr = layNgayHomNay();
      const data = await getAttendanceByMonth(todayStr.slice(0, 7));
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
      await saveAttendance(data, todayStr.slice(0, 7));

      setMsg(`✅ Đã sửa điểm danh`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi sửa: " + err.message);
    }
  }, [refresh]);

  const handleXacNhan = useCallback(async (id, buoi, tiet) => {
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
  }, [students, today, refresh]);

  const handleXoaTatCa = useCallback(async (id) => {
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
      await xoaTatCaCuaHocSinh(id, maLop);
      setMsg(`✅ Đã xóa toàn bộ dữ liệu của ${hs?.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi xóa: " + err.message);
    }
  }, [students, maLop, refresh]);

  // ============ LỊCH SỬ ============
  const loadLichSu = useCallback(async () => {
    try {
      const ngay = ngayXem || layNgayHomNay();
      if (!ngayXem) setNgayXem(ngay);
      const data = await getAttendanceByDate(ngay);
      setAttendanceNgay(data);
    } catch (err) {
      console.error(err);
    }
  }, [ngayXem]);

  const doiNgay = useCallback(async (ngay) => {
    setNgayXem(ngay);
    const data = await getAttendanceByDate(ngay);
    setAttendanceNgay(data);
  }, []);

  const handleSuaDiemDanh = useCallback(async (studentId, buoi, status, time) => {
    await updateAttendance(studentId, ngayXem, buoi, 1, status, time);
    setMsg(`Đã sửa điểm danh`);
    await doiNgay(ngayXem);
    setTimeout(() => setMsg(""), 3000);
  }, [ngayXem, doiNgay]);

  const handleXoaNgay = useCallback(async (studentId, buoi) => {
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
  }, [students, ngayXem, doiNgay]);

  // ============ THỐNG KÊ ============
  const loadThongKe = useCallback(async (thang) => {
    try {
      const thangDung = thang || thangThongKe;
      setThangThongKe(thangDung);
      const data = await tinhThongKeThang(thangDung, students);
      setDuLieuThongKe(data);
    } catch (err) {
      console.error("Lỗi thống kê:", err);
      setMsg("Lỗi tải thống kê: " + err.message);
    }
  }, [students, thangThongKe]);

  // ============ EXCEL ============
  async function exportExcel() {
    const XLSX = await import("xlsx");
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
      const { clearAllAttendance } = await import("./storage");
      const { clearAllFaces } = await import("./faceStorage");
      await clearAllAttendance();
      await clearAllFaces();
      alert("✅ Đã xóa hết dữ liệu!");
      window.location.reload();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  }

  async function handleBackupFirebase() {
    try {
      const { db } = await import("./firebase");
      const { collection, getDocs } = await import("firebase/firestore");

      const snapshot = {
        generatedAt: new Date().toISOString(),
        app: "diem-danh-11a3",
        data: {},
      };
      const attendanceDocs = await getDocs(collection(db, "diemdanh"));
      attendanceDocs.forEach((entry) => {
        snapshot.data[`diemdanh/${entry.id}`] = entry.data();
      });

      const lopSnap = await getDocs(collection(db, "lop"));
      for (const entry of lopSnap.docs) {
        snapshot.data[`lop/${entry.id}`] = entry.data();
        for (const subcollection of ["faces", "thoiKhoaBieu"]) {
          const subdocs = await getDocs(
            collection(db, "lop", entry.id, subcollection)
          );
          subdocs.forEach((subdoc) => {
            snapshot.data[
              `lop/${entry.id}/${subcollection}/${subdoc.id}`
            ] = subdoc.data();
          });
        }
      }
      const newsSnap = await getDocs(collection(db, "news"));
      newsSnap.forEach((entry) => {
        snapshot.data[`news/${entry.id}`] = entry.data();
      });

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-firebase-${new Date().toISOString().slice(0, 16).replace(":", "").replace(":", "")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMsg("✅ Đã xuất backup Firestore");
      setTimeout(() => setMsg(""), 2500);
    } catch (error) {
      console.error("Backup lỗi:", error);
      setMsg("❌ Backup thất bại: " + error.message);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  async function handleRestoreFirebase(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm("📥 Tải dữ liệu Firestore từ file backup lên máy chủ? Hành động này sẽ ghi đè dữ liệu hiện tại.");
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const { db } = await import("./firebase");
      const { doc, setDoc } = await import("firebase/firestore");

      const documentData = payload.data || {};
      for (const [path, value] of Object.entries(documentData)) {
        await setDoc(doc(db, ...path.split("/")), value);
      }

      const legacyDocs = ["all", "faces", "thiDua", "thoiKhoaBieu", "ngayNghi"];
      for (const key of legacyDocs) {
        const value = payload[`diemdanh_${key}`];
        if (value !== undefined && value !== null) {
          await setDoc(doc(db, "diemdanh", key), value);
        }
      }
      const lopData = payload.lop || {};
      for (const [lopKey, value] of Object.entries(lopData)) {
        await setDoc(doc(db, "lop", lopKey), value);
      }

      setMsg("✅ Đã phục hồi dữ liệu Firestore");
      setTimeout(() => setMsg(""), 2500);
      window.location.reload();
    } catch (error) {
      console.error("Restore lỗi:", error);
      setMsg("❌ Restore thất bại: " + error.message);
      setTimeout(() => setMsg(""), 3000);
    } finally {
      event.target.value = "";
    }
  }

  async function handleLogout() {
    if (window.confirm("Đăng xuất?")) {
      try {
        await logout();
        navigate("/");
      } catch (error) {
        setMsg(`Không thể đăng xuất: ${error.message}`);
      }
    }
  }

  const total = students.length;

  // ✅ Nếu chưa có lớp HOẶC lớp rỗng → hiện thông báo
  if (!maLop || students.length === 0) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="container">
        <div className="header-row">
          <h1>📋 Chưa có danh sách học sinh</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "#f8fafc",
            borderRadius: 16,
            border: "2px dashed #cbd5e1",
            margin: "30px 0",
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
            Chưa có danh sách lớp
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: 15,
              marginBottom: 24,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Để bắt đầu sử dụng, bạn cần <b>tạo lớp</b> và <b>nhập danh sách
            học sinh</b> từ file Excel.
          </p>
          <button
            onClick={() => {
              setNhom("hocsinh");
              setTabCon("quanly");
            }}
            style={{
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              fontSize: 16,
              padding: "14px 28px",
              fontWeight: 700,
            }}
          >
            ➕ Tạo lớp & nhập danh sách
          </button>
        </div>

        {/* Vẫn cho phép vào nhóm Học sinh để tạo lớp */}
        <div className="nhom-tabs">
          <button
            className={nhom === "hocsinh" ? "active" : ""}
            onClick={() => {
              setNhom("hocsinh");
              setTabCon("quanly");
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

        <AnimatePresence mode="wait" initial={false}>
          {nhom === "hocsinh" && (
            <motion.div
              key="hocsinh"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
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
              <AnimatePresence mode="wait" initial={false}>
                {tabCon === "quanly" && (
                  <motion.div
                    key="quanly"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Suspense fallback={<SkeletonLoading />}>
                      <QuanLyLop />
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {nhom === "news" && (
            <motion.div
              key="news"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <Suspense fallback={<SkeletonLoading />}>
                <News laGiaoVien={true} tenNguoiDung={user} />
              </Suspense>
            </motion.div>
          )}
          {nhom === "thidua" && (
            <motion.div
              key="thidua"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <Suspense fallback={<SkeletonLoading />}>
                <TabThiDua />
              </Suspense>
            </motion.div>
          )}
          {nhom === "caidat" && (
            <motion.div
              key="caidat"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="caidat-box"
            >
              <h3>⚙️ Cài đặt & Báo cáo</h3>
              {!isAdmin && (
                <p role="status">
                  Quản lý tài khoản chỉ dành cho tài khoản đã được cấp quyền
                  quản trị (admin).
                </p>
              )}
              {isAdmin && (
                <ErrorBoundary>
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabQuanLyTaiKhoan />
                  </Suspense>
                </ErrorBoundary>
              )}
              <div className="caidat-grid">
                <button onClick={handleLogout} className="caidat-btn">
                  🚪 Đăng xuất
                </button>
              </div>
              <div className="caidat-info">
                <p>
                  <b>Tài khoản:</b> {user}
                </p>
                <p>
                  <b>Trạng thái:</b> Chưa có lớp
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="container">
      <div className="header-row">
        <h1>📋 Điểm danh lớp {danhSachLop[maLop]?.tenHienThi || maLop}</h1>
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
                  {danhSachLop[k].tenHienThi || `Lớp ${k}`} ({danhSachLop[k].soHS} HS)
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

      <AnimatePresence mode="wait" initial={false}>
        {nhom === "diemdanh" && (
          <motion.div
            key="diemdanh"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
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
            <AnimatePresence mode="wait" initial={false}>
              {tabCon === "homnay" && (
                <motion.div
                  key="homnay"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabDiemDanh
                      students={students}
                      attendance={attendance}
                      today={today}
                      maLop={maLop}
                      onMark={handleMark}
                      onXoa={handleXoa}
                      onXoaTatCa={handleXoaTatCa}
                      onSua={handleSuaHomNay}
                      onXacNhan={handleXacNhan}
                    />
                  </Suspense>
                </motion.div>
              )}
              {tabCon === "camera" && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabCameraAI
                      students={students}
                      maLop={maLop}
                      onMark={handleMark}
                    />
                  </Suspense>
                </motion.div>
              )}
              {tabCon === "lichsu" && (
                <motion.div
                  key="lichsu"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabLichSu
                      students={students}
                      ngayXem={ngayXem}
                      attendanceNgay={attendanceNgay}
                      onDoiNgay={doiNgay}
                      onSua={handleSuaDiemDanh}
                      onXoa={handleXoaNgay}
                    />
                  </Suspense>
                </motion.div>
              )}
              {tabCon === "thongke" && (
                <motion.div
                  key="thongke"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabThongKe
                      thangThongKe={thangThongKe}
                      duLieuThongKe={duLieuThongKe}
                      onDoiThang={loadThongKe}
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {nhom === "hocsinh" && (
          <motion.div
            key="hocsinh"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
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
            <AnimatePresence mode="wait" initial={false}>
              {tabCon === "dangky" && (
                <motion.div
                  key="dangky"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabDangKyMat students={students} maLop={maLop} />
                  </Suspense>
                </motion.div>
              )}
              {tabCon === "quanly" && (
                <motion.div
                  key="quanly"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <QuanLyLop />
                  </Suspense>
                </motion.div>
              )}
              {tabCon === "tkb" && (
                <motion.div
                  key="tkb"
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Suspense fallback={<SkeletonLoading />}>
                    <TabThoiKhoaBieu maLop={maLop} />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {nhom === "news" && (
          <motion.div
            key="news"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <Suspense fallback={<SkeletonLoading />}>
              <News laGiaoVien={true} tenNguoiDung={user} />
            </Suspense>
          </motion.div>
        )}
        {nhom === "thidua" && (
          <motion.div
            key="thidua"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <Suspense fallback={<SkeletonLoading />}>
              <TabThiDua />
            </Suspense>
          </motion.div>
        )}
        {nhom === "caidat" && (
          <motion.div
            key="caidat"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="caidat-box"
          >
            <h3>⚙️ Cài đặt & Báo cáo</h3>
            {!isAdmin && (
              <p role="status">
                Quản lý tài khoản chỉ dành cho tài khoản đã được cấp quyền
                quản trị (admin).
              </p>
            )}
            {isAdmin && (
              <ErrorBoundary>
                <Suspense fallback={<SkeletonLoading />}>
                  <TabQuanLyTaiKhoan />
                </Suspense>
              </ErrorBoundary>
            )}
            <div className="caidat-grid">
              <button onClick={handleBackupFirebase} className="caidat-btn">
                💾 Backup
              </button>
              <label
                className="caidat-btn"
                style={{ cursor: "pointer", textAlign: "center" }}
              >
                📥 Restore
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreFirebase}
                  style={{ display: "none" }}
                />
              </label>
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
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
