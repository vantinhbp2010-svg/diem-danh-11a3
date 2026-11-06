/* eslint-disable react-refresh/only-export-components */
import {
  StrictMode,
  lazy,
  Suspense,
  useState,
  useEffect,
  Component,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import {
  firebaseConfigError,
  missingConfigKeys,
} from "./firebase";
import ToastProvider from "./ToastProvider";
import { unlockAudio } from "./utils/sound";
import "./index.css";
const App = lazy(() => import("./App.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Khach = lazy(() => import("./Khach.jsx"));
const ProtectedRoute = lazy(() => import("./ProtectedRoute.jsx"));
const ChatBot = lazy(() => import("./ChatBot.jsx"));
const StudentsRoute = lazy(() => import("./StudentsRoute.jsx"));

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main style={errorPageStyle}>
          <h1>Ứng dụng gặp lỗi</h1>
          <p>Đã xảy ra lỗi khi tải ứng dụng. Hãy tải lại trang hoặc kiểm tra Console.</p>
          <pre style={errorDetailsStyle}>{this.state.error.message}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function FirebaseConfigError() {
  return (
    <main style={errorPageStyle}>
      <h1>Chưa cấu hình Firebase</h1>
      <p>{firebaseConfigError}</p>
      <h2>Các biến còn thiếu</h2>
      <ul>
        {missingConfigKeys.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
      <p>
        Trên Vercel: mở <b>Settings → Environment Variables</b>, thêm từng biến,
        chọn các môi trường cần dùng rồi lưu. Sau đó vào <b>Deployments</b> và
        chọn <b>Redeploy</b>.
      </p>
      <p>Chạy local: khai báo các biến trong file <code>.env</code> hoặc <code>.env.local</code>.</p>
    </main>
  );
}

const errorPageStyle = {
  maxWidth: 720,
  margin: "10vh auto",
  padding: 24,
  color: "#172033",
  background: "#fff",
  border: "1px solid #fecaca",
  borderRadius: 16,
  boxShadow: "0 12px 32px rgba(15, 23, 42, .12)",
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.6,
};

const errorDetailsStyle = {
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  padding: 12,
  color: "#991b1b",
  background: "#fef2f2",
  borderRadius: 8,
};

function AudioUnlocker() {
  useEffect(() => {
    const handleFirstInteraction = () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      unlockAudio().catch((error) => {
        console.warn("Không thể khởi tạo âm thanh:", error);
      });
    };

    window.addEventListener("pointerdown", handleFirstInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  return null;
}

function PWABanner() {
  const [coTheCai, setCoTheCai] = useState(false);
  const [daCai, setDaCai] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches
  );
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setCoTheCai(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setDaCai(true);
      setCoTheCai(false);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleCai() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setCoTheCai(false);
    setPrompt(null);
  }

  if (daCai || !coTheCai) return null;

  return (
    <button className="pwa-install-btn" onClick={handleCai}>
      📱 Cài app vào máy
    </button>
  );
}

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      {firebaseConfigError ? (
        <FirebaseConfigError />
      ) : (
        <ToastProvider>
          <BrowserRouter>
            <AudioUnlocker />
            <Suspense
              fallback={
                <div className="app-loading" role="status">
                  Đang tải...
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route element={<StudentsRoute />}>
                  <Route path="/khach" element={<Khach />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/diemdanhhocsinhlop11A3" element={<App />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Suspense fallback={null}>
              <ChatBot />
            </Suspense>
            <PWABanner />
          </BrowserRouter>
        </ToastProvider>
      )}
    </AppErrorBoundary>
  </StrictMode>
);