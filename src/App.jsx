import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { students } from "./data";
import {
  getAttendance,
  markAttendance,
  xoaDiemDanh,
  xoaTatCaCuaHocSinh,
} from "./storage";
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      const data = await getAttendance();
      const d = new Date().toISOString().slice(0, 10);
      setAttendance(data[d] || {});
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      setMsg("Lỗi tải dữ liệu từ cloud: " + err.message);
    }
  }

  async function refresh() {
    try {
      const data = await getAttendance();
      setAttendance(data[today] || {});
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMark(id, buoi) {
    try {
      const res = await markAttendance(id, buoi);
      setMsg(
        res.ok
          ? `Đã điểm danh buổi ${
              buoi === "sang" ? "sáng" : "chiều"
            } lúc ${res.time} — ${res.status}`
          : res.message
      );
      await refresh();
      setTimeout(() => setMsg(""), 3000);
      return res;
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
  }

  async function handleXoa(id, buoi) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `Xóa điểm danh buổi ${
          buoi === "sang" ? "sáng" : "chiều"
        } của:\n\n${hs.name} (${hs.id})?`
      )
    )
      return;
    try {
      await xoaDiemDanh(id, buoi);
      setMsg(`Đã xóa điểm danh của ${hs.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Lỗi xóa: " + err.message);
    }
  }

  async function handleXoaTatCa(id) {
    const hs = students.find((s) => s.id === id);
    if (
      !window.confirm(
        `⚠️ XÓA TẤT CẢ dữ liệu của:\n\n${hs.name} (${hs.id})\n\n` +
          `Bao gồm:\n` +
          `• Điểm danh\n` +
          `• Khuôn mặt đã đăng ký\n` +
          `• QR CCCD\n\n` +
          `Hành động này KHÔNG THỂ hoàn tác!`
      )
    )
      return;

    try {
      setMsg(`⏳ Đang xóa dữ liệu của ${hs.name}...`);
      await xoaTatCaCuaHocSinh(id);
      setMsg(`✅ Đã xóa toàn bộ dữ liệu của ${hs.name}`);
      await refresh();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Lỗi xóa: " + err.message);
    }
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

  async function xoaDuLieu() {
    if (
      !window.confirm(
        "⚠️ XÓA HẾT dữ liệu điểm danh, khuôn mặt, QR CCCD trên CLOUD?\n\nKhông thể hoàn tác!"
      )
    )
      return;
    try {
      const { saveAttendance } = await import("./storage");
      await saveAttendance({});
      const { getFaces } = await import("./faceStorage");
      const faces = await getFaces();
      for (const id of Object.keys(faces)) {
        const { clearFaces } = await import("./faceStorage");
        await clearFaces(id);
      }
      alert("✅ Đã xóa hết dữ liệu!");
      window.location.reload();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
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
            onXoaTatCa={handleXoaTatCa}
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
function TabDiemDanh({
  attendance,
  today,
  total,
  buoi,
  onMark,
  onXoa,
  onXoaTatCa,
}) {
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
            <th>Hành động</th>
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
                    <button onClick={() => onMark(s.id, buoi)}>
                      Điểm danh
                    </button>
                  )}
                  {a && (
                    <button
                      onClick={() => onXoa(s.id, buoi)}
                      style={{
                        background: "#f59e0b",
                        marginLeft: 4,
                        padding: "5px 10px",
                        fontSize: 13,
                      }}
                      title="Chỉ xóa điểm danh buổi này"
                    >
                      🗑️ ĐD
                    </button>
                  )}
                  <button
                    onClick={() => onXoaTatCa(s.id)}
                    style={{
                      background: "#dc2626",
                      marginLeft: 4,
                      padding: "5px 10px",
                      fontSize: 13,
                    }}
                    title="Xóa TẤT CẢ: điểm danh + khuôn mặt + QR CCCD"
                  >
                    ❌ Xóa hết
                  </button>
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
  const [mode, setMode] = useState("face");
  const [lastLog, setLastLog] = useState([]);
  const [soNhanDien, setSoNhanDien] = useState(0);

  const qrScannerRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const markedInSessionRef = useRef(new Set());
  const faceapiRef = useRef(null);
  const matcherRef = useRef(null);
  const lastDetectRef = useRef(0);

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [`[${time}] ${text}`, ...prev].slice(0, 30));
  }

  async function start() {
    setMsg("Đang tải model...");
    setLastLog([]);
    setSoNhanDien(0);
    markedInSessionRef.current = new Set();

    if (mode === "face" || mode === "both") {
      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);

      const { getFaces } = await import("./faceStorage");
      const faces = await getFaces();
      const labeled = Object.keys(faces).map((id) => {
        const descs = faces[id].map((d) => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(id, descs);
      });

      if (labeled.length > 0) {
        matcherRef.current = new faceapi.FaceMatcher(labeled, 0.5);
        addLog(`✅ Đã load ${labeled.length} khuôn mặt`);
      } else {
        matcherRef.current = null;
        addLog("⚠️ Chưa có khuôn mặt nào đăng ký");
      }
    }

    setMsg("Đang mở camera...");
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise((r) => setTimeout(r, 100));

    const scanner = new Html5Qrcode("qr-reader-inline");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: { width: 400, height: 400 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          const studentId = await findStudentByQR(decodedText);
          if (!studentId) {
            addLog(`❓ QR lạ`);
            return;
          }
          if (markedInSessionRef.current.has(studentId)) return;
          markedInSessionRef.current.add(studentId);

          const hs = students.find((s) => s.id === studentId);
          const res = await onMark(studentId, buoi);
          setSoNhanDien((c) => c + 1);
          addLog(
            `🪪 ${hs.name}${res?.ok ? "" : " — " + (res?.message || "")}`
          );
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
    if (!matcherRef.current) {
      addLog("⚠️ Bỏ qua nhận diện mặt — chưa có dữ liệu");
      return;
    }

    const TINY_OPTIONS = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.4,
    });

    faceIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      if (now - lastDetectRef.current < 300) return;
      lastDetectRef.current = now;

      const videoEl = document.querySelector("#qr-reader-inline video");
      if (!videoEl || videoEl.readyState < 2) return;

      try {
        const det = await faceapi
          .detectSingleFace(videoEl, TINY_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (det) {
          const best = matcherRef.current.findBestMatch(det.descriptor);
          if (best.label !== "unknown") {
            const hs = students.find((s) => s.id === best.label);
            if (hs && !markedInSessionRef.current.has(hs.id)) {
              markedInSessionRef.current.add(hs.id);
              const res = await onMark(hs.id, buoi);
              setSoNhanDien((c) => c + 1);
              addLog(
                `🤖 ${hs.name} (${Math.round(
                  (1 - best.distance) * 100
                )}%)${res?.ok ? "" : " — " + (res?.message || "")}`
              );
            }
          }
        }
      } catch (e) {}
    }, 400);
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
        Buổi: <b>{tenBuoi}</b>. Đã nhận diện:{" "}
        <b style={{ color: "#10b981" }}>{soNhanDien}</b> học sinh
      </p>

      <div className="camera-mode">
        <label>
          <input
            type="radio"
            checked={mode === "face"}
            onChange={() => setMode("face")}
            disabled={running}
          />
          🤖 Chỉ Mặt (nhanh nhất)
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "qr"}
            onChange={() => setMode("qr")}
            disabled={running}
          />
          📷 Chỉ QR CCCD
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "both"}
            onChange={() => setMode("both")}
            disabled={running}
          />
          ⚡ Cả hai
        </label>
      </div>

      <div
        id="qr-reader-inline"
        style={{
          width: 600,
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      ></div>

      {!running ? (
        <button onClick={start} style={{ fontSize: 18, padding: "12px 24px" }}>
          ▶ Bật camera
        </button>
      ) : (
        <button
          onClick={stop}
          style={{
            background: "#e74c3c",
            fontSize: 18,
            padding: "12px 24px",
          }}
        >
          ⏹ Tắt camera
        </button>
      )}

      {msg && <div className="msg">{msg}</div>}

      {lastLog.length > 0 && (
        <div className="log-box">
          <h4>Nhật ký ({lastLog.length})</h4>
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

/* ---------- TAB ĐĂNG KÝ KHUÔN MẶT ---------- */
function TabDangKyMat() {
  const [selected, setSelected] = useState(students[0].id);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [soDaChup, setSoDaChup] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceapiRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoaded(true);
        setStatus("✅ Camera sẵn sàng — chọn học sinh và bấm Chụp");
      } catch (err) {
        setStatus("❌ Lỗi: " + err.message);
      }
    }
    init();
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    if (saving) return;
    setSaving(true);
    setStatus("⏳ Đang nhận diện khuôn mặt...");

    try {
      const faceapi = faceapiRef.current;
      if (!faceapi) {
        setStatus("❌ Model chưa load xong, đợi 2 giây rồi thử lại");
        setSaving(false);
        return;
      }

      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.4,
      });

      const det = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        setStatus("❌ Không thấy khuôn mặt — nhìn thẳng camera, đủ sáng");
        setSaving(false);
        return;
      }

      setStatus("⏳ Đang lưu lên Firebase...");

      const { saveFace } = await import("./faceStorage");
      await saveFace(selected, det.descriptor);

      const hs = students.find((s) => s.id === selected);
      setStatus(`✅ Đã lưu khuôn mặt: ${hs.name}`);
      setSoDaChup((c) => c + 1);

      const idx = students.findIndex((s) => s.id === selected);
      if (idx < students.length - 1) {
        setTimeout(() => setSelected(students[idx + 1].id), 800);
      }
    } catch (err) {
      setStatus("❌ Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function xoaMat() {
    const hs = students.find((s) => s.id === selected);
    if (!window.confirm(`Xóa khuôn mặt của ${hs.name}?`)) return;
    setSaving(true);
    try {
      const { clearFaces } = await import("./faceStorage");
      await clearFaces(selected);
      setStatus(`🗑️ Đã xóa khuôn mặt của ${hs.name}`);
    } catch (err) {
      setStatus("❌ Lỗi xóa: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const hs = students.find((s) => s.id === selected);
  const idx = students.findIndex((s) => s.id === selected);

  return (
    <>
      <p style={{ background: "#dbeafe", padding: 10, borderRadius: 8 }}>
        💡 <b>Hướng dẫn nhanh:</b> Chọn học sinh → nhìn thẳng camera → bấm{" "}
        <b>📸 Chụp</b>. App tự chuyển sang em tiếp theo. Trung bình ~3 giây/em.
      </p>

      <p>
        Đã chụp phiên này: <b style={{ color: "#10b981" }}>{soDaChup}</b> /{" "}
        {students.length}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        >
          {students.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.id} — {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            if (idx > 0) setSelected(students[idx - 1].id);
          }}
          style={{ background: "#94a3b8" }}
        >
          ⬅ Trước
        </button>
        <button
          onClick={() => {
            if (idx < students.length - 1) setSelected(students[idx + 1].id);
          }}
          style={{ background: "#94a3b8" }}
        >
          Sau ➡
        </button>
      </div>

      <div>
        <video
          ref={videoRef}
          autoPlay
          muted
          width="400"
          style={{
            borderRadius: 12,
            display: "block",
            marginBottom: 10,
            border: "3px solid #3b82f6",
          }}
        />
      </div>

      <button
        onClick={capture}
        disabled={!loaded || saving}
        style={{
          fontSize: 18,
          padding: "12px 24px",
          background: saving ? "#94a3b8" : "#3b82f6",
        }}
      >
        {saving ? "⏳ Đang xử lý..." : `📸 Chụp khuôn mặt cho ${hs.name}`}
      </button>
      <button
        onClick={xoaMat}
        disabled={!loaded || saving}
        style={{ background: "#e74c3c", marginLeft: 10, padding: "12px 20px" }}
      >
        🗑️ Xóa khuôn mặt
      </button>

      {status && <div className="msg">{status}</div>}
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
    loadQRs();
  }, []);

  async function loadQRs() {
    try {
      const data = await getQRs();
      setQrList(data);
    } catch (err) {
      console.error(err);
    }
  }

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
        async (decodedText) => {
          await saveQR(selected, decodedText);
          const hs = students.find((s) => s.id === selected);
          setStatus(`✅ Đã lưu QR cho: ${hs.name}`);
          await loadQRs();
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

  async function xoaQR(id) {
    const hs = students.find((s) => s.id === id);
    if (!window.confirm(`Xóa QR của ${hs.name}?`)) return;
    await deleteQR(id);
    await loadQRs();
    setStatus(`🗑️ Đã xóa QR của ${hs.name}`);
  }

  async function luuThuCong() {
    if (!manual.trim()) {
      setStatus("❌ Chưa nhập gì!");
      return;
    }
    await saveQR(selected, manual.trim());
    const hs = students.find((s) => s.id === selected);
    setStatus(`✅ Đã lưu thủ công cho: ${hs.name}`);
    await loadQRs();
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
        💡 <b>Mẹo quét CCCD:</b> Đưa cách camera 10–15cm, giữ yên 2–3 giây,
        nghiêng nhẹ tránh hologram. Nếu không được → dùng nhập tay bên dưới.
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
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
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