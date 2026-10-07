import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_DANH_SACH = doc(db, "lop", "danhSachLop");

/**
 * Lấy danh sách tất cả các lớp đã tạo
 * Trả về: { "11A3": { ten: "Lớp 11A3", soHS: 39 }, ... }
 */
export async function getDanhSachLop() {
  const snap = await getDoc(DOC_DANH_SACH);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveDanhSachLop(data) {
  await setDoc(DOC_DANH_SACH, { data });
}

/**
 * Lấy danh sách học sinh của 1 lớp
 * @param maLop "11A3"
 */
export async function getDSLop(maLop) {
  if (!maLop) return null;
  const ref = doc(db, "lop", maLop);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().students || null;
}

/**
 * Lưu danh sách học sinh cho 1 lớp
 * Đồng thời cập nhật vào danh sách lớp chính
 */
export async function saveDSLop(maLop, students) {
  if (!maLop) throw new Error("Thiếu mã lớp");

  // 1. Lưu danh sách học sinh
  const ref = doc(db, "lop", maLop);
  await setDoc(ref, {
    students,
    updatedAt: new Date().toISOString(),
    soHS: students.length,
  });

  // 2. Cập nhật vào danh sách lớp chính
  const ds = await getDanhSachLop();
  ds[maLop] = {
    ten: `Lớp ${maLop}`,
    soHS: students.length,
    updatedAt: new Date().toISOString(),
  };
  await saveDanhSachLop(ds);
}

/**
 * Xóa 1 lớp
 */
export async function xoaLop(maLop) {
  if (!maLop) return;

  // 1. Xóa danh sách học sinh
  const ref = doc(db, "lop", maLop);
  await setDoc(ref, { students: null });

  // 2. Xóa khỏi danh sách lớp chính
  const ds = await getDanhSachLop();
  delete ds[maLop];
  await saveDanhSachLop(ds);
}