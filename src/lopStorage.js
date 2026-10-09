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
  const maHSSet = new Set(maHSList);

  // Bước 2: Xóa DS HS khỏi collection lop
  const ref = doc(db, "lop", maLop);
  await setDoc(ref, { students: null });

  // Bước 3: Xóa khỏi danh sách lớp chính
  const ds = await getDanhSachLop();
  delete ds[maLop];
  await saveDanhSachLop(ds);

  // Bước 4: Xóa HS khỏi diemdanh/all (tất cả các ngày)
  try {
    const { getAttendance, saveAttendance } = await import("./storage");
    const dataAll = await getAttendance();
    let coThayDoi = false;

    Object.keys(dataAll).forEach((ngay) => {
      Object.keys(dataAll[ngay]).forEach((maHS) => {
        if (maHSSet.has(maHS)) {
          delete dataAll[ngay][maHS];
          coThayDoi = true;
        }
      });

      if (Object.keys(dataAll[ngay]).length === 0) {
        delete dataAll[ngay];
      }
    });

    if (coThayDoi) {
      await saveAttendance(dataAll);
    }
  } catch (e) {
    console.warn("Lỗi xóa diemdanh/all:", e);
  }

  // Bước 5: Xóa khuôn mặt của HS lớp này (diemdanh/faces)
  try {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const facesRef = docFn(db, "diemdanh", "faces");
    const facesSnap = await getDocFn(facesRef);
    const facesData = facesSnap.exists() ? facesSnap.data().data || {} : {};
    let coXoaMat = false;

    Object.keys(facesData).forEach((maHS) => {
      if (maHSSet.has(maHS)) {
        delete facesData[maHS];
        coXoaMat = true;
      }
    });

    if (coXoaMat) {
      await setDocFn(facesRef, { data: facesData });
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

  // Bước 7: Xóa TKB của lớp
  try {
    const { doc: docFn, getDoc: getDocFn, setDoc: setDocFn } = await import("firebase/firestore");
    const tkbRef = docFn(db, "diemdanh", "thoiKhoaBieu");
    const tkbSnap = await getDocFn(tkbRef);
    const tkbAll = tkbSnap.exists() ? tkbSnap.data().data || {} : {};
    if (tkbAll[maLop]) {
      delete tkbAll[maLop];
      await setDocFn(tkbRef, { data: tkbAll });
    }
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