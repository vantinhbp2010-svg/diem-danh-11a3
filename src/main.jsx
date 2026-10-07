import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import Khach from "./Khach.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import ChatBot from "./ChatBot.jsx";
import { StudentsProvider } from "./StudentsContext.jsx";

function PWABanner() {
  const [coTheCai, setCoTheCai] = useState(false);
  const [daCai, setDaCai] = useState(false);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDaCai(true);
      return;
    }
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/khach" element={<Khach />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/diemdanhhocsinhlop11A3" element={<App />} />
          </Route>
          <Route path="*" element={<Navigate to="/khach" replace />} />
        </Routes>
        <ChatBot />
        <PWABanner />
      </BrowserRouter>
    </StudentsProvider>
  </StrictMode>
);