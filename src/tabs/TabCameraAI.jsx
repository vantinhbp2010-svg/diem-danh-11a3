import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { layThuHienTai } from "../thoiKhoaBieu";
import { isSoundEnabled, playSuccess, unlockAudio } from "../utils/sound";

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
  const logContainerRef = useRef(null);
  const dangXuLyRef = useRef(false);   // ✅ Thêm dòng này — tránh overlap khi detect chậm

  function addLog(text) {
    const time = new Date().toTimeString().slice(0, 8);
    setLastLog((prev) => [...prev, `[${time}] ${text}`].slice(-30));
  }

  useEffect(() => {
    const logContainer = logContainerRef.current;
    if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
  }, [lastLog]);

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
    if (isSoundEnabled()) {
      void unlockAudio().catch((error) => {
        console.warn("Không thể kích hoạt âm thanh camera:", error);
      });
    }
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

          const res = await onMark(hs.id, t.buoi, t.tiet, { sound: false });
          if (res?.ok) {
            setSoNhanDien((c) => c + 1);
            if (isSoundEnabled()) playSuccess();
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
    <section className="camera-container" aria-label="Điểm danh bằng camera AI">
      {tietHienTai ? (
        <div className="camera-status camera-status--lesson" role="status">
          <div className="camera-status-copy">
            <p className="camera-status-title">
            📚 Đang tiết {tietHienTai.tiet} — Buổi{" "}
            {tietHienTai.buoi === "sang" ? "Sáng" : "Chiều"}
            </p>
            <p className="camera-status-detail">
              ⏰ Thời gian: {tietHienTai.vao} — {tietHienTai.ra}
            </p>
          </div>
          <span className="camera-badge">Đã nhận diện: {soNhanDien}</span>
        </div>
      ) : (
        <div className="camera-status camera-status--idle" role="status">
          <div className="camera-status-copy">
            <p className="camera-status-title">
              ⏰ Hiện không trong tiết học nào
            </p>
            <p className="camera-status-detail">
              Camera vẫn bật được — chỉ thông báo khi nhận diện sai giờ
            </p>
          </div>
          <span className="camera-badge">Đã nhận diện: {soNhanDien}</span>
        </div>
      )}

      <div className={`camera-video-shell${running ? " is-running" : ""}`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-video"
          aria-label="Hình ảnh camera điểm danh"
        />
        <div className="camera-video-overlay" aria-hidden="true">
          <span className="camera-corner camera-corner--tl" />
          <span className="camera-corner camera-corner--tr" />
          <span className="camera-corner camera-corner--bl" />
          <span className="camera-corner camera-corner--br" />
          <span className="camera-scan-line" />
        </div>
        <span className={`camera-live${running ? " is-live" : ""}`}>
          <span aria-hidden="true" />
          {running ? "Đang quét" : "Camera đang tắt"}
        </span>
      </div>

      {!running ? (
        <motion.button
          onClick={start}
          whileTap={{ scale: 0.95 }}
          className="camera-action camera-action--start"
        >
          <span aria-hidden="true">▶</span> Bật Camera
        </motion.button>
      ) : (
        <motion.button
          onClick={stop}
          whileTap={{ scale: 0.95 }}
          className="camera-action camera-action--stop"
        >
          <span aria-hidden="true">⏹</span> Tắt Camera
        </motion.button>
      )}

      {msg && <div className="msg">{msg}</div>}

      {lastLog.length > 0 && (
        <div className="camera-log" ref={logContainerRef}>
          <h4>Nhật ký ({lastLog.length})</h4>
          <ul role="log" aria-live="polite">
            {lastLog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default TabCameraAI;
