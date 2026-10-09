// ============ TÍNH ĐIỂM TRỪ TỰ ĐỘNG TỪ ĐIỂM DANH ============
// Quy tắc:
//  - Vắng (không phép): -10đ/buổi
//  - Vắng có phép: -5đ/buổi
//  - Đi trễ: -3đ/tiết
// CHỈ TÍNH TRONG THÁNG HIỆN TẠI (theo tháng của tuần đang xem)

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

  const thangCuaTuan = start.getMonth();
  const namCuaTuan = start.getFullYear();

  const dsNgay = Object.keys(all).filter((ngay) => {
    const d = new Date(ngay);
    return (
      d >= start &&
      d <= end &&
      d.getMonth() === thangCuaTuan &&
      d.getFullYear() === namCuaTuan
    );
  });

  const chiTiet = {};
  students.forEach((s) => {
    chiTiet[s.id] = { vang: 0, coPhep: 0, diTre: 0, diemTru: 0 };
  });

  dsNgay.forEach((ngay) => {
    const dataNgay = all[ngay] || {};

    students.forEach((s) => {
      const hsData = dataNgay[s.id];
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
          chiTiet[s.id].vang++;
          chiTiet[s.id].diemTru -= 10;
        } else if (coCoPhep) {
          chiTiet[s.id].coPhep++;
          chiTiet[s.id].diemTru -= 5;
        }

        if (soLanTre > 0) {
          chiTiet[s.id].diTre += soLanTre;
          chiTiet[s.id].diemTru -= soLanTre * 3;
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