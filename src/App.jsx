import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { students } from "./data";
import { getAttendance, markAttendance, xoaDiemDanh } from "./storage";
import { getQRs, saveQR, deleteQR, findStudentByQR } from "./qrStorage";
import { logout, getUser } from "./auth";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("diemdanh");
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState("");
  const [msg, setMsg] = useState("");
  const [buoiDangChon, setBuoiDangChon] = useState("sang");

  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    const d = new Date().toISOString().slice(0, 10);
    setToday(d);
    const data = getAttendance();
    setAttendance(data[d] || {});
  }, []);

  function refresh() {
    const data = getAttendance();
    setAttendance(data[today] || {});
  }

  function handleMark(id, buoi) {
    const res = markAttendance(id, buoi);
    setMsg(
      res.ok
        ? `Đã điểm danh buổi ${
            buoi === "sang" ? "sáng" : "chiều"
          } lúc ${res.time} — ${res.status}`
        : res.message
    );
    refresh();
    setTimeout(() => setMsg(""), 3000);
    return res;
  }

  function handleXoa(id, buoi) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `Xóa điểm danh buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        } của:\n\n${hs.name} (${hs.id})?`
      )
    )
      return;
    xoaDiemDanh(id, buoi);
    setMsg(`Đã xóa điểm danh của ${hs.name}`);
    refresh();
    setTimeout(() => setMsg(""), 3000);
  }

  function exportExcel() {
    const rows = students.map((s, i) => {
      const a = attendance[s.id] || {};
      const sang = a.sang || {};
      const chieu = a.chieu || {};
      return {
        STT: i + 1,
        "Mã HS": s.id,
        "Họ tên": s.name,
        "Lớp": s.class,
        "Sáng - Trạng thái": sang.status || "Vắng",
        "Sáng - Giờ vào": sang.time || "",
        "Chiều - Trạng thái": chieu.status || "Vắng",
        "Chiều - Giờ vào": chieu.time || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DiemDanh");
    XLSX.writeFile(wb, `DiemDanh_11A3_${today}.xlsx`);
  }

  function xoaDuLieu() {
    if (
      !window.confirm(
        "⚠️ XÓA HẾT dữ liệu điểm danh, khuôn mặt, QR CCCD?\n\nKhông thể hoàn tác!"
      )
    )
      return;
    localStorage.removeItem("diemdanh_11A3");
    localStorage.removeItem("faces_11A3");
    localStorage.removeItem("qr_cccd_11A3");
    alert("✅ Đã xóa hết!");
    window.location.reload();
  }

  function handleLogout() {
    if (window.confirm("Đăng xuất?")) {
      logout();
      navigate("/login");
    }
  }

  const total = students.length;

  return (
    <div className="container">
      <div className="header-row">
        <h1>📋 Điểm danh lớp 11A3</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/khach")}
            style={{ background: "#10b981" }}
          >
            👀 Trang khách
          </button>
          <button onClick={handleLogout} style={{ background: "#64748b" }}>
            🚪 Đăng xuất ({user})
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={tab === "diemdanh" ? "active" : ""}
          onClick={() => setTab("diemdanh")}
        >
          📋 Điểm danh
        </button>
        <button
          className={tab === "camera" ? "active" : ""}
          onClick={() => setTab("camera")}
        >
          🎥 Camera AI
        </button>
        <button
          className={tab === "dangkyqr" ? "active" : ""}
          onClick={() => setTab("dangkyqr")}
        >
          🪪 Đăng ký CCCD
        </button>
        <button
          className={tab === "dangky" ? "active" : ""}
          onClick={() => setTab("dangky")}
        >
          🧑 Đăng ký mặt
        </button>
        <button onClick={exportExcel}>📊 Xuất Excel</button>
        <button onClick={xoaDuLieu} style={{ background: "#e74c3c" }}>
          🗑️ Xóa tất cả
        </button>
      </div>

      {msg && <div className="msg">{msg}</div>}

      {tab === "diemdanh" && (
        <>
          <div className="chon-buoi">
            <span>Buổi đang điểm danh:</span>
            <button
              className={buoiDangChon === "sang" ? "active" : ""}
              onClick={() => setBuoiDangChon("sang")}
            >
              🌅 Sáng (7h00 — trễ sau 7h45 = vắng)
            </button>
            <button
              className={buoiDangChon === "chieu" ? "active" : ""}
              onClick={() => setBuoiDangChon("chieu")}
            >
              🌆 Chiều (13h30 — trễ sau 14h15 = vắng)
            </button>
          </div>
          <TabDiemDanh
            attendance={attendance}
            today={today}
            total={total}
            buoi={buoiDangChon}
            onMark={handleMark}
            onXoa={handleXoa}
          />
        </>
      )}

      {tab === "camera" && (
        <>
          <div className="chon-buoi">
            <span>Buổi đang điểm danh:</span>
            <button
              className={buoiDangChon === "sang" ? "active" : ""}
              onClick={() => setBuoiDangChon("sang")}
            >
              🌅 Sáng
            </button>
            <button
              className={buoiDangChon === "chieu" ? "active" : ""}
              onClick={() => setBuoiDangChon("chieu")}
            >
              🌆 Chiều
            </button>
          </div>
          <TabCameraAI buoi={buoiDangChon} onMark={handleMark} />
        </>
      )}

      {tab === "dangkyqr" && <TabDangKyQR />}
      {tab === "dangky" && <TabDangKyMat />}
    </div>
  );
}

/* ---------- TAB ĐIỂM DANH ---------- */
function TabDiemDanh({ attendance, today, total, buoi, onMark, onXoa }) {
  const dem = { "Đúng giờ": 0, "Đi trễ": 0, "Vắng": 0 };
  students.forEach((s) => {
    const a = (attendance[s.id] || {})[buoi];
    if (!a) dem["Vắng"]++;
    else dem[a.status] = (dem[a.status] || 0) + 1;
  });

  const tenBuoi = buoi === "sang" ? "Sáng" : "Chiều";
  const gioChuan = buoi === "sang" ? "7h00" : "13h30";
  const hanTre = buoi === "sang" ? "7h45" : "14h15";

  return (
    <>
      <p>
        Ngày: {today} — Buổi <b>{tenBuoi}</b> — Giờ vào lớp: <b>{gioChuan}</b>{" "}
        (quá {hanTre} tính vắng)
      </p>
      <div className="thong-ke">
        <div className="card dunggio">
          ✅ Đúng giờ <b>{dem["Đúng giờ"]}</b>
        </div>
        <div className="card tre">
          🟡 Đi trễ <b>{dem["Đi trễ"]}</b>
        </div>
        <div className="card vang">
          ❌ Vắng <b>{dem["Vắng"]}</b>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã HS</th>
            <th>Họ tên</th>
            <th>Trạng thái ({tenBuoi})</th>
            <th>Giờ vào</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const a = (attendance[s.id] || {})[buoi];
            let status = "❌ Vắng";
            let cls = "vang";
            if (a) {
              if (a.status === "Đúng giờ") {
                status = "✅ Đúng giờ";
                cls = "dunggio";
              } else if (a.status === "Đi trễ") {
                status = "🟡 Đi trễ";
                cls = "tre";
              }
            }
            return (
              <tr key={s.id} className={cls}>
                <td>{i + 1}</td>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.time : "—"}</td>
                <td>
                  {!a && (
                    <button onClick={() => onMark(s.id, buoi)}>Điểm danh</button>
                  )}
                  {a && (
                    <button
                      onClick={() => onXoa(s.id, buoi)}
                      style={{ background: "#e74c3c", marginLeft: 6 }}
                    >
                      🗑️ Xóa
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ---------- TAB CAMERA AI ---------- */
function TabCameraAI({ buoi, onMark }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("both");
  const [lastLog, setLastLog] = useState([]);

  const qrScannerRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const markedInSessionRef = useRef(new Set());
  const faceapiRef = useRef(null);
  const matcherRef = useRef(null);

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [`[${time}] ${text}`, ...prev].slice(0, 20));
  }

  async function start() {
    setMsg("Đang tải model...");
    setLastLog([]);
    markedInSessionRef.current = new Set();

    if (mode === "face" || mode === "both") {
      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      const { getFaces } = await import("./faceStorage");
      const faces = getFaces();
      const labeled = Object.keys(faces).map((id) => {
        const descs = faces[id].map((d) => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(id, descs);
      });
      if (labeled.length > 0) {
        matcherRef.current = new faceapi.FaceMatcher(labeled, 0.55);
      } else {
        matcherRef.current = null;
        addLog("⚠️ Chưa có khuôn mặt nào đăng ký");
      }
    }

    setMsg("Đang mở camera...");
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 200));

    const scanner = new Html5Qrcode("qr-reader-inline");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 20,                        // tăng fps để quét nhanh hơn
          qrbox: { width: 350, height: 350 }, // khung quét to hơn
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          const studentId = findStudentByQR(decodedText);
          if (!studentId) {
            addLog(`❓ QR lạ: ${decodedText.slice(0, 40)}...`);
            return;
          }
          if (markedInSessionRef.current.has(studentId)) return;
          markedInSessionRef.current.add(studentId);

          const hs = students.find((s) => s.id === studentId);
          const res = onMark(studentId, buoi);
          addLog(`🪪 CCCD: ${hs.name}${res.ok ? "" : " — " + res.message}`);
        },
        () => {}
      );
      setRunning(true);
      setMsg("");
      if (mode === "face" || mode === "both") startFace();
    } catch (err) {
      setMsg("Không mở được camera: " + err.message);
    }
  }

  function startFace() {
    const faceapi = faceapiRef.current;
    if (!matcherRef.current) return;
    faceIntervalRef.current = setInterval(async () => {
      const videoEl = document.querySelector("#qr-reader-inline video");
      if (!videoEl || videoEl.readyState < 2) return;
      try {
        const det = await faceapi
          .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (det) {
          const best = matcherRef.current.findBestMatch(det.descriptor);
          if (best.label !== "unknown") {
            const hs = students.find((s) => s.id === best.label);
            if (hs && !markedInSessionRef.current.has(hs.id)) {
              markedInSessionRef.current.add(hs.id);
              const res = onMark(hs.id, buoi);
              addLog(`🤖 Mặt: ${hs.name}${res.ok ? "" : " — " + res.message}`);
            }
          }
        }
      } catch (e) {}
    }, 2000);
  }

  async function stop() {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (e) {}
      qrScannerRef.current = null;
    }
    setRunning(false);
    setMsg("");
  }

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenBuoi = buoi === "sang" ? "Sáng (7h00)" : "Chiều (13h30)";

  return (
    <>
      <p>
        Buổi: <b>{tenBuoi}</b>. Đưa <b>QR trên CCCD</b> (mặt sau) hoặc{" "}
        <b>khuôn mặt</b> trước camera.
      </p>
      <div className="camera-mode">
        <label>
          <input
            type="radio"
            checked={mode === "both"}
            onChange={() => setMode("both")}
            disabled={running}
          />
          Cả hai (CCCD + Mặt)
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "qr"}
            onChange={() => setMode("qr")}
            disabled={running}
          />
          Chỉ CCCD
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "face"}
            onChange={() => setMode("face")}
            disabled={running}
          />
          Chỉ Mặt
        </label>
      </div>
      <div
        id="qr-reader-inline"
        style={{
          width: 500,
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      ></div>
      {!running ? (
        <button onClick={start}>▶ Bật camera</button>
      ) : (
        <button onClick={stop}>⏹ Tắt camera</button>
      )}
      {msg && <div className="msg">{msg}</div>}
      {lastLog.length > 0 && (
        <div className="log-box">
          <h4>Nhật ký (phiên này)</h4>
          <ul>
            {lastLog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/* ---------- TAB ĐĂNG KÝ QR CCCD ---------- */
function TabDangKyQR() {
  const [selected, setSelected] = useState(students[0].id);
  const [status, setStatus] = useState("");
  const [scanning, setScanning] = useState(false);
  const [qrList, setQrList] = useState({});
  const [manual, setManual] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    setQrList(getQRs());
  }, []);

  async function startScan() {
    setStatus("");
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 200));

    const scanner = new Html5Qrcode("qr-reader-dangky");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: { width: 350, height: 350 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          saveQR(selected, decodedText);
          const hs = students.find((s) => s.id === selected);
          setStatus(`✅ Đã lưu QR cho: ${hs.name}`);
          setQrList(getQRs());
          stopScan();
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setStatus("Không mở được camera: " + err.message);
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  function xoaQR(id) {
    const hs = students.find((s) => s.id === id);
    if (!window.confirm(`Xóa QR của ${hs.name}?`)) return;
    deleteQR(id);
    setQrList(getQRs());
    setStatus(`🗑️ Đã xóa QR của ${hs.name}`);
  }

  function luuThuCong() {
    if (!manual.trim()) {
      setStatus("❌ Chưa nhập gì!");
      return;
    }
    saveQR(selected, manual.trim());
    const hs = students.find((s) => s.id === selected);
    setStatus(`✅ Đã lưu thủ công cho: ${hs.name}`);
    setQrList(getQRs());
    setManual("");
  }

  const hs = students.find((s) => s.id === selected);
  const daDangKy = Object.keys(qrList).length;

  return (
    <>
      <p>
        Đã đăng ký: <b>{daDangKy}</b> / {students.length} học sinh
      </p>

      <p style={{ background: "#fef3c7", padding: 10, borderRadius: 8 }}>
        💡 <b>Mẹo quét CCCD dễ hơn:</b>
        <br />• Đưa CCCD <b>cách camera 10–15 cm</b> (không quá gần)
        <br />• <b>Giữ yên</b> 2–3 giây
        <br />• <b>Nghiêng nhẹ</b> thẻ để tránh hologram phản sáng
        <br />• Đủ sáng — tránh bóng đổ lên thẻ
        <br />• Nếu QR vẫn không quét được → dùng <b>nhập tay</b> bên dưới
      </p>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ padding: 8, fontSize: 16, marginBottom: 10 }}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id} — {s.name}
            {qrList[s.id] ? " ✅" : ""}
          </option>
        ))}
      </select>

      <div
        id="qr-reader-dangky"
        style={{
          width: 500,
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      ></div>

      {!scanning ? (
        <button onClick={startScan}>📷 Bắt đầu quét QR CCCD</button>
      ) : (
        <button onClick={stopScan} style={{ background: "#e74c3c" }}>
          ⏹ Dừng
        </button>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 15,
          background: "#f3f4f6",
          borderRadius: 8,
        }}
      >
        <b>⌨️ Nhập tay (khi QR không quét được):</b>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Dán nội dung QR hoặc số CCCD"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "10px 14px",
              fontSize: 15,
              borderRadius: 8,
              border: "2px solid #e5e7eb",
            }}
          />
          <button onClick={luuThuCong}>💾 Lưu</button>
        </div>
      </div>

      {qrList[selected] && (
        <button
          onClick={() => xoaQR(selected)}
          style={{ background: "#e74c3c", marginTop: 15 }}
        >
          🗑️ Xóa QR của {hs.name}
        </button>
      )}

      {status && <div className="msg">{status}</div>}

      <h3 style={{ marginTop: 30 }}>Danh sách đã đăng ký</h3>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id} className={qrList[s.id] ? "dunggio" : "vang"}>
              <td>{i + 1}</td>
              <td>{s.name}</td>
              <td>{qrList[s.id] ? "✅ Đã có QR" : "❌ Chưa"}</td>
              <td>
                {qrList[s.id] && (
                  <button
                    onClick={() => xoaQR(s.id)}
                    style={{ background: "#e74c3c" }}
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------- TAB ĐĂNG KÝ KHUÔN MẶT ---------- */
function TabDangKyMat() {
  const [selected, setSelected] = useState(students[0].id);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function init() {
      const faceapi = await import("face-api.js");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoaded(true);
      } catch (err) {
        setStatus("Không mở được camera: " + err.message);
      }
    }
    init();
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    setStatus("Đang xử lý...");
    const faceapi = await import("face-api.js");
    const det = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!det) {
      setStatus("❌ Không thấy khuôn mặt. Thử lại!");
      return;
    }
    const { saveFace } = await import("./faceStorage");
    saveFace(selected, det.descriptor);
    const hs = students.find((s) => s.id === selected);
    setStatus(`✅ Đã lưu khuôn mặt: ${hs.name}`);
  }

  async function xoaMat() {
    const hs = students.find((s) => s.id === selected);
    if (!window.confirm(`Xóa khuôn mặt của ${hs.name}?`)) return;
    const { clearFaces } = await import("./faceStorage");
    clearFaces(selected);
    setStatus(`🗑️ Đã xóa khuôn mặt của ${hs.name}`);
  }

  const hs = students.find((s) => s.id === selected);

  return (
    <>
      <p>
        Chọn học sinh → nhìn vào camera → chụp 2–3 lần (chính diện, nghiêng
        trái, nghiêng phải).
      </p>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ padding: 8, fontSize: 16, marginBottom: 10 }}
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.id} — {s.name}
          </option>
        ))}
      </select>
      <div>
        <video
          ref={videoRef}
          autoPlay
          muted
          width="320"
          style={{ borderRadius: 8, display: "block", marginBottom: 10 }}
        />
      </div>
      <button onClick={capture} disabled={!loaded}>
        📸 Chụp khuôn mặt cho {hs.name}
      </button>
      <button
        onClick={xoaMat}
        disabled={!loaded}
        style={{ background: "#e74c3c", marginLeft: 10 }}
      >
        🗑️ Xóa khuôn mặt
      </button>
      {status && <div className="msg">{status}</div>}
    </>
  );
}