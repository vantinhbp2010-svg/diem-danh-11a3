import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { students } from "./data";
import { tinhTrangThai, tietDaHet, layTietDaKetThuc, TKB_SANG, TKB_CHIEU } from "./thoiKhoaBieu";

/**
 * Lấy ngày hôm nay theo GIỜ VIỆT NAM (UTC+7)
 */
function layNgayHomNay() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Lấy buổi hiện tại theo giờ
 */
function layBuoiHienTai() {
  const gio = new Date().getHours();
  return gio >= 12 ? "chieu" : "sang";
}

/**
 * Lấy toàn bộ dữ liệu điểm danh
 */
export async function getAttendance() {
  const ref = doc(db, "diemdanh", "all");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data || {} : {};
}

export async function saveAttendance(data) {
  const ref = doc(db, "diemdanh", "all");
  await setDoc(ref, { data });
}

/**
 * ============ MIỄN TRỪ AUTO VẮNG ============
 */
export async function getMienTru() {
  const ref = doc(db, "diemdanh", "mienTru");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveMienTru(data) {
  const ref = doc(db, "diemdanh", "mienTru");
  await setDoc(ref, { data });
}

export async function danhDauMienTru(maLop, ngay, buoi) {
  const all = await getMienTru();
  if (!all[maLop]) all[maLop] = {};
  if (!all[maLop][ngay]) all[maLop][ngay] = [];
  if (!all[maLop][ngay].includes(buoi)) {
    all[maLop][ngay].push(buoi);
  }
  await saveMienTru(all);
  return all[maLop];
}

export async function kiemTraMienTru(maLop, ngay, buoi) {
  const all = await getMienTru();
  if (!all[maLop] || !all[maLop][ngay]) return false;
  return all[maLop][ngay].includes(buoi);
}

/**
 * ============ KHỞI TẠO DS HS VÀO FIREBASE ============
 * Lưu tất cả HS của lớp vào diemdanh/all cho ngày hôm nay + buổi hiện tại
 * Trạng thái: "Chưa chấm" (0đ)
 * Và đánh dấu miễn trừ auto vắng cho buổi đó
 */
export async function khoiTaoDSHocSinh(students, maLop) {

  if (!students || students.length === 0) {
    return { ok: false, message: "Không có HS" };
  }

  const today = layNgayHomNay();
  const buoi = layBuoiHienTai();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  let soLuu = 0;

  students.forEach((hs) => {
    if (!data[today][hs.id]) data[today][hs.id] = {};
    if (!data[today][hs.id][buoi]) data[today][hs.id][buoi] = {};

    // Chỉ đánh dấu khởi tạo nếu buổi đó chưa có gì
    if (Object.keys(data[today][hs.id][buoi]).length === 0) {
      data[today][hs.id][buoi].__khoiTao__ = {
        trangThai: "Chưa chấm",
        gioVao: null,
        phutTre: 0,
        diemTru: 0,
      };
      soLuu++;
    }
  });

  await saveAttendance(data);

  // Đánh dấu miễn trừ auto vắng cho buổi này
  if (maLop) {
    await danhDauMienTru(maLop, today, buoi);
  }

  return { ok: true, soLuu, tongSo: students.length, buoi, ngay: today };
}
/**
 * TỰ ĐỘNG khởi tạo HS vào Firebase cho hôm nay
 * Chạy mỗi khi mở app → HS nào chưa có trong ngày → tự thêm
 * KHÔNG đánh dấu miễn trừ (vì đây là ngày mới, không phải ngày import)
 */
export async function tuDongKhoiTaoHomNay(students, maLop) {
  if (!students || students.length === 0) return { ok: false };
  if (!maLop) return { ok: false };

  const today = layNgayHomNay();
  const buoi = layBuoiHienTai();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  let soLuu = 0;

  students.forEach((hs) => {
    if (!data[today][hs.id]) data[today][hs.id] = {};
    if (!data[today][hs.id][buoi]) data[today][hs.id][buoi] = {};

    // Chỉ khởi tạo nếu buổi đó CHƯA có gì
    if (Object.keys(data[today][hs.id][buoi]).length === 0) {
      data[today][hs.id][buoi].__khoiTao__ = {
        trangThai: "Chưa chấm",
        gioVao: null,
        phutTre: 0,
        diemTru: 0,
      };
      soLuu++;
    }
  });

  if (soLuu > 0) {
    await saveAttendance(data);
    console.log(`🤖 Auto khởi tạo ${soLuu}/${students.length} HS cho ${today} buổi ${buoi}`);
  }

  return { ok: true, soLuu, ngay: today, buoi };
}

/**
 * Điểm danh 1 học sinh cho 1 tiết cụ thể
 */
export async function markAttendance(studentId, buoi, tiet) {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};
  if (!data[today][studentId]) data[today][studentId] = {};
  if (!data[today][studentId][buoi]) data[today][studentId][buoi] = {};

  const keyTiet = `tiet${tiet}`;

  if (data[today][studentId][buoi][keyTiet]) {
    return {
      ok: false,
      message: `Học sinh này đã điểm danh tiết ${tiet} buổi ${
        buoi === "sang" ? "sáng" : "chiều"
      } rồi!`,
    };
  }

  const now = new Date();
  const gioQuet = now.toTimeString().slice(0, 5);
  const kq = tinhTrangThai(buoi, tiet, gioQuet);

  data[today][studentId][buoi][keyTiet] = {
    trangThai: kq.trangThai,
    gioVao: gioQuet,
    phutTre: kq.phutTre,
    diemTru: kq.diemTru,
  };

  await saveAttendance(data);

  return {
    ok: true,
    gioVao: gioQuet,
    trangThai: kq.trangThai,
    phutTre: kq.phutTre,
    diemTru: kq.diemTru,
  };
}

