import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ModalPortal from "../ModalPortal";
import { layGioPhutHienTai, layThuHienTai } from "../thoiKhoaBieu";
import AnimatedNumber from "./AnimatedNumber";

/* =============================================================
   TAB ĐIỂM DANH
   ============================================================= */
function TabDiemDanh({
  students,
  attendance,
  today,
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
      const { tietDangDienRaTheoGio } = await import("../thoiKhoaBieu");
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
        const { getTKB } = await import("../tkbStorage");
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
    const thu = layThuHienTai();
    if (!thu) return false;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoiHienTai === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoiHienTai === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  const coTiet = tietCoHoc();

  const dem = useMemo(() => {
    const counts = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0, "Có phép": 0 };
    students.forEach((s) => {
      const a = (attendance[s.id] || {})[buoiHienTai]?.[`tiet${tiet}`];
      if (!a) {
        if (coTiet) counts["Vắng"]++;
      } else {
        counts[a.trangThai] = (counts[a.trangThai] || 0) + 1;
      }
    });
    return counts;
  }, [students, attendance, buoiHienTai, tiet, coTiet]);

  const tenBuoi = buoiHienTai === "sang" ? "Sáng" : "Chiều";

  function moSuaModal(studentId) {
    const hs = students.find((s) => s.id === studentId);
    const a = (attendance[studentId] || {})[buoiHienTai]?.[`tiet${tiet}`];
    setSuaModal({ studentId, hs });
    setSuaStatus(a?.trangThai || "Đúng giờ");
    setSuaTime(a?.gioVao || layGioPhutHienTai());
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
          ✅ Đúng giờ <b><AnimatedNumber value={dem["Đúng giờ"]} /></b>
        </div>
        <div className="card tre">
          🟡 Đi trễ <b><AnimatedNumber value={dem["Đi trễ"]} /></b>
        </div>
        <div className="card vang">
          ❌ Vắng <b><AnimatedNumber value={dem["Vắng"]} /></b>
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
            📝 Có phép (-5đ) <b><AnimatedNumber value={dem["Có phép"]} /></b>
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
              <motion.tr
                key={s.id}
                className={cls}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
                whileHover={{ scale: 1.01, backgroundColor: "#f8fafc" }}
                style={{ transformOrigin: "left center" }}
              >
                <td>{i + 1}</td>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>
                  <motion.span
                    key={a?.trangThai || status}
                    initial={a ? { scale: 0.6, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {status}
                  </motion.span>
                </td>
                <td>{a ? a.gioVao || "—" : "—"}</td>
                <td>
                  {!a && coTiet && (
                    <motion.button
                      onClick={() => onMark(s.id, buoiHienTai, tiet)}
                      whileTap={{ scale: 0.95 }}
                    >
                      Điểm danh
                    </motion.button>
                  )}
                  {!a && !coTiet && (
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                  )}
                  {laVang && onXacNhan && (
                    <motion.button
                      onClick={() => onXacNhan(s.id, buoiHienTai, tiet)}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: "#10b981",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                      title="Vắng có phép → chỉ trừ 5đ"
                    >
                      📝 Có phép
                    </motion.button>
                  )}
                  {a && (
                    <motion.button
                      onClick={() => onXoa(s.id, buoiHienTai, tiet)}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: "#f59e0b",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                    >
                      🗑️
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => moSuaModal(s.id)}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: "#3b82f6",
                      marginLeft: 4,
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ✏️ Sửa
                  </motion.button>
                  <motion.button
                    onClick={() => onXoaTatCa(s.id)}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: "#dc2626",
                      marginLeft: 4,
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                  >
                    ❌
                  </motion.button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      <AnimatePresence>
        {suaModal && (
          <ModalPortal key="sua-diem-danh">
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

export default memo(TabDiemDanh);
