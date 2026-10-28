import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ModalPortal from "../ModalPortal";
import { layGioPhutHienTai, layNgayHomNay } from "../thoiKhoaBieu";
import AnimatedNumber from "./AnimatedNumber";
import { SkeletonLoading } from "../UxComponents";

/* =============================================================
   TAB LỊCH SỬ
   ============================================================= */
function TabLichSu({
  students,
  ngayXem,
  attendanceNgay,
  loading,
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
    setSuaTime(a?.gioVao || layGioPhutHienTai());
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

  if (loading || !ngayXem) return <SkeletonLoading variant="table" rows={6} />;

  const [y, m, d] = ngayXem.split("-");
  const tenThu = new Date(`${y}-${m}-${d}`).toLocaleDateString("vi-VN", {
    weekday: "long",
  });

  return (
    <>
      <div className="chon-buoi" style={{ marginBottom: 15 }}>
        <span>Buổi:</span>
        <motion.button
          className={buoi === "sang" ? "active" : ""}
          onClick={() => {
            setBuoi("sang");
            setTietXem(1);
          }}
          whileTap={{ scale: 0.95 }}
        >
          🌅 Sáng
        </motion.button>
        <motion.button
          className={buoi === "chieu" ? "active" : ""}
          onClick={() => {
            setBuoi("chieu");
            setTietXem(2);
          }}
          whileTap={{ scale: 0.95 }}
        >
          🌆 Chiều
        </motion.button>

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
            max={layNgayHomNay()}
          />
        </div>

        <div className="lichsu-quick">
          <motion.button
            onClick={() => onDoiNgay(layNgayHomNay())}
            whileTap={{ scale: 0.95 }}
          >
            Hôm nay
          </motion.button>
          <motion.button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              onDoiNgay(layNgayHomNay(d));
            }}
            whileTap={{ scale: 0.95 }}
          >
            Hôm qua
          </motion.button>
        </div>
      </div>

      <p style={{ marginTop: 20 }}>
        📅 <b>{tenThu}</b>, ngày <b>{formatNgay(ngayXem)}</b> — Buổi{" "}
        <b>{buoi === "sang" ? "Sáng" : "Chiều"}</b> — Tiết <b>{tietXem}</b>
      </p>

      <div className="thong-ke">
        <div className="card dunggio">
          ✅ Đúng giờ <b><AnimatedNumber value={dem["Đúng giờ"]} /></b>
        </div>
        <div className="card tre">
          🟡 Đi trễ <b><AnimatedNumber value={dem["Đi trễ"]} /></b>
        </div>
        <div className="card vang">
          ❌ Vắng <b><AnimatedNumber value={dem["Vắng"]} /></b>
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
                  <motion.button
                    onClick={() => moSuaModal(s.id)}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: "#3b82f6",
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ✏️ Sửa
                  </motion.button>
                  {a && (
                    <motion.button
                      onClick={() => onXoa(s.id, buoi)}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: "#e74c3c",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                    >
                      🗑️
                    </motion.button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <AnimatePresence>
        {suaModal && (
          <ModalPortal key="sua-diem-danh-lich-su">
            <motion.div
              className="modal-sua"
              onClick={() => setSuaModal(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="modal-sua-box"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
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
                  <motion.button
                    onClick={() => setSuaModal(null)}
                    whileTap={{ scale: 0.95 }}
                    style={{ background: "#94a3b8" }}
                  >
                    ❌ Hủy
                  </motion.button>
                  <motion.button
                    onClick={luuSua}
                    whileTap={{ scale: 0.95 }}
                    style={{ background: "#10b981" }}
                  >
                    ✅ Lưu
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(TabLichSu);
