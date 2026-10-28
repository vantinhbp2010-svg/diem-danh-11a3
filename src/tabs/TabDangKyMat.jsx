import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useUx } from "../UxContext";

/* =============================================================
   TAB ĐĂNG KÝ KHUÔN MẶT
   ============================================================= */
function TabDangKyMat({ students, maLop }) {
  const { confirm } = useUx();
  const [selectedId, setSelectedId] = useState(students[0]?.id || "");
  const selected = students.some((student) => student.id === selectedId)
    ? selectedId
    : students[0]?.id || "";
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
        setStatus("❌ Model chưa load xong");
        setSaving(false);
        return;
      }

      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.4,
      });

      const videoEl = videoRef.current;
      if (!videoEl) {
        setStatus("❌ Camera chưa sẵn sàng");
        setSaving(false);
        return;
      }
      if (videoEl.readyState < 2) {
        setStatus("❌ Camera chưa load xong — đợi 2 giây rồi thử lại");
        setSaving(false);
        return;
      }
      if (!videoEl.videoWidth || !videoEl.videoHeight) {
        setStatus("❌ Camera chưa có hình — kiểm tra kết nối camera");
        setSaving(false);
        return;
      }

      const det = await faceapi
        .detectSingleFace(videoEl, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        setStatus("❌ Không thấy khuôn mặt");
        setSaving(false);
        return;
      }

      setStatus("⏳ Đang lưu...");
      const { saveFace } = await import("../faceStorage");
      await saveFace(maLop, selected, det.descriptor);

      const hs = students.find((s) => s.id === selected);
      setStatus(`✅ Đã lưu khuôn mặt: ${hs?.name}`);
      setSoDaChup((c) => c + 1);

      const idx = students.findIndex((s) => s.id === selected);
      if (idx < students.length - 1) {
        setTimeout(() => setSelectedId(students[idx + 1].id), 800);
      }
    } catch (err) {
      setStatus("❌ Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function xoaMat() {
    const hs = students.find((s) => s.id === selected);
    if (!(await confirm({
      message: `Xóa khuôn mặt của ${hs?.name}?`,
      destructive: true,
    }))) return;
    setSaving(true);
    try {
      const { clearFaces } = await import("../faceStorage");
      await clearFaces(maLop, selected);
      setStatus(`🗑️ Đã xóa khuôn mặt của ${hs?.name}`);
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
        💡 Chọn học sinh → nhìn thẳng camera → bấm <b>📸 Chụp</b>
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
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
        >
          {students.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.id} — {s.name}
            </option>
          ))}
        </select>

        <motion.button
          onClick={() => {
            if (idx > 0) setSelectedId(students[idx - 1].id);
          }}
          whileTap={{ scale: 0.95 }}
          style={{ background: "#94a3b8" }}
        >
          ⬅ Trước
        </motion.button>
        <motion.button
          onClick={() => {
            if (idx < students.length - 1) setSelectedId(students[idx + 1].id);
          }}
          whileTap={{ scale: 0.95 }}
          style={{ background: "#94a3b8" }}
        >
          Sau ➡
        </motion.button>
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

      <motion.button
        onClick={capture}
        whileTap={{ scale: 0.95 }}
        disabled={!loaded || saving}
        style={{
          fontSize: 18,
          padding: "12px 24px",
          background: saving ? "#94a3b8" : "#3b82f6",
        }}
      >
        {saving ? "⏳ Đang xử lý..." : `📸 Chụp khuôn mặt cho ${hs?.name}`}
      </motion.button>
      <motion.button
        onClick={xoaMat}
        whileTap={{ scale: 0.95 }}
        disabled={!loaded || saving}
        style={{ background: "#e74c3c", marginLeft: 10, padding: "12px 20px" }}
      >
        🗑️ Xóa khuôn mặt
      </motion.button>

      {status && <div className="msg">{status}</div>}
    </>
  );
}

export default TabDangKyMat;