/**
 * Lưu TẤT CẢ HS của lớp vào Firebase cho 1 tiết (thủ công)
 */
export async function luuTatCaHocSinh(students, buoi, tiet) {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  const now = new Date();
  const gioVao = now.toTimeString().slice(0, 5);
  const keyTiet = `tiet${tiet}`;

  let soLuu = 0;

  students.forEach((hs) => {
    if (!data[today][hs.id]) data[today][hs.id] = {};
    if (!data[today][hs.id][buoi]) data[today][hs.id][buoi] = {};

    if (!data[today][hs.id][buoi][keyTiet]) {
      data[today][hs.id][buoi][keyTiet] = {
        trangThai: "Đúng giờ",
        gioVao: gioVao,
        phutTre: 0,
        diemTru: 0,
      };
      soLuu++;
    }
  });

  await saveAttendance(data);
  return { ok: true, soLuu, tongSo: students.length };
}

export async function xoaDiemDanh(studentId, buoi, tiet) {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (!data[today] || !data[today][studentId] || !data[today][studentId][buoi]) {
    return;
  }

  const keyTiet = `tiet${tiet}`;
  delete data[today][studentId][buoi][keyTiet];

  if (Object.keys(data[today][studentId][buoi]).length === 0) {
    delete data[today][studentId][buoi];
  }

  if (Object.keys(data[today][studentId]).length === 0) {
    delete data[today][studentId];
  }

  await saveAttendance(data);
}

export async function xoaTatCaCuaHocSinh(studentId) {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (data[today] && data[today][studentId]) {
    delete data[today][studentId];
  }
  await saveAttendance(data);

  try {
    const { clearFaces } = await import("./faceStorage");
    await clearFaces(studentId);
  } catch (e) {
    console.warn("Lỗi xóa mặt:", e);
  }
}

export async function getAttendanceByDate(date) {
  const all = await getAttendance();
  return all[date] || {};
}

export async function getDanhSachNgay() {
  const all = await getAttendance();
  return Object.keys(all).sort().reverse();
}

