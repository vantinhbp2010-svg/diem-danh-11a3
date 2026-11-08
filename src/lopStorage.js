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
  if (!maLop) throw new Error("Thiếu mã lớp");

  const dsHS = (await getDSLop(maLop)) || [];
  const maHSList = dsHS.map((student) => student.id);
  const ketQua = {
    diemDanh: false,
    faces: false,
    thiDua: false,
    tkb: false,
    ngayNghi: false,
    lop: false,
    danhSachLop: false,
  };
  const loiChiTiet = [];

  async function chayBuoc(key, label, action) {
    try {
      await action();
      ketQua[key] = true;
    } catch (error) {
      loiChiTiet.push(`${label}: ${error.message}`);
      console.warn(`${label}:`, error);
    }
  }

  await chayBuoc("diemDanh", "Lỗi xóa điểm danh", async () => {
    const { removeStudentsFromAttendance } = await import("./storage");
    await removeStudentsFromAttendance(maHSList);
  });

  await chayBuoc("faces", "Lỗi xóa khuôn mặt", async () => {
    const { getFaces, clearFaces } = await import("./faceStorage");
    const faces = await getFaces(maLop);
    for (const studentId of Object.keys(faces)) {
      await clearFaces(maLop, studentId);
    }
  });

  await chayBuoc("thiDua", "Lỗi xóa thi đua", async () => {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const thiDuaRef = docFn(db, "diemdanh", "thiDua");
    const thiDuaSnap = await getDocFn(thiDuaRef);
    const thiDuaAll = thiDuaSnap.exists() ? thiDuaSnap.data().data || {} : {};
    if (Object.hasOwn(thiDuaAll, maLop)) {
      delete thiDuaAll[maLop];
      await setDocFn(thiDuaRef, { data: thiDuaAll });
    }
  });

  await chayBuoc("tkb", "Lỗi xóa thời khóa biểu", async () => {
    const { xoaTKB } = await import("./tkbStorage");
    await xoaTKB(maLop);
  });

  await chayBuoc("ngayNghi", "Lỗi xóa ngày nghỉ", async () => {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const ngayNghiRef = docFn(db, "diemdanh", "ngayNghi");
    const ngayNghiSnap = await getDocFn(ngayNghiRef);
    const ngayNghiAll = ngayNghiSnap.exists() ? ngayNghiSnap.data().data || {} : {};
    if (Object.hasOwn(ngayNghiAll, maLop)) {
      delete ngayNghiAll[maLop];
      await setDocFn(ngayNghiRef, { data: ngayNghiAll });
    }
  });

  try {
    await setDoc(doc(db, "lop", maLop), { students: null }, { merge: true });
    ketQua.lop = true;
  } catch (error) {
    loiChiTiet.push(`Lỗi xóa danh sách học sinh lớp: ${error.message}`);
    throw new Error(
      `Không thể hoàn tất xóa lớp ${maLop}. ${loiChiTiet.join("; ")}`,
      { cause: error }
    );
  }

  try {
    const ds = await getDanhSachLop();
    delete ds[maLop];
    await saveDanhSachLop(ds);
    ketQua.danhSachLop = true;
  } catch (error) {
    loiChiTiet.push(`Lỗi xóa khỏi danh sách lớp: ${error.message}`);
    throw new Error(
      `Không thể xóa lớp ${maLop} khỏi danh sách lớp. ${loiChiTiet.join("; ")}`,
      { cause: error }
    );
  }

  const canhBao = loiChiTiet.length > 0;
  return {
    ok: true,
    canhBao,
    message: canhBao
      ? `Đã xóa lớp ${maLop}, nhưng còn ${loiChiTiet.length} bước dọn dữ liệu chưa hoàn tất.`
      : `Đã xóa hoàn toàn lớp ${maLop}.`,
    chiTiet: ketQua,
    loiChiTiet,
    soHSXoa: maHSList.length,
  };
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