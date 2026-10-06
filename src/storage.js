const KEY = "diemdanh_10A1";

// Giờ vào lớp 2 buổi
const SANG_GIO = 7;      // 7h00
const SANG_PHUT = 0;
const SANG_TRE_TOI_DA = 45;

const CHIEU_GIO = 13;    // 13h30
const CHIEU_PHUT = 30;
const CHIEU_TRE_TOI_DA = 45;

export function getAttendance() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveAttendance(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Tính trạng thái theo buổi.
 * @param timeStr "hh:mm"
 * @param buoi "sang" | "chieu"
 * @returns "Đúng giờ" | "Đi trễ" | "Vắng"
 */
export function getStatusByTime(timeStr, buoi) {
  const [h, m] = timeStr.split(":").map(Number);
  const tongPhut = h * 60 + m;

  const gioVaoPhut =
    buoi === "sang"
      ? SANG_GIO * 60 + SANG_PHUT
      : CHIEU_GIO * 60 + CHIEU_PHUT;

  const hanTrePhut =
    gioVaoPhut + (buoi === "sang" ? SANG_TRE_TOI_DA : CHIEU_TRE_TOI_DA);

  if (tongPhut <= gioVaoPhut) return "Đúng giờ";
  if (tongPhut <= hanTrePhut) return "Đi trễ";
  return "Vắng";
}

/**
 * Điểm danh học sinh cho buổi cụ thể.
 * @param studentId mã học sinh
 * @param buoi "sang" | "chieu"
 */
export function markAttendance(studentId, buoi) {
  const today = new Date().toISOString().slice(0, 10);
  const data = getAttendance();
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
  const time = now.toTimeString().slice(0, 5); // hh:mm
  const status = getStatusByTime(time, buoi);

  if (status === "Vắng") {
    const han = buoi === "sang" ? "7h45" : "14h15";
    return {
      ok: false,
      message: `Đã quá ${han} — học sinh này tính là VẮNG, không điểm danh được.`,
    };
  }

  data[today][studentId][buoi] = { time, status };
  saveAttendance(data);

  return { ok: true, time, status };
}
/**
 * Xóa điểm danh của 1 học sinh trong ngày hôm nay.
 * @param studentId mã học sinh
 * @param buoi "sang" | "chieu" — nếu không truyền, xóa cả 2 buổi
 */
export function xoaDiemDanh(studentId, buoi) {
  const today = new Date().toISOString().slice(0, 10);
  const data = getAttendance();
  if (!data[today] || !data[today][studentId]) return;

  if (buoi) {
    delete data[today][studentId][buoi];
  } else {
    delete data[today][studentId];
  }

  // Nếu học sinh không còn buổi nào → xóa luôn key
  if (Object.keys(data[today][studentId] || {}).length === 0) {
    delete data[today][studentId];
  }

  saveAttendance(data);
}