export async function updateAttendance(studentId, date, buoi, tiet, trangThai, gioVao) {
  const data = await getAttendance();
  if (!data[date]) data[date] = {};
  if (!data[date][studentId]) data[date][studentId] = {};
  if (!data[date][studentId][buoi]) data[date][studentId][buoi] = {};

  const keyTiet = `tiet${tiet}`;
  let diemTru = 0;
  let phutTre = 0;

  if (trangThai === "Đi trễ") {
    diemTru = -3;
    const dsTiet = buoi === "sang" ? TKB_SANG : TKB_CHIEU;
    const tietInfo = dsTiet.find((t) => t.tiet === tiet);
    if (tietInfo && gioVao) {
      const [h1, m1] = tietInfo.vao.split(":").map(Number);
      const [h2, m2] = gioVao.split(":").map(Number);
      phutTre = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (phutTre < 0) phutTre = 0;
    }
  } else if (trangThai === "Vắng") {
    diemTru = -10;
  } else if (trangThai === "Có phép") {
    diemTru = -5;
  }

  data[date][studentId][buoi][keyTiet] = {
    trangThai,
    gioVao: gioVao || null,
    phutTre,
    diemTru,
  };

  await saveAttendance(data);
}

export async function xacNhanKhongVang(studentId, date, buoi, tiet) {
  const data = await getAttendance();
  if (!data[date]) data[date] = {};
  if (!data[date][studentId]) data[date][studentId] = {};
  if (!data[date][studentId][buoi]) data[date][studentId][buoi] = {};

  const keyTiet = `tiet${tiet}`;
  const cu = data[date][studentId][buoi][keyTiet];

  if (!cu || cu.trangThai !== "Vắng") {
    return { ok: false, message: "Chỉ xác nhận được khi đang Vắng" };
  }

  data[date][studentId][buoi][keyTiet] = {
    trangThai: "Có phép",
    gioVao: null,
    phutTre: 0,
    diemTru: -5,
    ghiChu: "GV xác nhận vắng có phép",
  };

  await saveAttendance(data);
  return { ok: true };
}

