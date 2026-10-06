import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { students } from "./data";
import { getAttendance, markAttendance } from "./storage";
import { findStudentByQR } from "./qrStorage";

export default function Khach() {
  const [tab, setTab] = useState("bang");
  const [attendance, setAttendance] = useState({});
  const [today, setToday] = useState("");
  const [msg, setMsg] = useState("");
  const [buoiDangChon, setBuoiDangChon] = useState("sang");

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
        ? `Đã điểm danh lúc ${res.time} — ${res.status}`
        : res.message
    );
    refresh();
    setTimeout(() => setMsg(""), 3000);
    return res;
  }

  const total = students.length;

  return (
    <div className="container">
      <div className="header-row">
        <h1>📋 Điểm danh lớp 11A3</h1>
        <Link to="/login">
          <button style={{ background: "#64748b" }}>🔐 Giáo viên</button>
        </Link>
      </div>

      <p style={{ background: "#dbeafe", padding: 12, borderRadius: 8 }}>
        👋 Học sinh có thể <b>tự điểm danh</b> ở tab 🎥 Camera AI — bằng{" "}
        <b>QR trên CCCD</b> hoặc <b>khuôn mặt</b>.
      </p>

      <div className="tabs">
        <button
          className={tab === "bang" ? "active" : ""}
          onClick={() => setTab("bang")}
        >
          📋 Xem điểm danh
        </button>
        <button
          className={tab === "camera" ? "active" : ""}
          onClick={() => setTab("camera")}
        >
          🎥 Camera AI
        </button>
      </div>

      {msg && <div className="msg">{msg}</div>}

      {tab === "bang" && (
        <>
          <div className="chon-buoi">
            <span>Chọn buổi:</span>
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
          <TabBangKhach
            attendance={attendance}
            today={today}
            total={total}
            buoi={buoiDangChon}
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
    </div>
  );
}

function TabBangKhach({ attendance, today, total, buoi }) {
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
        Ngày: {today} — Buổi <b>{tenBuoi}</b> — Giờ vào: <b>{gioChuan}</b> (quá{" "}
        {hanTre} tính vắng)
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
            <th>Họ tên</th>
            <th>Trạng thái ({tenBuoi})</th>
            <th>Giờ vào</th>
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
                <td>{s.name}</td>
                <td>{status}</td>
                <td>{a ? a.time : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

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

    const scanner = new Html5Qrcode("qr-reader-khach");
    qrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "user" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          const studentId = findStudentByQR(decodedText);
          if (!studentId) {
            addLog(`❓ QR lạ`);
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
      const videoEl = document.querySelector("#qr-reader-khach video");
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
        Buổi: <b>{tenBuoi}</b>. Đưa <b>QR trên CCCD</b> hoặc để camera nhận
        diện <b>khuôn mặt</b>.
      </p>
      <div className="camera-mode">
        <label>
          <input
            type="radio"
            checked={mode === "both"}
            onChange={() => setMode("both")}
            disabled={running}
          />
          Cả hai
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
        id="qr-reader-khach"
        style={{ width: 400, margin: "15px 0", borderRadius: 12, overflow: "hidden" }}
      ></div>
      {!running ? (
        <button onClick={start}>▶ Bật camera</button>
      ) : (
        <button onClick={stop}>⏹ Tắt camera</button>
      )}
      {msg && <div className="msg">{msg}</div>}
      {lastLog.length > 0 && (
        <div className="log-box">
          <h4>Nhật ký</h4>
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