import { createContext, useContext, useState, useEffect } from "react";
import { getDSLop, getDanhSachLop } from "./lopStorage";
// ✅ ĐÃ XÓA: import { students as defaultStudents } from "./data";

const StudentsContext = createContext(null);

const KEY_LOP = "lop_dang_chon";

export function StudentsProvider({ children }) {
  const [students, setStudents] = useState([]);   // ✅ ĐỔI defaultStudents → []
  const [loading, setLoading] = useState(true);
  const [maLop, setMaLop] = useState("");
  const [danhSachLop, setDanhSachLop] = useState({});

  useEffect(() => {
    loadDS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDS() {
    try {
      setLoading(true);

      const ds = await getDanhSachLop();
      setDanhSachLop(ds);

      const lopDaChon = localStorage.getItem(KEY_LOP) || "";
      let maLopDung = lopDaChon;

      if (!maLopDung || !ds[maLopDung]) {
        const dsKeys = Object.keys(ds);
        maLopDung = dsKeys.length > 0 ? dsKeys[0] : "";
        if (maLopDung) localStorage.setItem(KEY_LOP, maLopDung);
      }

      setMaLop(maLopDung);

      if (maLopDung) {
        const dsHS = await getDSLop(maLopDung);
        if (dsHS && dsHS.length > 0) {
          setStudents(dsHS);
        } else {
          setStudents([]);
        }
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Lỗi load DS:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function chonLop(maLopMoi) {
    try {
      setLoading(true);
      localStorage.setItem(KEY_LOP, maLopMoi);
      setMaLop(maLopMoi);

      const dsHS = await getDSLop(maLopMoi);
      if (dsHS && dsHS.length > 0) {
        setStudents(dsHS);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Lỗi chọn lớp:", err);
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    await loadDS();
  }

  return (
    <StudentsContext.Provider
      value={{
        students,
        loading,
        maLop,
        danhSachLop,
        chonLop,
        reload,
        setStudents,
      }}
    >
      {children}
    </StudentsContext.Provider>
  );
}

export function useStudents() {
  const ctx = useContext(StudentsContext);
  if (!ctx) {
    throw new Error("useStudents phải dùng trong StudentsProvider");
  }
  return ctx;
}