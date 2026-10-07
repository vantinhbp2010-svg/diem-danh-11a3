import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { students } from "./data";

const GIO_VAO_SANG = 7;
const PHUT_SANG = 0;
const TRE_SANG = 45;

const GIO_VAO_CHIEU = 13;
const PHUT_CHIEU = 30;
const TRE_CHIEU = 45;

/**
 * Lấy toàn bộ dữ liệu điểm danh
 */
export async function getAttendance() {
  const ref = doc(db, "diemdanh", "all");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data || {} : {};
}

/**
 * Lưu toàn bộ dữ liệu điểm danh
 */
export async function saveAttendance(data) {
  const ref = doc(db, "diemdanh", "all");
  await setDoc(ref, { data });
}

/**
 * Tính trạng thái theo giờ
 */
export function getStatusByTime(timeStr, buoi) {
  const [h, m] = timeStr.split(":").map(Number);
  const tongPhut = h * 60 + m;

  const gioVaoPhut =
    buoi === "sang"
      ? GIO_VAO_SANG * 60 + PHUT_SANG
      : GIO_VAO_CHIEU * 60 + PHUT_CHIEU;

  const hanTrePhut =
    gioVaoPhut + (buoi === "sang" ? TRE_SANG : TRE_CHIEU);

  if (tongPhut <= gioVaoPhut) return "Đúng giờ";
  if (tongPhut <= hanTrePhut) return "Đi trễ";
  return "Vắng";
}

/**
 * Điểm danh 1 học sinh
 */
export async function markAttendance(studentId, buoi) {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getAttendance();
  if (!data[today]) data[today] = {};
  if (!data[today][studentId]) data[today][studentId] = {};

  if (data[today][studentId][buoi]) {
    return {
      ok: false,
      message: `Học sinh này đã điểm danh buổi ${
        buoi === "sang" ? "sáng" : "chiều"
      } rồi!`,
    };
  }

  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  const status = getStatusByTime(time, buoi);

  if (status === "Vắng") {
    const han = buoi === "sang" ? "7h45" : "14h15";
    return {
      ok: false,
      message: `Đã quá ${han} — tính là VẮNG, không điểm danh được.`,
    };
  }

  data[today][studentId][buoi] = { time, status };
  await saveAttendance(data);

  return { ok: true, time, status };
}

/**
 * Xóa điểm danh 1 học sinh
 */
export async function xoaDiemDanh(studentId, buoi) {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getAttendance();
  if (!data[today] || !data[today][studentId]) return;

  if (buoi) {
    delete data[today][studentId][buoi];
  } else {
    delete data[today][studentId];
  }

  if (Object.keys(data[today][studentId] || {}).length === 0) {
    delete data[today][studentId];
  }

  await saveAttendance(data);
}
/**
 * Xóa TẤT CẢ dữ liệu của 1 học sinh
 * (điểm danh + khuôn mặt + QR CCCD)
 */
export async function xoaTatCaCuaHocSinh(studentId) {
  // 1. Xóa điểm danh
  const today = new Date().toISOString().slice(0, 10);
  const data = await getAttendance();
  if (data[today] && data[today][studentId]) {
    delete data[today][studentId];
  }
  await saveAttendance(data);

  // 2. Xóa khuôn mặt
  try {
    const { clearFaces } = await import("./faceStorage");
    await clearFaces(studentId);
  } catch (e) {
    console.warn("Lỗi xóa mặt:", e);
  }

  // 3. Xóa QR CCCD
  try {
    const { deleteQR } = await import("./qrStorage");
    await deleteQR(studentId);
  } catch (e) {
    console.warn("Lỗi xóa QR:", e);
  }
}
/**
 * Lấy điểm danh của 1 ngày cụ thể
 * @param date "yyyy-mm-dd"
 */
export async function getAttendanceByDate(date) {
  const all = await getAttendance();
  return all[date] || {};
}

