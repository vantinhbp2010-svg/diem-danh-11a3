import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { subscribeTeacherState } from "./auth";

export default function ProtectedRoute() {
  const [access, setAccess] = useState({ status: "loading" });

  useEffect(() => {
    return subscribeTeacherState(({ user, isTeacher, error }) => {
      if (error) {
        setAccess({ status: "error", message: error.message });
      } else if (isTeacher) {
        setAccess({ status: "authorized" });
      } else {
        setAccess({ status: "unauthorized", signedIn: Boolean(user) });
      }
    });
  }, []);

  if (access.status === "loading") {
    return <div className="app-loading" role="status">Đang xác thực...</div>;
  }
  if (access.status === "error") {
    return <div className="container" role="alert">Không thể xác thực: {access.message}</div>;
  }
  if (access.status !== "authorized") {
    return <Navigate to="/" replace state={{ signedIn: access.signedIn }} />;
  }
  return <Outlet />;
}