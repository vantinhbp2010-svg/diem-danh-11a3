import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { StudentsProvider } from "./StudentsContext";
import FloatingBackground from "./FloatingBackground";

const BannerThongBao = lazy(() => import("./BannerThongBao"));

export default function StudentsRoute() {
  return (
    <StudentsProvider>
      <>
        <FloatingBackground />
        <Suspense fallback={null}>
          <BannerThongBao />
        </Suspense>
        <Outlet />
      </>
    </StudentsProvider>
  );
}
