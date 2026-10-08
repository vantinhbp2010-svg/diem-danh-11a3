import { useState, useEffect } from "react";
import { useStudents } from "./StudentsContext";
import { getTKB, saveTKB, xoaTKB } from "./tkbStorage";
import { GIO_SANG, GIO_CHIEU, TEN_THU, tkbDayDu } from "./thoiKhoaBieu";
import "./App.css";

export default function TabThoiKhoaBieu() {
  const { maLop, students } = useStudents();
  const [tkb, setTkb] = useState(null);
  const [thuDangChon, setThuDangChon] = useState("thu2");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maLop]);

  async function loadData() {
    try {
      setLoading(true);
      if (!maLop) {
        setTkb(null);
        return;
      }
      const data = await getTKB(maLop);
      setTkb(data || tkbDayDu());
    } catch (err) {
      console.error(err);
      setMsg("❌ Lỗi tải TKB: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleTiet(buoi, index) {
    if (!tkb) return;
    const tkbMoi = JSON.parse(JSON.stringify(tkb));
    const tkbThu = tkbMoi[thuDangChon];
    if (!tkbThu) return;

    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    mangTiet[index] = !mangTiet[index];
    setTkb(tkbMoi);
  }

  function chonTatCa(buoi, giaTri) {
    if (!tkb) return;
    const tkbMoi = JSON.parse(JSON.stringify(tkb));
    const tkbThu = tkbMoi[thuDangChon];
    if (!tkbThu) return;

    if (buoi === "sang") {
      tkbThu.sang = [giaTri, giaTri, giaTri, giaTri, giaTri];
    } else {
      tkbThu.chieu = [giaTri, giaTri, giaTri, giaTri];
    }
    setTkb(tkbMoi);
  }

  async function handleLuu() {
    if (!maLop) {
      setMsg("❌ Chưa chọn lớp");
      return;
    }

    setDangLuu(true);
    try {
      await saveTKB(maLop, tkb);
      setMsg(`✅ Đã lưu thời khóa biểu lớp ${maLop}`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi lưu: " + err.message);
    } finally {
      setDangLuu(false);
    }
  }

  async function handleXoa() {
    if (!maLop) return;
    if (
      !window.confirm(
        `Xóa TKB lớp ${maLop}? Sau khi xóa, camera sẽ KHÔNG chấm điểm danh.`
      )
    )
      return;

    try {
      await xoaTKB(maLop);
      setMsg(`🗑️ Đã xóa TKB lớp ${maLop}`);
      setTkb(tkbDayDu());
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi xóa: " + err.message);
    }
  }

  function demSoTiet() {
    if (!tkb || !tkb[thuDangChon]) return { sang: 0, chieu: 0 };
    const tkbThu = tkb[thuDangChon];
    return {
      sang: tkbThu.sang.filter(Boolean).length,
      chieu: tkbThu.chieu.filter(Boolean).length,
    };
  }

  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: 40 }}>⏳ Đang tải TKB...</p>
    );
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

  const tkbThu = tkb?.[thuDangChon] || {
    sang: [false, false, false, false, false],
    chieu: [false, false, false, false],
  };
  const soTiet = demSoTiet();

  return (
    <>
      <h3>📅 Thời khóa biểu lớp {maLop}</h3>

      <p
        style={{
          padding: 14,
          background: "#dbeafe",
          borderRadius: 10,
          fontSize: 14,
        }}
      >
        💡 <b>Hướng dẫn:</b> Chọn thứ → tích vào tiết có học → bấm Lưu.
        Tiết không tích = trống (không chấm điểm danh).
      </p>

      {msg && <div className="msg">{msg}</div>}

      {/* Chọn thứ */}
      <div className="tabcon" style={{ marginBottom: 20 }}>
        {Object.keys(TEN_THU).map((k) => (
          <button
            key={k}
            className={thuDangChon === k ? "active" : ""}
            onClick={() => setThuDangChon(k)}
          >
            {TEN_THU[k]}
          </button>
        ))}
      </div>

      {/* Thống kê nhanh */}
      <div
        style={{
          display: "flex",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: 12,
            background: "#fef3c7",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 20, color: "#92400e" }}>{soTiet.sang}</b>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Tiết sáng</p>
        </div>
        <div
          style={{
            flex: 1,
            padding: 12,
            background: "#fef3c7",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 20, color: "#92400e" }}>{soTiet.chieu}</b>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Tiết chiều</p>
        </div>
      </div>

      {/* Buổi sáng */}
      <div
        style={{
          padding: 16,
          background: "#fffbeb",
          borderRadius: 12,
          marginBottom: 15,
          borderLeft: "6px solid #f59e0b",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h4 style={{ margin: 0 }}>🌅 Buổi Sáng</h4>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => chonTatCa("sang", true)}
              style={{ background: "#10b981", fontSize: 12, padding: "4px 10px" }}
            >
              Tất cả
            </button>
            <button
              onClick={() => chonTatCa("sang", false)}
              style={{ background: "#94a3b8", fontSize: 12, padding: "4px 10px" }}
            >
              Bỏ hết
            </button>
          </div>
        </div>

        {GIO_SANG.map((t, i) => (
          <label
            key={t.tiet}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: tkbThu.sang[i] ? "#d1fae5" : "white",
              borderRadius: 8,
              marginBottom: 6,
              cursor: "pointer",
              border: "2px solid",
              borderColor: tkbThu.sang[i] ? "#10b981" : "#e5e7eb",
            }}
          >
            <input
              type="checkbox"
              checked={tkbThu.sang[i] || false}
              onChange={() => toggleTiet("sang", i)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <span style={{ flex: 1, fontWeight: 600 }}>
              Tiết {t.tiet}
            </span>
            <span style={{ color: "#64748b", fontSize: 13 }}>
              {t.vao} — {t.ra}
            </span>
            {!tkbThu.sang[i] && (
              <span style={{ color: "#dc2626", fontSize: 12 }}>[trống]</span>
            )}
          </label>
        ))}
      </div>

      {/* Buổi chiều */}
      <div
        style={{
          padding: 16,
          background: "#fef2f2",
          borderRadius: 12,
          marginBottom: 15,
          borderLeft: "6px solid #ef4444",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h4 style={{ margin: 0 }}>🌆 Buổi Chiều</h4>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => chonTatCa("chieu", true)}
              style={{ background: "#10b981", fontSize: 12, padding: "4px 10px" }}
            >
              Tất cả
            </button>
            <button
              onClick={() => chonTatCa("chieu", false)}
              style={{ background: "#94a3b8", fontSize: 12, padding: "4px 10px" }}
            >
              Bỏ hết
            </button>
          </div>
        </div>

        {GIO_CHIEU.map((t, i) => (
          <label
            key={t.tiet}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: tkbThu.chieu[i] ? "#d1fae5" : "white",
              borderRadius: 8,
              marginBottom: 6,
              cursor: "pointer",
              border: "2px solid",
              borderColor: tkbThu.chieu[i] ? "#10b981" : "#e5e7eb",
            }}
          >
            <input
              type="checkbox"
              checked={tkbThu.chieu[i] || false}
              onChange={() => toggleTiet("chieu", i)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <span style={{ flex: 1, fontWeight: 600 }}>
              Tiết {t.tiet}
            </span>
            <span style={{ color: "#64748b", fontSize: 13 }}>
              {t.vao} — {t.ra}
            </span>
            {!tkbThu.chieu[i] && (
              <span style={{ color: "#dc2626", fontSize: 12 }}>[trống]</span>
            )}
          </label>
        ))}
      </div>

      {/* Nút lưu */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={handleLuu}
          disabled={dangLuu}
          style={{
            flex: 1,
            padding: 16,
            fontSize: 16,
            background: dangLuu ? "#94a3b8" : "#10b981",
          }}
        >
          {dangLuu ? "⏳ Đang lưu..." : `💾 Lưu thời khóa biểu lớp ${maLop}`}
        </button>
        <button
          onClick={handleXoa}
          style={{ background: "#dc2626", padding: "16px 20px" }}
        >
          🗑️ Xóa TKB
        </button>
      </div>

      <p style={{ marginTop: 15, fontSize: 13, color: "#64748b" }}>
        📚 Lớp có <b>{students.length}</b> học sinh — TKB áp dụng cho tất cả
        các em.
      </p>
    </>
  );
}