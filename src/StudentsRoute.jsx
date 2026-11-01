import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { StudentsProvider } from "./StudentsContext";

const BannerThongBao = lazy(() => import("./BannerThongBao"));

export default function StudentsRoute() {
  return (
    <StudentsProvider>
      <>
        <Suspense fallback={null}>
          <BannerThongBao />
        </Suspense>
        <Outlet />
      </>
    </StudentsProvider>
  );
}
