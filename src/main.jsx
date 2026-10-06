import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import Khach from "./Khach.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/khach" element={<Khach />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/diemdanhhocsinhlop11A3" element={<App />} />
        </Route>

        <Route path="*" element={<Navigate to="/khach" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);