/**
 * Lấy danh sách tất cả các ngày có dữ liệu
 * Trả về mảng ["2026-10-01", "2026-10-02", ...] sắp xếp mới → cũ
 */
export async function getDanhSachNgay() {
  const all = await getAttendance();
  return Object.keys(all).sort().reverse();
}

/**
 * Sửa điểm danh thủ công
 */
export async function updateAttendance(studentId, date, buoi, status, time) {
  const data = await getAttendance();
  if (!data[date]) data[date] = {};
  if (!data[date][studentId]) data[date][studentId] = {};

  data[date][studentId][buoi] = { status, time };
  await saveAttendance(data);
}

/**
 * Xóa điểm danh 1 em trong 1 ngày cụ thể
 */
export async function xoaDiemDanhTheoNgay(studentId, date, buoi) {
  const data = await getAttendance();
  if (!data[date] || !data[date][studentId]) return;

  if (buoi) {
    delete data[date][studentId][buoi];
  } else {
    delete data[date][studentId];
  }

  if (Object.keys(data[date][studentId] || {}).length === 0) {
    delete data[date][studentId];
  }

  await saveAttendance(data);
}
/**
 * Lấy toàn bộ dữ liệu điểm danh trong 1 tháng
 * @param thang "yyyy-mm"
 * Trả về: { "2026-10-01": {...}, "2026-10-02": {...}, ... }
 */
export async function getAttendanceByMonth(thang) {
  const all = await getAttendance();
  const ketQua = {};
  Object.keys(all).forEach((ngay) => {
    if (ngay.startsWith(thang)) {
      ketQua[ngay] = all[ngay];
    }
  });
  return ketQua;
}

/**
 * Tính thống kê cho tất cả học sinh trong 1 tháng
 * @param thang "yyyy-mm"
 */
/**
 * Tính thống kê cho tất cả học sinh trong 1 tháng
 * @param thang "yyyy-mm"
 * @param students Danh sách học sinh
 * Quy tắc: Mỗi ngày trong tháng = 2 buổi (sáng + chiều)
 *          Không có dữ liệu → tính là VẮNG
 */
export async function tinhThongKeThang(thang, students) {
  const dataThang = await getAttendanceByMonth(thang);

  // Lấy tất cả các ngày có dữ liệu
  const dsNgayCoDuLieu = Object.keys(dataThang).sort();

  // Đếm số ngày trong tháng
  const [year, month] = thang.split("-").map(Number);
  const soNgayTrongThang = new Date(year, month, 0).getDate();

  // Khởi tạo thống kê cho từng em
  const thongKe = {};
  students.forEach((s) => {
    thongKe[s.id] = {
      id: s.id,
      name: s.name,
      dungGio: 0,
      diTre: 0,
      vang: 0,
      tongBuoi: 0,
    };
  });

  // Đếm theo các ngày CÓ DỮ LIỆU
  dsNgayCoDuLieu.forEach((ngay) => {
    const dataNgay = dataThang[ngay];
    students.forEach((s) => {
      const hs = dataNgay[s.id] || {};

      // Buổi sáng
      const sang = hs.sang;
      thongKe[s.id].tongBuoi++;
      if (sang) {
        if (sang.status === "Đúng giờ") thongKe[s.id].dungGio++;
        else if (sang.status === "Đi trễ") thongKe[s.id].diTre++;
        else thongKe[s.id].vang++;
      } else {
        thongKe[s.id].vang++;
      }

      // Buổi chiều
      const chieu = hs.chieu;
      thongKe[s.id].tongBuoi++;
      if (chieu) {
        if (chieu.status === "Đúng giờ") thongKe[s.id].dungGio++;
        else if (chieu.status === "Đi trễ") thongKe[s.id].diTre++;
        else thongKe[s.id].vang++;
      } else {
        thongKe[s.id].vang++;
      }
    });
  });

  return {
    thang,
    soNgay: dsNgayCoDuLieu.length,
    soNgayTrongThang,
    dsNgay: dsNgayCoDuLieu,
    thongKe: Object.values(thongKe),
  };
}