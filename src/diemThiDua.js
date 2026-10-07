// ============ NGÀY KHAI GIẢNG ============
// Sửa tại đây nếu năm sau khai giảng ngày khác
const NGAY_KHAI_GIANG = new Date("2026-09-05");

// ============ DANH SÁCH VI PHẠM ============
export const DANH_SACH_VI_PHAM = [
  { ma: "VP01", ten: "Vô lễ với giáo viên, CNV", diem: -30 },
  { ma: "VP02", ten: "Tự sửa chữa số đầu bài", diem: -20 },
  { ma: "VP03", ten: "Vi phạm trong tiết kiểm tra", diem: -20 },
  { ma: "VP04", ten: "Đánh nhau", diem: -20 },
  { ma: "VP05", ten: "Sử dụng vật liệu dễ cháy nổ", diem: -50 },
  { ma: "VP06", ten: "Mang vũ khí đến trường", diem: -40 },
  { ma: "VP07", ten: "Lớp trống tiết, mất trật tự", diem: -10 },
  { ma: "VP08", ten: "Sử dụng điện thoại khi chưa được phép", diem: -30 },
  { ma: "VP09", ten: "Không đeo phù hiệu, logo trường", diem: -5 },
  { ma: "VP10", ten: "Vào học muộn trong tiết", diem: -3 },
  { ma: "VP11", ten: "Vắng học có phép", diem: -5 },
  { ma: "VP12", ten: "Vắng học không phép", diem: -10 },
  { ma: "VP13", ten: "Vắng trong các buổi triệu tập", diem: -10 },
  { ma: "VP14", ten: "Cúp tiết, vắng chào cờ", diem: -10 },
  { ma: "VP15", ten: "Đi dép không đúng quy định", diem: -10 },
  { ma: "VP16", ten: "Nhuộm tóc, tóc dài, xăm hình", diem: -10 },
  { ma: "VP17", ten: "Viết vẽ bậy lên bàn", diem: -10 },
  { ma: "VP18", ten: "Đem đồ ăn vào phòng học", diem: -10 },
  { ma: "VP19", ten: "Ý thức tập trung không tốt", diem: -10 },
  { ma: "VP20", ten: "Lớp không hoàn thành nhiệm vụ", diem: -20 },
  { ma: "VP21", ten: "Hút thuốc", diem: -20 },
  { ma: "VP22", ten: "Nói tục, chửi thề", diem: -20 },
  { ma: "VP23", ten: "Không ghi sĩ số, điểm danh sai", diem: -10 },
  { ma: "VP24", ten: "Vệ sinh lớp bừa bộn", diem: -20 },
  { ma: "VP25", ten: "Không bình bông, khăn bàn GV", diem: -5 },
];

export const DANH_SACH_KHEN_THUONG = [
  { ma: "KT01", ten: "Giải nhất tỉnh", diem: 20 },
  { ma: "KT02", ten: "Giải nhì tỉnh", diem: 18 },
  { ma: "KT03", ten: "Giải ba tỉnh", diem: 15 },
  { ma: "KT04", ten: "Giải khuyến khích tỉnh", diem: 10 },
  { ma: "KT05", ten: "Giải nhất phường", diem: 10 },
  { ma: "KT06", ten: "Giải nhì phường", diem: 8 },
  { ma: "KT07", ten: "Giải ba phường", diem: 5 },
  { ma: "KT08", ten: "Giải khuyến khích phường", diem: 3 },
  { ma: "KT09", ten: "Lao động đúng yêu cầu", diem: 10 },
  { ma: "KT10", ten: "Vệ sinh đạt yêu cầu", diem: 5 },
];

// Điểm khởi đầu mỗi tuần
export const DIEM_BAN_DAU = 100;

// ============ XẾP LOẠI ============
export function xepLoai(diem) {
  if (diem >= 90) return { ten: "Tốt", mau: "#10b981" };
  if (diem >= 80) return { ten: "Đạt", mau: "#f59e0b" };
  return { ten: "Chưa đạt", mau: "#dc2626" };
}

// ============ TÍNH TUẦN HỌC ============
/**
 * Tính tuần học kể từ ngày khai giảng
 * Trả về mã tuần dạng "2026-T01", "2026-T02", ...
 */
export function layTuanHoc(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const kg = new Date(NGAY_KHAI_GIANG);
  kg.setHours(0, 0, 0, 0);

  // Nếu ngày trước khai giảng → tuần 0
  if (d < kg) {
    return `${d.getFullYear()}-T00`;
  }

  // Số ngày kể từ khai giảng
  const soNgay = Math.floor((d - kg) / (1000 * 60 * 60 * 24));

  // Số tuần (tuần 1 = 7 ngày đầu tiên)
  const tuan = Math.floor(soNgay / 7) + 1;

  return `${d.getFullYear()}-T${String(tuan).padStart(2, "0")}`;
}

/**
 * Hiển thị tên tuần đẹp
 * "2026-T06" → "Tuần 6 — Năm học 2026-2027"
 */
export function tenTuanHoc(tuanCode) {
  if (!tuanCode) return "";
  const [year, tuanPart] = tuanCode.split("-T");
  const tuan = parseInt(tuanPart);
  const namHoc = `${year}-${parseInt(year) + 1}`;

  if (tuan === 0) {
    return `Trước khai giảng — Năm học ${namHoc}`;
  }

  return `Tuần ${tuan} — Năm học ${namHoc}`;
}

/**
 * Lấy khoảng ngày của tuần học
 * "2026-T06" → "05/10 — 11/10"
 */
export function khoangNgayTuanHoc(tuanCode) {
  if (!tuanCode) return "";
  const [year, tuanPart] = tuanCode.split("-T");
  const tuan = parseInt(tuanPart);

  if (tuan === 0) return "Trước khai giảng";

  const kg = new Date(NGAY_KHAI_GIANG);
  const start = new Date(kg);
  start.setDate(start.getDate() + (tuan - 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

  return `${fmt(start)} — ${fmt(end)}`;
}

/**
 * Lấy ngày bắt đầu và kết thúc của tuần học
 */
export function layKhoangNgayTuanHoc(tuanCode) {
  if (!tuanCode) return { start: null, end: null };
  const [year, tuanPart] = tuanCode.split("-T");
  const tuan = parseInt(tuanPart);

  if (tuan === 0) return { start: null, end: null };

  const kg = new Date(NGAY_KHAI_GIANG);
  const start = new Date(kg);
  start.setDate(start.getDate() + (tuan - 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Alias để tương thích với code cũ (không cần đổi import)
export const layTuanISO = layTuanHoc;
export const tenTuan = tenTuanHoc;
export const khoangNgayTuan = khoangNgayTuanHoc;