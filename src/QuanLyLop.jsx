import { useState, useRef } from "react";
import { useStudents } from "./StudentsContext";
import { saveDSLop, xoaLop } from "./lopStorage";
import "./App.css";

export default function QuanLyLop() {
  const { students, reload, maLop, danhSachLop, setStudents, chonLop } =
    useStudents();
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState([]);
  const [tenLopMoi, setTenLopMoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const fileRef = useRef(null);

  // Form thêm HS
  const [showThem, setShowThem] = useState(false);
  const [tenHSMoi, setTenHSMoi] = useState("");

  // Sinh mã HS theo lớp: 11A3-001, 11A3-002, ...
  function sinhMaHS(danhSachHienCo, lopCode) {
    if (!lopCode) lopCode = "XX";
    // Đếm số HS đã có mã bắt đầu bằng "<lopCode>-"
    const prefix = `${lopCode}-`;
    const soLonNhat = danhSachHienCo
      .filter((s) => String(s.id).startsWith(prefix))
      .map((s) => {
        const m = String(s.id).slice(prefix.length).match(/\d+/);
        return m ? parseInt(m[0]) : 0;
      })
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(soLonNhat + 1).padStart(3, "0")}`;
  }

  async function handleUploadExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    setMsg("⏳ Đang đọc file...");
    setDangXuLy(true);

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 1) {
        setMsg("❌ File không có dữ liệu");
        setDangXuLy(false);
        return;
      }

      // Mã lớp để đặt prefix
      const lopCode = (tenLopMoi.trim() || maLop || "").trim();
      if (!lopCode) {
        setMsg("❌ Chưa nhập mã lớp — nhập mã lớp trước khi import!");
        setDangXuLy(false);
        return;
      }

      // Bỏ dòng đầu nếu là tiêu đề
      let body = rows;
      const dongDau = String(rows[0]?.[0] || "").toLowerCase();
      if (
        dongDau.includes("tên") ||
        dongDau.includes("ten") ||
        dongDau.includes("name") ||
        dongDau.includes("họ") ||
        dongDau.includes("ho")
      ) {
        body = rows.slice(1);
      }

      const danhSach = [];
      let stt = 1;

      body.forEach((row) => {
        const ten = String(row[0] || "").trim();
        if (!ten) return;

        danhSach.push({
          id: `${lopCode}-${String(stt).padStart(3, "0")}`,
          name: ten,
          class: lopCode,
        });
        stt++;
      });

      if (danhSach.length === 0) {
        setMsg("❌ Không đọc được học sinh nào");
        setDangXuLy(false);
        return;
      }

      setPreview(danhSach);
      setMsg(
        `✅ Đã đọc ${danhSach.length} học sinh — mã dạng "${lopCode}-001" → "${lopCode}-${String(
          danhSach.length
        ).padStart(3, "0")}"`
      );
    } catch (err) {
      setMsg("❌ Lỗi đọc file: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleLuu() {
    const maLopDung = tenLopMoi.trim() || maLop;

    if (!maLopDung) {
      setMsg("❌ Chưa nhập mã lớp (VD: 11A3)");
      return;
    }

    if (preview.length === 0) {
      setMsg("❌ Chưa có danh sách để lưu");
      return;
    }

    if (
      !window.confirm(
        `Lưu danh sách ${preview.length} học sinh vào lớp "${maLopDung}"?\n\n` +
          `Mã HS sẽ có dạng: ${maLopDung}-001, ${maLopDung}-002, ...`
      )
    )
      return;

    setDangXuLy(true);
    try {
      const dsFinal = preview.map((s) => ({ ...s, class: maLopDung }));
      await saveDSLop(maLopDung, dsFinal);
      await reload();
      setMsg(`✅ Đã lưu ${dsFinal.length} HS vào lớp ${maLopDung}`);
      setPreview([]);
      setTenLopMoi("");
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi lưu: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

  // ============ THÊM 1 HỌC SINH ============
  async function handleThemHS() {
    if (!maLop) {
      setMsg("❌ Chưa chọn lớp");
      return;
    }
    if (!tenHSMoi.trim()) {
      setMsg("❌ Chưa nhập tên học sinh");
      return;
    }

    // Sinh mã HS theo lớp
    const maHS = sinhMaHS(students, maLop);

    const hsMoi = {
      id: maHS,
      name: tenHSMoi.trim(),
      class: maLop,
    };

    try {
      setDangXuLy(true);
      const dsMoi = [...students, hsMoi];
      await saveDSLop(maLop, dsMoi);
      await reload();

      setMsg(`✅ Đã thêm: ${hsMoi.name} (${hsMoi.id})`);
      setTenHSMoi("");
      setShowThem(false);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi thêm: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

  // ============ XÓA 1 HỌC SINH ============
  async function handleXoaHS(hs) {
    if (
      !window.confirm(
        `⚠️ XÓA học sinh khỏi lớp?\n\n${hs.name} (${hs.id})\n\n` +
          `Lưu ý: Chỉ xóa khỏi danh sách lớp. Điểm danh cũ vẫn còn.`
      )
    )
      return;

    try {
      setDangXuLy(true);
      const dsMoi = students.filter((s) => s.id !== hs.id);
      await saveDSLop(maLop, dsMoi);
      await reload();

      setMsg(`🗑️ Đã xóa: ${hs.name}`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi xóa: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleXoaLop() {
    if (!maLop) {
      setMsg("❌ Chưa có lớp nào");
      return;
    }
    if (
      !window.confirm(
        `Xóa lớp "${maLop}"?\n\nToàn bộ học sinh của lớp này sẽ bị xóa khỏi danh sách.`
      )
    )
      return;

    try {
      await xoaLop(maLop);
      await reload();
      setMsg(`✅ Đã xóa lớp ${maLop}`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi: " + err.message);
    }
  }

  async function handleXuatMau() {
    const XLSX = await import("xlsx");
    const data = [["Họ tên"], ["Nguyễn Văn An"], ["Trần Thị Bình"], ["Lê Văn Cường"]];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    XLSX.writeFile(wb, "mau_danh_sach_lop.xlsx");
  }

  const dsLopKeys = Object.keys(danhSachLop);
  const maHSTiepTheo = maLop ? sinhMaHS(students, maLop) : "";

  return (
    <>
      <h3>📋 Quản lý lớp</h3>

      <p
        style={{
          padding: 14,
          background: maLop ? "#d1fae5" : "#fef3c7",
          borderRadius: 10,
          fontSize: 14,
          borderLeft: `5px solid ${maLop ? "#10b981" : "#f59e0b"}`,
        }}
      >
        {maLop ? (
          <>
            ✅ Đang xem lớp <b>{maLop}</b> — có <b>{students.length}</b> học
            sinh.
            {dsLopKeys.length > 0 && (
              <>
                {" "}
                Tổng cộng <b>{dsLopKeys.length}</b> lớp đã tạo.
              </>
            )}
          </>
        ) : (
          <>
            ⚠️ Chưa có lớp nào. Hãy tạo lớp mới bằng cách <b>import Excel</b>{" "}
            bên dưới.
          </>
        )}
      </p>

      {msg && <div className="msg">{msg}</div>}

      {/* Danh sách lớp đã tạo */}
      {dsLopKeys.length > 0 && (
        <div
          style={{
            padding: 20,
            background: "#f8fafc",
            borderRadius: 14,
            marginTop: 20,
          }}
        >
          <h4>📚 Các lớp đã tạo ({dsLopKeys.length})</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dsLopKeys.map((k) => (
              <div
                key={k}
                onClick={() => {
                  if (k !== maLop) {
                    chonLop(k);
                  }
                }}
                style={{
                  padding: "10px 16px",
                  background: k === maLop ? "#667eea" : "white",
                  color: k === maLop ? "white" : "#1f2937",
                  borderRadius: 10,
                  border: "2px solid #e5e7eb",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: k === maLop ? "default" : "pointer",
                  transition: "all 0.2s",
                  boxShadow:
                    k === maLop
                      ? "0 4px 12px rgba(102, 126, 234, 0.4)"
                      : "0 2px 4px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={(e) => {
                  if (k !== maLop) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(102, 126, 234, 0.3)";
                    e.currentTarget.style.borderColor = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (k !== maLop) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.05)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }
                }}
              >
                Lớp {k} ({danhSachLop[k].soHS} HS)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ DANH SÁCH HỌC SINH HIỆN TẠI ============ */}
      {maLop && (
        <div
          style={{
            padding: 20,
            background: "#f8fafc",
            borderRadius: 14,
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 15,
            }}
          >
            <h4 style={{ margin: 0 }}>
              👥 Danh sách lớp {maLop} ({students.length} HS)
            </h4>
            <button
              onClick={() => setShowThem(!showThem)}
              style={{ background: "#10b981" }}
              disabled={dangXuLy}
            >
              {showThem ? "❌ Hủy" : "➕ Thêm học sinh"}
            </button>
          </div>

          {/* Form thêm HS */}
          {showThem && (
            <div
              style={{
                padding: 16,
                background: "#d1fae5",
                borderRadius: 12,
                marginBottom: 15,
                border: "2px solid #10b981",
              }}
            >
              <h4 style={{ margin: "0 0 12px", color: "#065f46" }}>
                ➕ Thêm học sinh mới vào lớp {maLop}
              </h4>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Họ tên <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={tenHSMoi}
                    onChange={(e) => setTenHSMoi(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: 15,
                      borderRadius: 8,
                      border: "2px solid #e5e7eb",
                      color: "#1f2937",
                      background: "white",
                      boxSizing: "border-box",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleThemHS();
                    }}
                    autoFocus
                  />
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    💡 Mã HS sẽ tự sinh: <b>{maHSTiepTheo}</b>
                  </p>
                </div>
                <button
                  onClick={handleThemHS}
                  disabled={dangXuLy || !tenHSMoi.trim()}
                  style={{
                    background: tenHSMoi.trim() ? "#10b981" : "#94a3b8",
                    padding: "10px 20px",
                    fontSize: 15,
                    minHeight: 44,
                  }}
                >
                  💾 Lưu
                </button>
              </div>
            </div>
          )}

          {/* Bảng danh sách HS */}
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã HS</th>
                  <th>Họ tên</th>
                  <th style={{ textAlign: "center" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => handleXoaHS(s)}
                        disabled={dangXuLy}
                        style={{
                          background: "#e74c3c",
                          padding: "5px 12px",
                          fontSize: 13,
                        }}
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Excel */}
      <div
        style={{
          padding: 20,
          background: "#f8fafc",
          borderRadius: 14,
          marginTop: 20,
        }}
      >
        <h4>📥 Tạo lớp mới từ Excel</h4>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          File Excel chỉ cần <b>1 cột duy nhất</b>: cột A = Họ tên học sinh.
          <br />
          Mã HS sẽ có dạng <code>11A3-001</code>, <code>11A3-002</code>, ...
          (dùng mã lớp làm prefix → mỗi lớp có mã riêng, không trùng nhau).
        </p>

        <div
          style={{
            marginTop: 15,
            marginBottom: 15,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Mã lớp mới <span style={{ color: "#dc2626" }}>*</span>:
          </label>
          <input
            type="text"
            value={tenLopMoi}
            onChange={(e) => setTenLopMoi(e.target.value)}
            placeholder="VD: 11A1, 12A5..."
            style={{
              padding: "10px 14px",
              fontSize: 15,
              borderRadius: 8,
              border: "2px solid #e5e7eb",
              width: 200,
              color: "#1f2937",
              background: "white",
            }}
          />
        </div>

        <div
          style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 15 }}
        >
          <button onClick={handleXuatMau} style={{ background: "#3b82f6" }}>
            📄 Tải file mẫu
          </button>
          <label
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            📤 Chọn file Excel
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadExcel}
              style={{ display: "none" }}
              disabled={dangXuLy}
            />
          </label>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>📋 Xem trước ({preview.length} em)</h4>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã HS</th>
                  <th>Họ tên</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
            <button
              onClick={handleLuu}
              disabled={dangXuLy}
              style={{ background: "#10b981", flex: 1 }}
            >
              💾 Lưu vào lớp {tenLopMoi || maLop || "(chưa có mã)"}
            </button>
            <button
              onClick={() => setPreview([])}
              style={{ background: "#94a3b8" }}
            >
              ❌ Hủy
            </button>
          </div>
        </div>
      )}

      {/* Xóa lớp hiện tại */}
      {maLop && (
        <div
          style={{
            marginTop: 30,
            padding: 15,
            background: "#fee2e2",
            borderRadius: 10,
            borderLeft: "5px solid #dc2626",
          }}
        >
          <h4 style={{ color: "#991b1b", marginTop: 0 }}>
            ⚠️ Vùng nguy hiểm
          </h4>
          <p style={{ fontSize: 13, color: "#991b1b" }}>
            Xóa lớp <b>{maLop}</b> khỏi hệ thống.
          </p>
          <button onClick={handleXoaLop} style={{ background: "#dc2626" }}>
            🗑️ Xóa lớp {maLop}
          </button>
        </div>
      )}
    </>
  );
}