export async function xoaDiemDanhTheoNgay(studentId, date, buoi, tiet) {
  const data = await getAttendance();
  if (!data[date] || !data[date][studentId]) return;

  if (buoi && tiet) {
    const keyTiet = `tiet${tiet}`;
    if (data[date][studentId][buoi]) {
      delete data[date][studentId][buoi][keyTiet];

      if (Object.keys(data[date][studentId][buoi]).length === 0) {
        delete data[date][studentId][buoi];
      }
    }
  } else if (buoi) {
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
 * Tự động chuyển VẮNG — CÓ CHECK MIỄN TRỪ
 */
export async function tuDongChuyenVang() {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  let coThayDoi = false;

  let tkbLop = null;
  let maLopHienTai = null;
  try {
    maLopHienTai = localStorage.getItem("lop_dang_chon");
    if (maLopHienTai) {
      const { getTKB } = await import("./tkbStorage");
      tkbLop = await getTKB(maLopHienTai);
    }
  } catch (e) {
    console.warn("Không load được TKB:", e);
  }

  if (!tkbLop) {
    console.log("Chưa có TKB → bỏ qua tuDongChuyenVang");
    return;
  }

  let mienTruCuaLop = {};
  try {
    const allMienTru = await getMienTru();
    mienTruCuaLop = allMienTru[maLopHienTai] || {};
  } catch (e) {
    console.warn("Không load được miễn trừ:", e);
  }

  function buoiMienTru(buoi) {
    if (!mienTruCuaLop[today]) return false;
    return mienTruCuaLop[today].includes(buoi);
  }

  function tietCoHoc(buoi, tiet) {
    const day = new Date().getDay();
    if (day === 0) return false;
    const thu = `thu${day + 1}`;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoi === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  const tietSangDaHet = layTietDaKetThuc("sang");
  const tietChieuDaHet = layTietDaKetThuc("chieu");

  students.forEach((hs) => {
    if (!data[today][hs.id]) data[today][hs.id] = {};

    // Bỏ qua nếu buổi sáng được miễn trừ
    if (!buoiMienTru("sang")) {
      tietSangDaHet.forEach((t) => {
        if (!tietCoHoc("sang", t.tiet)) return;

        const keyTiet = `tiet${t.tiet}`;
        if (!data[today][hs.id].sang) data[today][hs.id].sang = {};
        if (!data[today][hs.id].sang[keyTiet]) {
          data[today][hs.id].sang[keyTiet] = {
            trangThai: "Vắng",
            gioVao: null,
            phutTre: null,
            diemTru: -10,
          };
          coThayDoi = true;
        }
      });
    }

    // Bỏ qua nếu buổi chiều được miễn trừ
    if (!buoiMienTru("chieu")) {
      tietChieuDaHet.forEach((t) => {
        if (!tietCoHoc("chieu", t.tiet)) return;

        const keyTiet = `tiet${t.tiet}`;
        if (!data[today][hs.id].chieu) data[today][hs.id].chieu = {};
        if (!data[today][hs.id].chieu[keyTiet]) {
          data[today][hs.id].chieu[keyTiet] = {
            trangThai: "Vắng",
            gioVao: null,
            phutTre: null,
            diemTru: -10,
          };
          coThayDoi = true;
        }
      });
    }
  });

  if (coThayDoi) {
    await saveAttendance(data);
  }
}

/**
 * Tính điểm thi đua tuần
 */
export async function tinhDiemTuan(tuanCode) {
  const all = await getAttendance();
  const dsNgay = Object.keys(all).filter((ngay) => {
    const d = new Date(ngay);
    const kg = new Date("2026-09-05");
    const soNgay = Math.floor((d - kg) / (1000 * 60 * 60 * 24));
    const tuan = Math.floor(soNgay / 7) + 1;
    const nam = d.getFullYear();
    return `${nam}-W${String(tuan).padStart(2, "0")}` === tuanCode;
  });

  const ketQua = {};

  students.forEach((hs) => {
    ketQua[hs.id] = {
      id: hs.id,
      name: hs.name,
      tongDiem: 100,
      soLanTre: 0,
      soLanVang: 0,
      chiTiet: [],
    };
  });

  dsNgay.forEach((ngay) => {
    const dataNgay = all[ngay] || {};
    students.forEach((hs) => {
      const hsData = dataNgay[hs.id];
      if (!hsData) return;

      ["sang", "chieu"].forEach((buoi) => {
        if (!hsData[buoi]) return;
        Object.keys(hsData[buoi]).forEach((keyTiet) => {
          const t = hsData[buoi][keyTiet];
          if (t.diemTru < 0) {
            ketQua[hs.id].tongDiem += t.diemTru;
            if (t.trangThai === "Đi trễ") ketQua[hs.id].soLanTre++;
            if (t.trangThai === "Vắng") ketQua[hs.id].soLanVang++;
            ketQua[hs.id].chiTiet.push({
              ngay,
              buoi,
              tiet: keyTiet,
              ...t,
            });
          }
        });
      });
    });
  });

  return Object.values(ketQua);
}

export async function tinhDiemLopTuan(tuanCode) {
  const dsHS = await tinhDiemTuan(tuanCode);
  let diemLop = 100;
  let tongTre = 0;
  let tongVang = 0;

  dsHS.forEach((hs) => {
    tongTre += hs.soLanTre;
    tongVang += hs.soLanVang;
    if (hs.tongDiem < 100) {
      diemLop += (hs.tongDiem - 100);
    }
  });

  return {
    diemLop,
    tongTre,
    tongVang,
  };
}

export async function tinhThongKeThang(thang, students) {
  const all = await getAttendance();
  const dsNgay = Object.keys(all).filter((ngay) => ngay.startsWith(thang));

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

  dsNgay.forEach((ngay) => {
    const dataNgay = all[ngay] || {};
    students.forEach((s) => {
      const hsData = dataNgay[s.id];
      if (!hsData) return;

      ["sang", "chieu"].forEach((buoi) => {
        if (!hsData[buoi]) return;

        Object.keys(hsData[buoi]).forEach((keyTiet) => {
          const t = hsData[buoi][keyTiet];
          thongKe[s.id].tongBuoi++;

          if (t.trangThai === "Đúng giờ") {
            thongKe[s.id].dungGio++;
          } else if (t.trangThai === "Đi trễ") {
            thongKe[s.id].diTre++;
          } else if (t.trangThai === "Vắng") {
            thongKe[s.id].vang++;
          }
        });
      });
    });
  });

  return {
    thang,
    soNgay: dsNgay.length,
    dsNgay,
    thongKe: Object.values(thongKe),
  };
}