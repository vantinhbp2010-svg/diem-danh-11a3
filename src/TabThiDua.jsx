import { useState, useEffect } from "react";
import { tinhDiemTruTuDong } from "./tinhDiemTuDong";
import {
  getNgayNghi,
  themNgayNghi,
  xoaNgayNghi,
} from "./ngayNghiStorage";
import { useStudents } from "./StudentsContext";
import {
  DANH_SACH_VI_PHAM,
  DANH_SACH_KHEN_THUONG,
  layTuanISO,
  tenTuan,
  khoangNgayTuan,
  xepLoai,
  DIEM_BAN_DAU,
} from "./diemThiDua";
import {
  getThiDuaTuan,
  themChoLop,
  themChoCaNhan,
  xoaCuaLop,
  xoaCuaCaNhan,
} from "./thiDuaStorage";
import "./App.css";

export default function TabThiDua() {
  const { students, maLop } = useStudents();
  const [tuan, setTuan] = useState(layTuanISO(new Date()));
  const [tab, setTab] = useState("lop");
  const [duLieu, setDuLieu] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [diemTuDong, setDiemTuDong] = useState({ diemTru: 0, chiTiet: {} });
  const [ngayNghi, setNgayNghi] = useState({});
  const [modalNgayNghi, setModalNgayNghi] = useState(false);
  const [ngayNghiMoi, setNgayNghiMoi] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [buoiNghiMoi, setBuoiNghiMoi] = useState("ca");

  const [selected, setSelected] = useState(students[0]?.id || "");
  const [modal, setModal] = useState(null);
  const [chonMa, setChonMa] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    if (students.length > 0 && !students.find((s) => s.id === selected)) {
      setSelected(students[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuan, maLop]);

  async function loadData() {
    if (!maLop) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getThiDuaTuan(maLop, tuan);
      setDuLieu(data);

      // Tính điểm trừ tự động từ điểm danh (bỏ qua ngày nghỉ)
      const tuDong = await tinhDiemTruTuDong(tuan, students, maLop);
      setDiemTuDong(tuDong);

      // Load danh sách ngày nghỉ
      const nghi = await getNgayNghi(maLop);
      setNgayNghi(nghi);
    } catch (err) {
      console.error(err);
      setMsg("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function chuyenTuan(delta) {
    const parts = tuan.split("-T");
    if (parts.length !== 2) return;
    let tuanSo = parseInt(parts[1]);
    const nam = parseInt(parts[0]);
    tuanSo += delta;
    if (tuanSo < 1) tuanSo = 1;
    setTuan(`${nam}-T${String(tuanSo).padStart(2, "0")}`);
  }

  function veTuanHienTai() {
    setTuan(layTuanISO(new Date()));
  }

  async function handleThem() {
    if (!chonMa) {
      setMsg("❌ Chưa chọn loại");
      return;
    }

    let item = null;
    if (modal.loai === "viPham") {
      const vp = DANH_SACH_VI_PHAM.find((v) => v.ma === chonMa);
      item = {
        ma: vp.ma,
        ten: vp.ten,
        diem: vp.diem,
        ngay: new Date().toISOString().slice(0, 10),
        ghiChu,
      };
    } else {
      const kt = DANH_SACH_KHEN_THUONG.find((k) => k.ma === chonMa);
      item = {
        ma: kt.ma,
        ten: kt.ten,
        diem: kt.diem,
        ngay: new Date().toISOString().slice(0, 10),
        ghiChu,
      };
    }

    try {
      if (modal.doiTuong === "lop") {
        await themChoLop(maLop, tuan, item);
      } else {
        await themChoCaNhan(maLop, tuan, selected, item);
      }
      setMsg("✅ Đã thêm");
      setModal(null);
      setChonMa("");
      setGhiChu("");
      await loadData();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  async function handleXoa(doiTuong, index, loai) {
    if (!window.confirm("Xóa mục này?")) return;
    try {
      if (doiTuong === "lop") {
        await xoaCuaLop(maLop, tuan, index, loai);
      } else {
        await xoaCuaCaNhan(maLop, tuan, selected, index, loai);
      }
      await loadData();
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  // ============ THÊM NGÀY NGHỈ ============
  async function handleThemNgayNghi() {
    if (!ngayNghiMoi) {
      setMsg("❌ Chưa chọn ngày");
      return;
    }
    try {
      const moi = await themNgayNghi(maLop, ngayNghiMoi, buoiNghiMoi);
      setNgayNghi(moi);
      setMsg(
        `✅ Đã đánh dấu nghỉ: ${ngayNghiMoi} (${
          buoiNghiMoi === "ca"
            ? "cả ngày"
            : buoiNghiMoi === "sang"
            ? "sáng"
            : "chiều"
        })`
      );
      setModalNgayNghi(false);
      await loadData();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  async function handleXoaNgayNghi(ngay, buoi) {
    if (
      !window.confirm(
        `Bỏ đánh dấu nghỉ ngày ${ngay} buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        }?`
      )
    )
      return;
    try {
      const moi = await xoaNgayNghi(maLop, ngay, buoi);
      setNgayNghi(moi || {});
      setMsg("✅ Đã bỏ đánh dấu nghỉ");
      await loadData();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  if (!maLop) {
    return (
      <div
        style={{
          padding: 30,
          background: "#fef3c7",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <b>⚠️ Chưa chọn lớp</b>
        <p>Vào nhóm 👥 Học sinh → 📋 Quản lý lớp để tạo lớp trước.</p>
      </div>
    );
  }

  if (loading || !duLieu) {
    return <p style={{ textAlign: "center", padding: 40 }}>⏳ Đang tải...</p>;
  }

  const lopData = duLieu.lop || {
    diem: DIEM_BAN_DAU,
    viPham: [],
    khenThuong: [],
  };

  const diemLopCuoi = lopData.diem + diemTuDong.diemTru;
  const lopXL = xepLoai(diemLopCuoi);

  const hsData = duLieu.caNhan?.[selected] || {
    diem: DIEM_BAN_DAU,
    viPham: [],
    khenThuong: [],
  };

  const chiTietHS = diemTuDong.chiTiet?.[selected] || {
    vang: 0,
    coPhep: 0,
    diTre: 0,
    diemTru: 0,
  };
  const diemHSCuoi = hsData.diem + chiTietHS.diemTru;
  const hsXL = xepLoai(diemHSCuoi);

  const hs = students.find((s) => s.id === selected);

  const bxh = students
    .map((s) => {
      const d = duLieu.caNhan?.[s.id];
      const diemNhapTay = d ? d.diem : DIEM_BAN_DAU;
      const chiTiet = diemTuDong.chiTiet?.[s.id] || { diemTru: 0 };
      return {
        id: s.id,
        name: s.name,
        diem: diemNhapTay + chiTiet.diemTru,
      };
    })
    .sort((a, b) => b.diem - a.diem);

  return (
    <>
      {/* THANH CHỌN TUẦN */}
      <div className="lichsu-toolbar">
        <div
          className="lichsu-date-picker"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <label>📅 Tuần:</label>
          <button
            onClick={() => chuyenTuan(-1)}
            style={{ background: "#3b82f6", padding: "8px 14px" }}
          >
            ← Tuần trước
          </button>
          <button
            onClick={veTuanHienTai}
            style={{ background: "#10b981", padding: "8px 14px" }}
          >
            Tuần hiện tại
          </button>
          <button
            onClick={() => chuyenTuan(1)}
            style={{ background: "#3b82f6", padding: "8px 14px" }}
          >
            Tuần sau →
          </button>
        </div>
        <div
          style={{
            fontSize: 15,
            color: "#1e3a8a",
            fontWeight: 700,
          }}
        >
          {tenTuan(tuan)} ({khoangNgayTuan(tuan)})
        </div>
      </div>

      {msg && <div className="msg">{msg}</div>}

      <div className="tabcon">
        <button
          className={tab === "lop" ? "active" : ""}
          onClick={() => setTab("lop")}
        >
          🏫 Điểm lớp
        </button>
        <button
          className={tab === "canhan" ? "active" : ""}
          onClick={() => setTab("canhan")}
        >
          👤 Điểm cá nhân
        </button>
        <button
          className={tab === "xephang" ? "active" : ""}
          onClick={() => setTab("xephang")}
        >
          🏆 Xếp hạng
        </button>
      </div>

      {/* TAB ĐIỂM LỚP */}
      {tab === "lop" && (
        <>
          <div
            className="card"
            style={{
              background: `linear-gradient(135deg, ${lopXL.mau}22, ${lopXL.mau}11)`,
              borderLeft: `6px solid ${lopXL.mau}`,
              padding: 25,
              borderRadius: 14,
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: 0, textAlign: "center" }}>
              🏫 Điểm thi đua lớp
            </h3>
            <p
              style={{
                fontSize: 48,
                textAlign: "center",
                margin: "15px 0",
                fontWeight: 800,
                color: lopXL.mau,
              }}
            >
              {diemLopCuoi}
            </p>
            <p
              style={{
                textAlign: "center",
                fontSize: 20,
                fontWeight: 700,
                color: lopXL.mau,
              }}
            >
              Xếp loại: {lopXL.ten}
            </p>
            <p
              style={{
                textAlign: "center",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Điểm chuẩn: {DIEM_BAN_DAU} / tuần
            </p>
            <p
              style={{
                textAlign: "center",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 700,
                margin: "8px 0 0",
              }}
            >
              🔻 Trừ tự động (điểm danh): {diemTuDong.diemTru}đ
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setModal({ loai: "viPham", doiTuong: "lop" });
                setChonMa("");
              }}
              style={{ background: "#dc2626", flex: 1, minWidth: 150 }}
            >
              ➖ Thêm vi phạm lớp
            </button>
            <button
              onClick={() => {
                setModal({ loai: "khenThuong", doiTuong: "lop" });
                setChonMa("");
              }}
              style={{ background: "#10b981", flex: 1, minWidth: 150 }}
            >
              ➕ Thêm khen thưởng lớp
            </button>
            <button
              onClick={() => setModalNgayNghi(true)}
              style={{ background: "#f59e0b", flex: 1, minWidth: 150 }}
            >
              🚫 Ngày không tính điểm
            </button>
          </div>

          {/* Hiển thị danh sách ngày nghỉ */}
          {Object.keys(ngayNghi).length > 0 && (
            <div
              style={{
                padding: 15,
                background: "#fef3c7",
                borderRadius: 12,
                marginBottom: 20,
                borderLeft: "5px solid #f59e0b",
              }}
            >
              <h4 style={{ margin: "0 0 10px", color: "#78350f" }}>
                🚫 Ngày không tính điểm ({Object.keys(ngayNghi).length} ngày)
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {Object.keys(ngayNghi)
                  .sort()
                  .map((ngay) =>
                    ngayNghi[ngay].map((buoi) => (
                      <div
                        key={`${ngay}-${buoi}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 12px",
                          background: "white",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <span>
                          📅 <b>{ngay}</b> —{" "}
                          {buoi === "sang"
                            ? "🌅 Sáng"
                            : buoi === "chieu"
                            ? "🌆 Chiều"
                            : buoi}
                        </span>
                        <button
                          onClick={() => handleXoaNgayNghi(ngay, buoi)}
                          style={{
                            background: "#e74c3c",
                            padding: "3px 8px",
                            fontSize: 11,
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
              </div>
            </div>
          )}

          <h4>📋 Lịch sử vi phạm</h4>
          {lopData.viPham.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                textAlign: "center",
                padding: 20,
              }}
            >
              Không có vi phạm nào 🎉
            </p>
          ) : (
            <ul className="ls-thidua">
              {lopData.viPham.map((v, i) => (
                <li key={i}>
                  <span>
                    <b style={{ color: "#dc2626" }}>{v.diem}</b> {v.ten}
                    <small style={{ color: "#94a3b8", marginLeft: 10 }}>
                      {v.ngay} {v.ghiChu && `— ${v.ghiChu}`}
                    </small>
                  </span>
                  <button
                    onClick={() => handleXoa("lop", i, "viPham")}
                    style={{
                      background: "#e74c3c",
                      padding: "3px 8px",
                      fontSize: 12,
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h4>🏆 Lịch sử khen thưởng</h4>
          {lopData.khenThuong.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                textAlign: "center",
                padding: 20,
              }}
            >
              Chưa có khen thưởng
            </p>
          ) : (
            <ul className="ls-thidua">
              {lopData.khenThuong.map((k, i) => (
                <li key={i}>
                  <span>
                    <b style={{ color: "#10b981" }}>+{k.diem}</b> {k.ten}
                    <small style={{ color: "#94a3b8", marginLeft: 10 }}>
                      {k.ngay} {k.ghiChu && `— ${k.ghiChu}`}
                    </small>
                  </span>
                  <button
                    onClick={() => handleXoa("lop", i, "khenThuong")}
                    style={{
                      background: "#e74c3c",
                      padding: "3px 8px",
                      fontSize: 12,
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* TAB ĐIỂM CÁ NHÂN */}
      {tab === "canhan" && (
        <>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              padding: 10,
              fontSize: 16,
              width: "100%",
              marginBottom: 20,
            }}
          >
            {students.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.id} — {s.name}
              </option>
            ))}
          </select>

          <div
            className="card"
            style={{
              background: `linear-gradient(135deg, ${hsXL.mau}22, ${hsXL.mau}11)`,
              borderLeft: `6px solid ${hsXL.mau}`,
              padding: 25,
              borderRadius: 14,
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: 0, textAlign: "center" }}>
              👤 {hs?.name}
            </h3>
            <p
              style={{
                fontSize: 48,
                textAlign: "center",
                margin: "15px 0",
                fontWeight: 800,
                color: hsXL.mau,
              }}
            >
              {diemHSCuoi}
            </p>
            <p
              style={{
                textAlign: "center",
                fontSize: 20,
                fontWeight: 700,
                color: hsXL.mau,
              }}
            >
              Xếp loại: {hsXL.ten}
            </p>

            <div
              style={{
                marginTop: 15,
                padding: 12,
                background: "white",
                borderRadius: 10,
                fontSize: 13,
                color: "#475569",
                borderLeft: "4px solid #dc2626",
              }}
            >
              <p style={{ margin: "4px 0" }}>
                🔻 <b>Trừ tự động (điểm danh):</b> {chiTietHS.diemTru}đ
              </p>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>
                • Vắng: {chiTietHS.vang || 0} buổi × 10đ ={" "}
                {(chiTietHS.vang || 0) * 10}đ
              </p>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>
                • Có phép: {chiTietHS.coPhep || 0} buổi × 5đ ={" "}
                {(chiTietHS.coPhep || 0) * 5}đ
              </p>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#64748b" }}>
                • Đi trễ: {chiTietHS.diTre || 0} tiết × 3đ ={" "}
                {(chiTietHS.diTre || 0) * 3}đ
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => {
                setModal({ loai: "viPham", doiTuong: "caNhan" });
                setChonMa("");
              }}
              style={{ background: "#dc2626", flex: 1 }}
            >
              ➖ Thêm vi phạm
            </button>
            <button
              onClick={() => {
                setModal({ loai: "khenThuong", doiTuong: "caNhan" });
                setChonMa("");
              }}
              style={{ background: "#10b981", flex: 1 }}
            >
              ➕ Thêm khen thưởng
            </button>
          </div>

          <h4>📋 Lịch sử vi phạm</h4>
          {hsData.viPham.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                textAlign: "center",
                padding: 20,
              }}
            >
              Không có vi phạm nào 🎉
            </p>
          ) : (
            <ul className="ls-thidua">
              {hsData.viPham.map((v, i) => (
                <li key={i}>
                  <span>
                    <b style={{ color: "#dc2626" }}>{v.diem}</b> {v.ten}
                    <small style={{ color: "#94a3b8", marginLeft: 10 }}>
                      {v.ngay} {v.ghiChu && `— ${v.ghiChu}`}
                    </small>
                  </span>
                  <button
                    onClick={() => handleXoa("caNhan", i, "viPham")}
                    style={{
                      background: "#e74c3c",
                      padding: "3px 8px",
                      fontSize: 12,
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h4>🏆 Lịch sử khen thưởng</h4>
          {hsData.khenThuong.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                textAlign: "center",
                padding: 20,
              }}
            >
              Chưa có khen thưởng
            </p>
          ) : (
            <ul className="ls-thidua">
              {hsData.khenThuong.map((k, i) => (
                <li key={i}>
                  <span>
                    <b style={{ color: "#10b981" }}>+{k.diem}</b> {k.ten}
                    <small style={{ color: "#94a3b8", marginLeft: 10 }}>
                      {k.ngay} {k.ghiChu && `— ${k.ghiChu}`}
                    </small>
                  </span>
                  <button
                    onClick={() => handleXoa("caNhan", i, "khenThuong")}
                    style={{
                      background: "#e74c3c",
                      padding: "3px 8px",
                      fontSize: 12,
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* TAB XẾP HẠNG */}
      {tab === "xephang" && (
        <>
          <h3 style={{ textAlign: "center" }}>
            🏆 Bảng xếp hạng {tenTuan(tuan)}
          </h3>
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Mã HS</th>
                <th>Họ tên</th>
                <th style={{ textAlign: "center" }}>Điểm</th>
                <th style={{ textAlign: "center" }}>Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              {bxh.map((e, i) => {
                const xl = xepLoai(e.diem);
                let medal = "";
                if (i === 0) medal = "🥇";
                else if (i === 1) medal = "🥈";
                else if (i === 2) medal = "🥉";

                let cls = "vang";
                if (e.diem >= 90) cls = "dunggio";
                else if (e.diem >= 80) cls = "tre";

                return (
                  <tr key={e.id} className={cls}>
                    <td style={{ textAlign: "center", fontSize: 18 }}>
                      {medal || i + 1}
                    </td>
                    <td>{e.id}</td>
                    <td>{e.name}</td>
                    <td style={{ textAlign: "center" }}>
                      <b style={{ color: xl.mau, fontSize: 16 }}>{e.diem}</b>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          background: xl.mau,
                          color: "white",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {xl.ten}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* MODAL NGÀY NGHỈ */}
      {modalNgayNghi && (
        <div className="modal-sua" onClick={() => setModalNgayNghi(false)}>
          <div className="modal-sua-box" onClick={(e) => e.stopPropagation()}>
            <h3>🚫 Đánh dấu ngày không tính điểm</h3>
            <p style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
              Ngày này sẽ không bị trừ điểm vắng/trễ
            </p>

            <div className="sua-group">
              <label>Chọn ngày:</label>
              <input
                type="date"
                value={ngayNghiMoi}
                onChange={(e) => setNgayNghiMoi(e.target.value)}
              />
            </div>

            <div className="sua-group">
              <label>Buổi:</label>
              <select
                value={buoiNghiMoi}
                onChange={(e) => setBuoiNghiMoi(e.target.value)}
              >
                <option value="ca">🚫 Cả ngày</option>
                <option value="sang">🌅 Chỉ Sáng</option>
                <option value="chieu">🌆 Chỉ Chiều</option>
              </select>
            </div>

            <div className="modal-buttons">
              <button
                onClick={() => setModalNgayNghi(false)}
                style={{ background: "#94a3b8" }}
              >
                ❌ Hủy
              </button>
              <button
                onClick={handleThemNgayNghi}
                style={{ background: "#f59e0b" }}
              >
                🚫 Đánh dấu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM */}
      {modal && (
        <div className="modal-sua" onClick={() => setModal(null)}>
          <div className="modal-sua-box" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modal.loai === "viPham"
                ? "➖ Thêm vi phạm"
                : "➕ Thêm khen thưởng"}
              {modal.doiTuong === "lop" ? " cho lớp" : ` cho ${hs?.name}`}
            </h3>

            <div className="sua-group">
              <label>Chọn loại:</label>
              <select
                value={chonMa}
                onChange={(e) => setChonMa(e.target.value)}
              >
                <option value="">-- Chọn --</option>
                {(modal.loai === "viPham"
                  ? DANH_SACH_VI_PHAM
                  : DANH_SACH_KHEN_THUONG
                ).map((item) => (
                  <option key={item.ma} value={item.ma}>
                    {item.ten} ({item.diem > 0 ? "+" : ""}
                    {item.diem})
                  </option>
                ))}
              </select>
            </div>

            <div className="sua-group">
              <label>Ghi chú (không bắt buộc):</label>
              <input
                type="text"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Ví dụ: Tiết 3 ngày 7/10"
              />
            </div>

            <div className="modal-buttons">
              <button
                onClick={() => setModal(null)}
                style={{ background: "#94a3b8" }}
              >
                ❌ Hủy
              </button>
              <button onClick={handleThem} style={{ background: "#10b981" }}>
                ✅ Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}