import * as XLSX from "xlsx";
import {
  layTuanISO,
  tenTuan,
  khoangNgayTuan,
  xepLoai,
  DIEM_BAN_DAU,
} from "./diemThiDua";
import { getThiDuaTuan } from "./thiDuaStorage";
import { tinhDiemTruTuDong } from "./tinhDiemTuDong";

/**
 * Xuất Excel điểm thi đua 1 tuần
 */
export async function xuatExcelTuan(maLop, tuanCode, students) {
  // Lấy điểm nhập tay
  const duLieu = await getThiDuaTuan(maLop, tuanCode);

  // Tính điểm trừ tự động
  const tuDong = await tinhDiemTruTuDong(tuanCode, students, maLop);

  const rows = students.map((s, i) => {
    const caNhan = duLieu.caNhan?.[s.id] || {
      diem: DIEM_BAN_DAU,
      viPham: [],
      khenThuong: [],
    };
    const chiTiet = tuDong.chiTiet?.[s.id] || {
      vang: 0,
      coPhep: 0,
      diTre: 0,
      diemTru: 0,
    };

    const tongDiem = caNhan.diem + chiTiet.diemTru;
    const xl = xepLoai(tongDiem);

    return {
      STT: i + 1,
      "Mã HS": s.id,
      "Họ tên": s.name,
      "Điểm nhập tay": caNhan.diem,
      "Vắng (buổi)": chiTiet.vang,
      "Có phép (buổi)": chiTiet.coPhep,
      "Đi trễ (tiết)": chiTiet.diTre,
      "Trừ tự động": chiTiet.diemTru,
      "Tổng điểm": tongDiem,
      "Xếp loại": xl.ten,
    };
  });

  // Thêm dòng tổng kết lớp
  const lopData = duLieu.lop || {
    diem: DIEM_BAN_DAU,
    viPham: [],
    khenThuong: [],
  };
  const diemLop = lopData.diem + tuDong.diemTru;
  const lopXL = xepLoai(diemLop);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DiemThiDuaTuan");

  // Sheet 2: Tổng kết lớp
  const tongKet = [
    ["THÔNG TIN LỚP", ""],
    ["Mã lớp", maLop],
    ["Tuần", tenTuan(tuanCode)],
    ["Khoảng ngày", khoangNgayTuan(tuanCode)],
    ["", ""],
    ["ĐIỂM LỚP", ""],
    ["Điểm nhập tay", lopData.diem],
    ["Trừ tự động (điểm danh)", tuDong.diemTru],
    ["Tổng điểm lớp", diemLop],
    ["Xếp loại", lopXL.ten],
    ["", ""],
    ["TỔNG SỐ HỌC SINH", students.length],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(tongKet);
  XLSX.utils.book_append_sheet(wb, ws2, "TongKetLop");

  const tenFile = `ThiDua_${maLop}_${tuanCode.replace("-", "_")}.xlsx`;
  XLSX.writeFile(wb, tenFile);
}

/**
 * Xuất Excel điểm thi đua 1 tháng (nhiều tuần)
 */
export async function xuatExcelThang(maLop, tuanCode, students) {
  // Từ tuần hiện tại → xác định các tuần trong cùng tháng
  const { layKhoangNgayTuanHoc } = await import("./diemThiDua");
  const { start } = layKhoangNgayTuanHoc(tuanCode);

  if (!start) {
    alert("Không xác định được tuần");
    return;
  }

  const thang = start.getMonth();
  const nam = start.getFullYear();

  // Tìm tất cả các tuần có ngày bắt đầu trong cùng tháng/năm
  const dsTuan = [];
  for (let i = 1; i <= 53; i++) {
    const tuanCode2 = `${nam}-T${String(i).padStart(2, "0")}`;
    const { start: s2 } = layKhoangNgayTuanHoc(tuanCode2);
    if (!s2) continue;
    if (s2.getMonth() === thang && s2.getFullYear() === nam) {
      dsTuan.push(tuanCode2);
    }
  }

  // ============ SHEET 1: Tổng hợp theo tuần ============
  const rows1 = [];

  for (const tc of dsTuan) {
    const duLieu = await getThiDuaTuan(maLop, tc);
    const tuDong = await tinhDiemTruTuDong(tc, students, maLop);

    const lopData = duLieu.lop || { diem: DIEM_BAN_DAU };
    const diemLop = lopData.diem + tuDong.diemTru;
    const xl = xepLoai(diemLop);

    rows1.push({
      Tuần: tenTuan(tc),
      "Khoảng ngày": khoangNgayTuan(tc),
      "Điểm nhập tay": lopData.diem,
      "Trừ tự động": tuDong.diemTru,
      "Tổng điểm": diemLop,
      "Xếp loại": xl.ten,
    });
  }

  // ============ SHEET 2: Chi tiết từng HS theo tháng ============
  // Tổng hợp điểm cả tháng cho từng HS
  const tongThang = {};
  students.forEach((s) => {
    tongThang[s.id] = {
      id: s.id,
      name: s.name,
      tongDiem: 0,
      tongVang: 0,
      tongCoPhep: 0,
      tongTre: 0,
      soTuan: 0,
    };
  });

  for (const tc of dsTuan) {
    const duLieu = await getThiDuaTuan(maLop, tc);
    const tuDong = await tinhDiemTruTuDong(tc, students, maLop);

    students.forEach((s) => {
      const caNhan = duLieu.caNhan?.[s.id] || { diem: DIEM_BAN_DAU };
      const chiTiet = tuDong.chiTiet?.[s.id] || {
        vang: 0,
        coPhep: 0,
        diTre: 0,
        diemTru: 0,
      };

      const diemTuan = caNhan.diem + chiTiet.diemTru;
      tongThang[s.id].tongDiem += diemTuan;
      tongThang[s.id].tongVang += chiTiet.vang;
      tongThang[s.id].tongCoPhep += chiTiet.coPhep;
      tongThang[s.id].tongTre += chiTiet.diTre;
      tongThang[s.id].soTuan++;
    });
  }

  const rows2 = students.map((s, i) => {
    const t = tongThang[s.id];
    const diemTB = t.soTuan > 0 ? Math.round(t.tongDiem / t.soTuan) : 100;
    const xl = xepLoai(diemTB);

    return {
      STT: i + 1,
      "Mã HS": s.id,
      "Họ tên": s.name,
      "Tổng điểm (tất cả tuần)": t.tongDiem,
      "Số tuần": t.soTuan,
      "Điểm TB/tuần": diemTB,
      "Tổng vắng (buổi)": t.tongVang,
      "Tổng có phép (buổi)": t.tongCoPhep,
      "Tổng đi trễ (tiết)": t.tongTre,
      "Xếp loại TB": xl.ten,
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(rows1);
  const ws2 = XLSX.utils.json_to_sheet(rows2);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "TongHopTuan");
  XLSX.utils.book_append_sheet(wb, ws2, "ChiTietHS");

  const tenThang = `${String(thang + 1).padStart(2, "0")}_${nam}`;
  const tenFile = `ThiDua_${maLop}_Thang${tenThang}.xlsx`;
  XLSX.writeFile(wb, tenFile);
}