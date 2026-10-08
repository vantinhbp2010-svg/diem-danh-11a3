import { useState, useEffect } from "react";
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
  const { students } = useStudents();
  const [tuan, setTuan] = useState(layTuanISO(new Date()));
  const [tab, setTab] = useState("lop");
  const [duLieu, setDuLieu] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

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
  }, [tuan]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getThiDuaTuan(tuan);
      setDuLieu(data);
    } catch (err) {
      console.error(err);
      setMsg("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Chuyển tuần trước/sau
  function chuyenTuan(delta) {
    const parts = tuan.split("-W");
    if (parts.length !== 2) return;

    let tuanSo = parseInt(parts[1]);
    const nam = parseInt(parts[0]);

    tuanSo += delta;
    if (tuanSo < 1) tuanSo = 1;

    setTuan(`${nam}-W${String(tuanSo).padStart(2, "0")}`);
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
        await themChoLop(tuan, item);
      } else {
        await themChoCaNhan(tuan, selected, item);
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
        await xoaCuaLop(tuan, index, loai);
      } else {
        await xoaCuaCaNhan(tuan, selected, index, loai);
      }
      await loadData();
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  if (loading || !duLieu) {
    return (
      <p style={{ textAlign: "center", padding: 40 }}>⏳ Đang tải...</p>
    );
  }

  const lopData = duLieu.lop || {
    diem: DIEM_BAN_DAU,
    viPham: [],
    khenThuong: [],
  };
  const lopXL = xepLoai(lopData.diem);

  const hsData = duLieu.caNhan?.[selected] || {
    diem: DIEM_BAN_DAU,
    viPham: [],
    khenThuong: [],
  };
  const hsXL = xepLoai(hsData.diem);

  const hs = students.find((s) => s.id === selected);

  const bxh = students
    .map((s) => {
      const d = duLieu.caNhan?.[s.id];
      return {
        id: s.id,
        name: s.name,
        diem: d ? d.diem : DIEM_BAN_DAU,
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
            style={{
              background: "#10b981",
              padding: "8px 14px",
            }}
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
              {lopData.diem}
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
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => {
                setModal({ loai: "viPham", doiTuong: "lop" });
                setChonMa("");
              }}
              style={{ background: "#dc2626", flex: 1 }}
            >
              ➖ Thêm vi phạm lớp
            </button>
            <button
              onClick={() => {
                setModal({ loai: "khenThuong", doiTuong: "lop" });
                setChonMa("");
              }}
              style={{ background: "#10b981", flex: 1 }}
            >
              ➕ Thêm khen thưởng lớp
            </button>
          </div>

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
              {hsData.diem}
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
              <button
                onClick={handleThem}
                style={{ background: "#10b981" }}
              >
                ✅ Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}