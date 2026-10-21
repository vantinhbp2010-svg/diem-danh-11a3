import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getDSLop, getDanhSachLop, doiTenLop } from "./lopStorage";
// ✅ ĐÃ XÓA: import { students as defaultStudents } from "./data";

const StudentsContext = createContext(null);

const KEY_LOP = "lop_dang_chon";

export function StudentsProvider({ children }) {
  const [students, setStudents] = useState([]);   // ✅ ĐỔI defaultStudents → []
  const [loading, setLoading] = useState(true);
  const [maLop, setMaLop] = useState("");
  const [danhSachLop, setDanhSachLop] = useState({});

  const loadDS = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Nạp danh sách lớp từ cloud bất đồng bộ.
    loadDS();
  }, [loadDS]);

  const chonLop = useCallback(async (maLopMoi) => {
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
  }, []);

  const reload = useCallback(async () => {
    await loadDS();
  }, [loadDS]);

  // ✅ Đổi tên hiển thị lớp mà không thay đổi mã lớp gốc
  const doiTen = useCallback(async (maLopMoi, tenMoi) => {
    await doiTenLop(maLopMoi, tenMoi);
    await loadDS();
  }, [loadDS]);

  const value = useMemo(
    () => ({
      students,
      loading,
      maLop,
      danhSachLop,
      chonLop,
      reload,
      setStudents,
      doiTen,
    }),
    [students, loading, maLop, danhSachLop, chonLop, reload, doiTen]
  );

  return (
    <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook này dùng chung context với provider.
export function useStudents() {
  const ctx = useContext(StudentsContext);
  if (!ctx) {
    throw new Error("useStudents phải dùng trong StudentsProvider");
  }
  return ctx;
}