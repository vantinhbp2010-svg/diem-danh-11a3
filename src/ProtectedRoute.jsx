import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "./auth";

export default function ProtectedRoute() {
  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}