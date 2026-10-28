import { useEffect, useRef, useState } from "react";
import { layThuHienTai } from "../thoiKhoaBieu";

/* =============================================================
   TAB CAMERA AI
   ============================================================= */
function TabCameraAI({ students, maLop, onMark }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastLog, setLastLog] = useState([]);
  const [soNhanDien, setSoNhanDien] = useState(0);
  const [tietHienTai, setTietHienTai] = useState(null);
  const [tkbLop, setTkbLop] = useState(null);

  const faceIntervalRef = useRef(null);
  const markedInSessionRef = useRef(new Set());
  const faceapiRef = useRef(null);
  const matcherRef = useRef(null);
  const activeClassRef = useRef(maLop);
  const lastDetectRef = useRef(0);
  const tietTimerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const dangXuLyRef = useRef(false);   // ✅ Thêm dòng này — tránh overlap khi detect chậm

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [`[${time}] ${text}`, ...prev].slice(0, 30));
  }

  useEffect(() => {
    async function capNhat() {
      const { tietDangDienRaTheoGio } = await import("../thoiKhoaBieu");
      const t = tietDangDienRaTheoGio();
      setTietHienTai(t);
    }
    capNhat();
    tietTimerRef.current = setInterval(capNhat, 30000);
    return () => {
      if (tietTimerRef.current) clearInterval(tietTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadTKB() {
      setTkbLop(null);
      if (!maLop) return;
      try {
        const { getTKB } = await import("../tkbStorage");
        const tkb = await getTKB(maLop);
        if (active) {
          console.log("✅ Load TKB lớp", maLop, ":", tkb);
          setTkbLop(tkb);
        }
      } catch (err) {
        if (active) console.error("Lỗi load TKB:", err);
      }
    }
    loadTKB();
    return () => {
      active = false;
    };
  }, [maLop]);

  function tietCoHoc(buoi, tiet) {
    if (!tkbLop) {
      console.log("❌ tietCoHoc: tkbLop null");
      return false;
    }
    const thu = layThuHienTai();
    if (!thu) return false;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) {
      console.log("❌ Không có", thu, "| keys:", Object.keys(tkbLop));
      return false;
    }

    let mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    if (!mangTiet) return false;

    // ✅ Nếu là object {t0, t1,...} → chuyển thành mảng
    if (!Array.isArray(mangTiet)) {
      mangTiet = Object.keys(mangTiet)
        .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
        .map((k) => mangTiet[k] === true);
    }

    const index = buoi === "sang" ? tiet - 1 : tiet - 2;
    const ketQua = mangTiet[index] === true;
    console.log(`🔍 tietCoHoc(${buoi}, ${tiet}):`, {
      thu,
      index,
      giaTri: mangTiet[index],
      ketQua,
    });
    return ketQua;
  }

  async function start() {
    setMsg("Đang tải model...");
    setLastLog([]);
    setSoNhanDien(0);
    markedInSessionRef.current = new Set();

    const faceapi = await import("face-api.js");
    faceapiRef.current = faceapi;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);

    const { getFaces } = await import("../faceStorage");
    const faces = await getFaces(maLop);
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

    setMsg("Đang mở camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setRunning(true);
      setMsg("");
      startFace();
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
      inputSize: 416,        // ✅ Tăng từ 224 → 416 để bắt được nhiều mặt nhỏ
      scoreThreshold: 0.4,
    });

    faceIntervalRef.current = setInterval(async () => {
      // ✅ Chống overlap: nếu lần trước chưa xử lý xong thì bỏ qua
      if (dangXuLyRef.current) return;

      const now = Date.now();
      if (now - lastDetectRef.current < 700) return;   // ✅ Tăng 500 → 700ms cho kịp xử lý nhiều mặt
      lastDetectRef.current = now;

      const videoEl = videoRef.current;
      if (!videoEl) return;
      if (videoEl.readyState < 2) return;
      if (!videoEl.videoWidth || !videoEl.videoHeight) return;

      dangXuLyRef.current = true;
      try {
        // ✅ ĐỔI: detectAllFaces + withFaceDescriptors
        const detections = await faceapi
          .detectAllFaces(videoEl, TINY_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!detections || detections.length === 0) {
          dangXuLyRef.current = false;
          return;
        }

        // Lấy thời điểm hiện tại 1 lần dùng cho tất cả
        const { tietDangDienRaTheoGio } = await import("../thoiKhoaBieu");
        const t = tietDangDienRaTheoGio();

        // Lặp qua TẤT CẢ khuôn mặt phát hiện được
        for (const det of detections) {
          const best = matcherRef.current.findBestMatch(det.descriptor);

          if (best.label === "unknown") continue;

          const hs = students.find((s) => s.id === best.label);
          if (!hs) continue;

          // Bỏ qua nếu đã chấm trong phiên này
          if (markedInSessionRef.current.has(hs.id)) continue;

          if (!t) {
            // Chỉ log 1 lần cho HS đầu tiên (tránh spam log)
            if (markedInSessionRef.current.size === 0) {
              addLog(`⏰ Chưa tới giờ vào tiết`);
            }
            markedInSessionRef.current.add(hs.id);   // ✅ Đánh dấu để không log lặp
            continue;
          }

          if (!tietCoHoc(t.buoi, t.tiet)) {
            if (!markedInSessionRef.current.has(hs.id + "_noTiet")) {
              addLog(`📭 ${hs.name} — Tiết ${t.tiet} không có học`);
              markedInSessionRef.current.add(hs.id + "_noTiet");
            }
            continue;
          }

          // ✅ Đánh dấu TRƯỚC khi await để tránh chấm trùng
          markedInSessionRef.current.add(hs.id);

          const res = await onMark(hs.id, t.buoi, t.tiet);
          if (res?.ok) {
            setSoNhanDien((c) => c + 1);
          }

          addLog(
            `🤖 ${hs.name} (${Math.round(
              (1 - best.distance) * 100
            )}%) — Tiết ${t.tiet}${
              res?.ok
                ? ` (${res.trangThai}${
                    res.phutTre > 0 ? `, trễ ${res.phutTre}p` : ""
                  })`
                : ` — ${res?.message || "lỗi"}`
            }`
          );
        }

        // Log số mặt detect được trong frame này (mỗi 3s để đỡ spam)
        if (detections.length > 1 && now % 3000 < 700) {
          addLog(`👥 Phát hiện ${detections.length} khuôn mặt`);
        }
      } catch (e) {
        console.warn("Lỗi detect:", e);
      } finally {
        dangXuLyRef.current = false;
      }
    }, 500);
  }

  async function stop() {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRunning(false);
    setMsg("");
  }

  useEffect(() => {
    if (activeClassRef.current === maLop) return;
    activeClassRef.current = maLop;
    matcherRef.current = null;
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRunning(false);
    setMsg("");
  }, [maLop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <>
      {tietHienTai ? (
        <div
          style={{
            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
            borderLeft: "6px solid #10b981",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#065f46",
            }}
          >
            📚 Đang tiết {tietHienTai.tiet} — Buổi{" "}
            {tietHienTai.buoi === "sang" ? "Sáng" : "Chiều"}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: "#047857" }}>
            ⏰ Thời gian: {tietHienTai.vao} — {tietHienTai.ra}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fef3c7",
            borderLeft: "6px solid #f59e0b",
            padding: 16,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#78350f",
            }}
          >
            ⏰ Hiện không trong tiết học nào
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "#92400e" }}>
            Camera vẫn bật được — chỉ thông báo khi nhận diện sai giờ
          </p>
        </div>
      )}

      <p>
        Đã nhận diện:{" "}
        <b style={{ color: "#10b981" }}>{soNhanDien}</b> học sinh
      </p>

      <div
        style={{
          width: 600,
          maxWidth: "100%",
          margin: "15px 0",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {!running ? (
        <button
          onClick={start}
          style={{ fontSize: 18, padding: "12px 24px" }}
        >
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

export default TabCameraAI;
