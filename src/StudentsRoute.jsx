import { Outlet } from "react-router-dom";
import { StudentsProvider } from "./StudentsContext";

export default function StudentsRoute() {
  return (
    <StudentsProvider>
      <Outlet />
    </StudentsProvider>
  );
}
