// Danh sách vi phạm (theo Quy định tính điểm thi đua 2026-2027)
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

// Xếp loại
export function xepLoai(diem) {
  if (diem >= 90) return { ten: "Tốt", mau: "#10b981" };
  if (diem >= 80) return { ten: "Đạt", mau: "#f59e0b" };
  return { ten: "Chưa đạt", mau: "#dc2626" };
}

// Lấy mã tuần ISO — ví dụ: "2026-W41"
export function layTuanISO(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const tuan =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(tuan).padStart(2, "0")}`;
}

// Hiển thị tên tuần đẹp
export function tenTuan(tuanISO) {
  const [year, weekPart] = tuanISO.split("-W");
  return `Tuần ${parseInt(weekPart)} — Năm ${year}`;
}

// Lấy khoảng ngày của tuần
export function khoangNgayTuan(tuanISO) {
  const [year, weekPart] = tuanISO.split("-W");
  const week = parseInt(weekPart);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  const start = new Date(ISOweekStart);
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6);

  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

  return `${fmt(start)} — ${fmt(end)}`;
}