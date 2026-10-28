import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { layNgayHomNay } from "../thoiKhoaBieu";
import AnimatedNumber from "./AnimatedNumber";
import { SkeletonLoading } from "../UxComponents";

const EMPTY_THONG_KE = [];

function TabThongKe({ thangThongKe, duLieuThongKe, onDoiThang }) {
  const [sortBy, setSortBy] = useState("ten");
  const thongKe = duLieuThongKe?.thongKe ?? EMPTY_THONG_KE;
  const soNgay = duLieuThongKe?.soNgay ?? 0;
  const dsNgay = duLieuThongKe?.dsNgay ?? [];
  const tong = useMemo(() => {
    const totals = { dungGio: 0, diTre: 0, vang: 0, tongBuoi: 0 };
    thongKe.forEach((entry) => {
      totals.dungGio += entry.dungGio;
      totals.diTre += entry.diTre;
      totals.vang += entry.vang;
      totals.tongBuoi += entry.tongBuoi;
    });
    return totals;
  }, [thongKe]);
  const dsSapXep = useMemo(() => {
    const sorted = [...thongKe];
    if (sortBy === "ten") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "dunggio") {
      sorted.sort((a, b) => b.dungGio - a.dungGio);
    } else if (sortBy === "tre") {
      sorted.sort((a, b) => b.diTre - a.diTre);
    } else if (sortBy === "vang") {
      sorted.sort((a, b) => b.vang - a.vang);
    }
    return sorted;
  }, [thongKe, sortBy]);
  const top5Tre = useMemo(
    () =>
      thongKe
        .filter((entry) => entry.diTre > 0)
        .sort((a, b) => b.diTre - a.diTre)
        .slice(0, 5),
    [thongKe]
  );
  const top5Vang = useMemo(
    () =>
      thongKe
        .filter((entry) => entry.vang > 0)
        .sort((a, b) => b.vang - a.vang)
        .slice(0, 5),
    [thongKe]
  );

  if (!duLieuThongKe) {
    return <SkeletonLoading variant="stats" />;
  }

  const { dungGio: tongDungGio, diTre: tongDiTre, vang: tongVang } = tong;

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
            max={layNgayHomNay().slice(0, 7)}
          />
        </div>
        <motion.button
          onClick={xuatExcel}
          whileTap={{ scale: 0.95 }}
          style={{ background: "#10b981" }}
        >
          📥 Xuất Excel tháng
        </motion.button>
      </div>

      <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
        📊 Thống kê {formatThang(thangThongKe)}
      </h3>
      <p style={{ textAlign: "center", color: "#64748b" }}>
        Có <b><AnimatedNumber value={soNgay} /></b> ngày điểm danh trong tháng
      </p>

      <div className="thong-ke">
        <div className="card dunggio">
          ✅ Tổng đúng giờ <b><AnimatedNumber value={tongDungGio} /></b>
        </div>
        <div className="card tre">
          🟡 Tổng đi trễ <b><AnimatedNumber value={tongDiTre} /></b>
        </div>
        <div className="card vang">
          ❌ Tổng vắng <b><AnimatedNumber value={tongVang} /></b>
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
                  <b><AnimatedNumber value={e.dungGio} /></b>
                </td>
                <td style={{ textAlign: "center", color: "#f59e0b" }}>
                  <b><AnimatedNumber value={e.diTre} /></b>
                </td>
                <td style={{ textAlign: "center", color: "#dc2626" }}>
                  <b><AnimatedNumber value={e.vang} /></b>
                </td>
                <td style={{ textAlign: "center" }}>
                  <AnimatedNumber value={e.tongBuoi} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <b><AnimatedNumber value={tl} />%</b>
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

export default TabThongKe;
