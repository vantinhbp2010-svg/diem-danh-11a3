import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_REF = doc(db, "diemdanh", "ngayNghi");

/**
 * Lấy tất cả ngày nghỉ của 1 lớp
 * Trả về: { "2026-10-20": ["sang"], "2026-10-21": ["sang", "chieu"] }
 */
export async function getNgayNghi(maLop) {
  if (!maLop) return {};
  const snap = await getDoc(DOC_REF);
  if (!snap.exists()) return {};
  const all = snap.data().data || {};
  return all[maLop] || {};
}

/**
 * Lấy tất cả ngày nghỉ của mọi lớp
 */
export async function getNgayNghiAll() {
  const snap = await getDoc(DOC_REF);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveNgayNghiAll(data) {
  await setDoc(DOC_REF, { data });
}

/**
 * Thêm ngày nghỉ cho lớp
 * @param maLop "11A3"
 * @param ngay "2026-10-20"
 * @param buoi "sang" | "chieu" | "ca"
 */
export async function themNgayNghi(maLop, ngay, buoi) {
  const all = await getNgayNghiAll();
  if (!all[maLop]) all[maLop] = {};
  if (!all[maLop][ngay]) all[maLop][ngay] = [];

  if (buoi === "ca") {
    // Cả ngày → thêm cả sáng + chiều
    if (!all[maLop][ngay].includes("sang")) all[maLop][ngay].push("sang");
    if (!all[maLop][ngay].includes("chieu")) all[maLop][ngay].push("chieu");
  } else {
    if (!all[maLop][ngay].includes(buoi)) all[maLop][ngay].push(buoi);
  }

  await saveNgayNghiAll(all);
  return all[maLop];
}

/**
 * Xóa ngày nghỉ
 */
export async function xoaNgayNghi(maLop, ngay, buoi) {
  const all = await getNgayNghiAll();
  if (!all[maLop] || !all[maLop][ngay]) return;

  if (buoi === "ca") {
    // Xóa cả ngày
    delete all[maLop][ngay];
  } else {
    all[maLop][ngay] = all[maLop][ngay].filter((b) => b !== buoi);
    if (all[maLop][ngay].length === 0) {
      delete all[maLop][ngay];
    }
  }

  await saveNgayNghiAll(all);
  return all[maLop];
}

/**
 * Kiểm tra 1 ngày/buổi có phải là ngày nghỉ không
 * @param ngayNghi Object từ getNgayNghi
 * @param ngay "2026-10-20"
 * @param buoi "sang" | "chieu"
 */
export function laNgayNghi(ngayNghi, ngay, buoi) {
  if (!ngayNghi || !ngayNghi[ngay]) return false;
  return ngayNghi[ngay].includes(buoi);
}