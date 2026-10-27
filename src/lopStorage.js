import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_DANH_SACH = doc(db, "lop", "danhSachLop");

export async function getDanhSachLop() {
  const snap = await getDoc(DOC_DANH_SACH);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveDanhSachLop(data) {
  await setDoc(DOC_DANH_SACH, { data });
}

export async function getDSLop(maLop) {
  if (!maLop) return null;
  const ref = doc(db, "lop", maLop);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().students || null;
}

export async function saveDSLop(maLop, students) {
  if (!maLop) throw new Error("Thiếu mã lớp");

  const ref = doc(db, "lop", maLop);
  await setDoc(ref, {
    students,
    updatedAt: new Date().toISOString(),
    soHS: students.length,
  });

  const ds = await getDanhSachLop();
  ds[maLop] = {
    ten: `Lớp ${maLop}`,
    soHS: students.length,
    updatedAt: new Date().toISOString(),
  };
  await saveDanhSachLop(ds);
}

/**
 * XÓA 1 LỚP + TẤT CẢ DỮ LIỆU LIÊN QUAN
 */
export async function xoaLop(maLop) {
  if (!maLop) return;

  // Bước 1: Lấy DS HS của lớp trước khi xóa
  const dsHS = (await getDSLop(maLop)) || [];
  const maHSList = dsHS.map((s) => s.id);

  // Bước 2: Xóa DS HS khỏi collection lop
  const ref = doc(db, "lop", maLop);
  await setDoc(ref, { students: null });

  // Bước 3: Xóa khỏi danh sách lớp chính
  const ds = await getDanhSachLop();
  delete ds[maLop];
  await saveDanhSachLop(ds);

  // Bước 4: Xóa điểm danh của học sinh khỏi tất cả các tháng
  try {
    const { removeStudentsFromAttendance } = await import("./storage");
    await removeStudentsFromAttendance(maHSList);
  } catch (e) {
    console.warn("Lỗi xóa điểm danh:", e);
  }

  // Bước 5: Xóa khuôn mặt của học sinh khỏi dữ liệu riêng của lớp
  try {
    const { getFaces, clearFaces } = await import("./faceStorage");
    const faces = await getFaces(maLop);
    for (const studentId of Object.keys(faces)) {
      await clearFaces(maLop, studentId);
    }
  } catch (e) {
    console.warn("Lỗi xóa faces:", e);
  }

  // Bước 6: Xóa điểm thi đua của lớp
  try {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const thiDuaRef = docFn(db, "diemdanh", "thiDua");
    const thiDuaSnap = await getDocFn(thiDuaRef);
    const thiDuaAll = thiDuaSnap.exists() ? thiDuaSnap.data().data || {} : {};
    if (thiDuaAll[maLop]) {
      delete thiDuaAll[maLop];
      await setDocFn(thiDuaRef, { data: thiDuaAll });
    }
  } catch (e) {
    console.warn("Lỗi xóa thiDua:", e);
  }

  // Bước 7: Xóa TKB riêng của lớp
  try {
    const { xoaTKB } = await import("./tkbStorage");
    await xoaTKB(maLop);
  } catch (e) {
    console.warn("Lỗi xóa TKB:", e);
  }

  // Bước 8: Xóa ngày nghỉ của lớp
  try {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const ngayNghiRef = docFn(db, "diemdanh", "ngayNghi");
    const ngayNghiSnap = await getDocFn(ngayNghiRef);
    const ngayNghiAll = ngayNghiSnap.exists() ? ngayNghiSnap.data().data || {} : {};
    if (ngayNghiAll[maLop]) {
      delete ngayNghiAll[maLop];
      await setDocFn(ngayNghiRef, { data: ngayNghiAll });
    }
  } catch (e) {
    console.warn("Lỗi xóa ngayNghi:", e);
  }

  return { ok: true, soHSXoa: maHSList.length };
}
/**
 * Đổi tên hiển thị của lớp
 * @param maLop "11A3"
 * @param tenMoi "11A3 - Chuyên Toán"
 */
export async function doiTenLop(maLop, tenMoi) {
  if (!maLop) throw new Error("Thiếu mã lớp");
  const ds = await getDanhSachLop();
  if (!ds[maLop]) throw new Error("Lớp không tồn tại");

  ds[maLop] = {
    ...ds[maLop],
    tenHienThi: tenMoi.trim() || maLop,
    updatedAt: new Date().toISOString(),
  };
  await saveDanhSachLop(ds);
  return ds[maLop];
}