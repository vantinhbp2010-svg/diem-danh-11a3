import { useState, useRef } from "react";
import { useStudents } from "./StudentsContext";
import { saveDSLop, xoaLop } from "./lopStorage";
import "./App.css";

export default function QuanLyLop() {
  const { students, reload, maLop, danhSachLop, setStudents, chonLop } =
    useStudents();
  const [msg, setMsg] = useState("");
  const [tenLopMoi, setTenLopMoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const fileRef = useRef(null);

  const [showThem, setShowThem] = useState(false);
  const [tenHSMoi, setTenHSMoi] = useState("");

  function sinhMaHS(danhSachHienCo, lopCode) {
    if (!lopCode) lopCode = "XX";
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

    const lopCode = (tenLopMoi.trim() || maLop || "").trim();
    if (!lopCode) {
      setMsg("❌ Chưa nhập mã lớp — nhập mã lớp trước khi import!");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

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

      setMsg(`⏳ Đang lưu ${danhSach.length} HS vào lớp ${lopCode}...`);
      await saveDSLop(lopCode, danhSach);
      await reload();

      setMsg(`✅ Đã lưu ${danhSach.length} HS vào lớp ${lopCode}`);
      setTenLopMoi("");
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setMsg(""), 5000);
    } catch (err) {
      setMsg("❌ Lỗi import: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleThemHS() {
    if (!maLop) {
      setMsg("❌ Chưa chọn lớp");
      return;
    }
    if (!tenHSMoi.trim()) {
      setMsg("❌ Chưa nhập tên học sinh");
      return;
    }

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
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi thêm: " + err.message);
    } finally {
      setDangXuLy(false);
    }
  }

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
    const data = [
      ["Họ tên"],
      ["Nguyễn Văn An"],
      ["Trần Thị Bình"],
      ["Lê Văn Cường"],
    ];
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
          </>
        ) : (
          <>
            ⚠️ Chưa có lớp nào. Hãy tạo lớp mới bằng cách <b>import Excel</b>{" "}
            bên dưới.
          </>
        )}
      </p>

      {msg && <div className="msg">{msg}</div>}

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
                  if (k !== maLop) chonLop(k);
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
                }}
              >
                Lớp {k} ({danhSachLop[k].soHS} HS)
              </div>
            ))}
          </div>
        </div>
      )}

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
                ➕ Thêm học sinh mới
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
                  />
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
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
                  }}
                >
                  💾 Lưu
                </button>
              </div>
            </div>
          )}

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
          <label style={{ fontWeight: 600, fontSize: 14 }}>Mã lớp:</label>
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
          <button onClick={handleXuatMau} style={{ background: "#3b82f6" }}>
            📄 Tải file mẫu
          </button>
          <label
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: dangXuLy
                ? "#94a3b8"
                : "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              borderRadius: 8,
              cursor: dangXuLy ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {dangXuLy ? "⏳ Đang xử lý..." : "📤 Chọn file Excel"}
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
          <h4 style={{ color: "#991b1b", marginTop: 0 }}>⚠️ Vùng nguy hiểm</h4>
          <button onClick={handleXoaLop} style={{ background: "#dc2626" }}>
            🗑️ Xóa lớp {maLop}
          </button>
        </div>
      )}
    </>
  );
}