/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
const App = lazy(() => import("./App.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Khach = lazy(() => import("./Khach.jsx"));
const ProtectedRoute = lazy(() => import("./ProtectedRoute.jsx"));
const ChatBot = lazy(() => import("./ChatBot.jsx"));
const StudentsRoute = lazy(() => import("./StudentsRoute.jsx"));

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
    <BrowserRouter>
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
  </StrictMode>
);