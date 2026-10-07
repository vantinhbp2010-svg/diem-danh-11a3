import { useState, useRef } from "react";
import { useStudents } from "./StudentsContext";
import { saveDSLop, xoaLop } from "./lopStorage";
import "./App.css";

export default function QuanLyLop() {
  const { students, reload, maLop, danhSachLop } = useStudents();
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState([]);
  const [tenLopMoi, setTenLopMoi] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const fileRef = useRef(null);

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

      if (rows.length < 2) {
        setMsg("❌ File không có dữ liệu");
        setDangXuLy(false);
        return;
      }

      const body = rows.slice(1);
      const danhSach = [];

      body.forEach((row, i) => {
        const ma = String(row[0] || "").trim();
        const ten = String(row[1] || "").trim();
        if (!ten) return;

        danhSach.push({
          id: ma || `HS${String(i + 1).padStart(3, "0")}`,
          name: ten,
          class: tenLopMoi || maLop || "11A3",
        });
      });

      if (danhSach.length === 0) {
        setMsg("❌ Không đọc được học sinh nào");
        setDangXuLy(false);
        return;
      }

      setPreview(danhSach);
      setMsg(`✅ Đã đọc ${danhSach.length} học sinh — bấm Lưu để áp dụng`);
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
        `Lưu danh sách ${preview.length} học sinh vào lớp "${maLopDung}"?`
      )
    )
      return;

    setDangXuLy(true);
    try {
      // Gán lại class cho HS
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
      ["Mã HS", "Họ tên"],
      ["HS001", "Nguyễn Văn An"],
      ["HS002", "Trần Thị Bình"],
      ["HS003", "Lê Văn Cường"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    XLSX.writeFile(wb, "mau_danh_sach_lop.xlsx");
  }

  const dsLopKeys = Object.keys(danhSachLop);

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
                style={{
                  padding: "10px 16px",
                  background: k === maLop ? "#667eea" : "white",
                  color: k === maLop ? "white" : "#1f2937",
                  borderRadius: 10,
                  border: "2px solid #e5e7eb",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Lớp {k} ({danhSachLop[k].soHS} HS)
              </div>
            ))}
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
          File Excel cần có <b>2 cột</b>: cột A = Mã HS, cột B = Họ tên. Dòng
          đầu là tiêu đề (sẽ bỏ qua).
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
            Mã lớp mới:
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
          <h4 style={{ color: "#991b1b", marginTop: 0 }}>⚠️ Vùng nguy hiểm</h4>
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