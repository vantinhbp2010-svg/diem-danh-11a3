import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { findStudentByQR, saveQR } from "./qrStorage";

export default function TabQRCode({ students = [], maLop = "11A3", onMark }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [buoi, setBuoi] = useState("sang");
  const [tiet, setTiet] = useState(1);
  const [scanLog, setScanLog] = useState([]);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);

  async function saveQrForStudent(studentId) {
    const value = `${maLop || "11A3"}-${String(studentId).padStart(3, "0")}`;
    await saveQR(studentId, value);
    return value;
  }

  useEffect(() => {
    if (activeTab !== "scan") {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      return;
    }

    if (!window || !Html5Qrcode) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          try {
            const studentId = await findStudentByQR(decodedText);
            if (!studentId) {
              setScanLog((prev) => [`Không tìm thấy HS cho mã: ${decodedText}`, ...prev].slice(0, 6));
              return;
            }

            const foundStudent = students.find((item) => item.id === studentId);
            if (foundStudent) {
              setScanLog((prev) => [`✓ ${foundStudent.name} (${studentId}) đã được quét`, ...prev].slice(0, 6));
              if (typeof onMark === "function") {
                await onMark(studentId, buoi, Number(tiet));
              }
            }

            await scanner.stop();
          } catch (error) {
            console.warn("Quét QR lỗi:", error);
            setScanError("Không đọc được mã QR. Vui lòng thử lại.");
          }
        }
      )
      .catch((error) => {
        console.warn("Khởi động camera thất bại:", error);
        setScanError("Không thể mở camera. Kiểm tra quyền truy cập camera.");
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [activeTab, buoi, onMark, students, tiet]);

  function handlePrintAll() {
    window.print();
  }

  return (
    <div className="qr-panel">
      <div className="tabcon qr-tabs">
        <button className={activeTab === "generate" ? "active" : ""} onClick={() => setActiveTab("generate")} type="button">
          🏷️ Tạo QR học sinh
        </button>
        <button className={activeTab === "scan" ? "active" : ""} onClick={() => setActiveTab("scan")} type="button">
          📷 Quét QR điểm danh
        </button>
      </div>

      {activeTab === "generate" && (
        <div className="qr-generate-box">
          <div className="qr-toolbar">
            <button type="button" onClick={handlePrintAll}>🖨️ In tất cả</button>
          </div>
          <div className="qr-grid">
            {students.map((student) => {
              const value = `${maLop || "11A3"}-${String(student.id).padStart(3, "0")}`;
              return (
                <div key={student.id} className="qr-card">
                  <QRCodeCanvas value={value} size={110} includeMargin />
                  <div className="qr-code-meta">
                    <strong>{value}</strong>
                    <span>{student.name}</span>
                  </div>
                  <button type="button" onClick={() => saveQrForStudent(student.id)}>💾 Lưu QR</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "scan" && (
        <div className="qr-scan-box">
          <div className="qr-scan-controls">
            <label>
              Buổi
              <select value={buoi} onChange={(event) => setBuoi(event.target.value)}>
                <option value="sang">Sáng</option>
                <option value="chieu">Chiều</option>
              </select>
            </label>
            <label>
              Tiết
              <input type="number" min={1} max={10} value={tiet} onChange={(event) => setTiet(Number(event.target.value) || 1)} />
            </label>
          </div>

          <div id="qr-reader" className="qr-reader" />
          {scanError && <p className="error-text">{scanError}</p>}

          <div className="scan-log">
            <h4>Log điểm danh</h4>
            {scanLog.length === 0 ? <p>Chưa có mã nào được quét.</p> : (
              <ul>
                {scanLog.map((log, index) => <li key={`${log}-${index}`}>{log}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
