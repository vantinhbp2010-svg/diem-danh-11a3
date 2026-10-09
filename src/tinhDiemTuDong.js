// ============ TÍNH ĐIỂM TRỪ TỰ ĐỘNG TỪ ĐIỂM DANH ============
// Quy tắc:
//  - Vắng (không phép): -10đ/buổi
//  - Vắng có phép: -5đ/buổi
//  - Đi trễ: -3đ/tiết
// TÍNH THEO TUẦN ĐANG XEM (không giới hạn tháng, tránh bug tuần bắc qua tháng)

import { getAttendance } from "./storage";
import { getNgayNghi, laNgayNghi } from "./ngayNghiStorage";
import { layKhoangNgayTuanHoc } from "./diemThiDua";

export async function tinhDiemTruTuDong(tuanCode, students, maLop) {
  const { start, end } = layKhoangNgayTuanHoc(tuanCode);

  if (!start || !end) {
    const empty = {};
    students.forEach((s) => {
      empty[s.id] = { vang: 0, coPhep: 0, diTre: 0, diemTru: 0 };
    });
    return { diemTru: 0, chiTiet: empty };
  }

  const all = await getAttendance();
  const ngayNghi = maLop ? await getNgayNghi(maLop) : {};

  // ⭐ CHỈ LỌC THEO start/end, KHÔNG LỌC THÁNG
  // → Tránh bug tuần bắc qua 2 tháng (VD tuần 5: 03/10 → 09/10)
  const dsNgay = Object.keys(all).filter((ngay) => {
    const d = new Date(ngay + "T00:00:00");
    return d >= start && d <= end;
  });

  // Khởi tạo chi tiết cho TẤT CẢ HS trong lớp hiện tại
  const chiTiet = {};
  students.forEach((s) => {
    chiTiet[s.id] = { vang: 0, coPhep: 0, diTre: 0, diemTru: 0 };
  });

  // Set mã HS của lớp hiện tại để lọc nhanh
  const maHSCuaLop = new Set(students.map((s) => s.id));

  dsNgay.forEach((ngay) => {
    const dataNgay = all[ngay] || {};

    // Duyệt tất cả HS trong ngày, lọc chỉ lấy HS thuộc lớp hiện tại
    Object.keys(dataNgay).forEach((maHS) => {
      if (!maHSCuaLop.has(maHS)) return;

      const hsData = dataNgay[maHS];
      if (!hsData) return;

      ["sang", "chieu"].forEach((buoi) => {
        if (laNgayNghi(ngayNghi, ngay, buoi)) return;

        if (!hsData[buoi]) return;
        const tietTrongBuoi = hsData[buoi];

        let coVang = false;
        let coCoPhep = false;
        let soLanTre = 0;

        Object.keys(tietTrongBuoi).forEach((keyTiet) => {
          const t = tietTrongBuoi[keyTiet];
          if (t.trangThai === "Vắng") coVang = true;
          else if (t.trangThai === "Có phép") coCoPhep = true;
          else if (t.trangThai === "Đi trễ") soLanTre++;
        });

        if (coVang) {
          chiTiet[maHS].vang++;
          chiTiet[maHS].diemTru -= 10;
        } else if (coCoPhep) {
          chiTiet[maHS].coPhep++;
          chiTiet[maHS].diemTru -= 5;
        }

        if (soLanTre > 0) {
          chiTiet[maHS].diTre += soLanTre;
          chiTiet[maHS].diemTru -= soLanTre * 3;
        }
      });
    });
  });

  let diemTru = 0;
  Object.values(chiTiet).forEach((c) => {
    diemTru += c.diemTru;
  });

  return { diemTru, chiTiet };
}