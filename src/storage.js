import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { students } from "./data";
import { tinhTrangThai, tietDaHet, layTietDaKetThuc, TKB_SANG, TKB_CHIEU } from "./thoiKhoaBieu";

/**
 * Lấy toàn bộ dữ liệu điểm danh
 * Cấu trúc: { "2026-10-08": { "HS001": { "sang": { "tiet1": {...} }, "chieu": {...} } } }
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
 * Điểm danh 1 học sinh cho 1 tiết cụ thể
 */
export async function markAttendance(studentId, buoi, tiet) {
  const today = new Date().toISOString().slice(0, 10);
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
 * Xóa điểm danh 1 học sinh cho 1 tiết
 */
export async function xoaDiemDanh(studentId, buoi, tiet) {
  const today = new Date().toISOString().slice(0, 10);
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

/**
 * Xóa TẤT CẢ dữ liệu của 1 học sinh (điểm danh + khuôn mặt)
 */
export async function xoaTatCaCuaHocSinh(studentId) {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getAttendance();

  if (data[today] && data[today][studentId]) {
    delete data[today][studentId];
  }
  await saveAttendance(data);

  // Xóa khuôn mặt
  try {
    const { clearFaces } = await import("./faceStorage");
    await clearFaces(studentId);
  } catch (e) {
    console.warn("Lỗi xóa mặt:", e);
  }
}

/**
 * Lấy điểm danh của 1 ngày
 */
export async function getAttendanceByDate(date) {
  const all = await getAttendance();
  return all[date] || {};
}

/**
 * Lấy danh sách ngày có dữ liệu
 */
export async function getDanhSachNgay() {
  const all = await getAttendance();
  return Object.keys(all).sort().reverse();
}

/**
 * Sửa điểm danh thủ công
 */
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
  }

  data[date][studentId][buoi][keyTiet] = {
    trangThai,
    gioVao: gioVao || null,
    phutTre,
    diemTru,
  };

  await saveAttendance(data);
}

/**
 * Xóa điểm danh 1 học sinh trong 1 ngày
 */
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
 * Tự động chuyển VẮNG cho những tiết đã hết mà chưa chấm
 * CHỈ áp dụng cho tiết CÓ HỌC theo TKB
 */
export async function tuDongChuyenVang() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  let coThayDoi = false;

  // Lấy TKB của lớp hiện tại
  let tkbLop = null;
  try {
    const maLop = localStorage.getItem("lop_dang_chon");
    if (maLop) {
      const { getTKB } = await import("./tkbStorage");
      tkbLop = await getTKB(maLop);
    }
  } catch (e) {
    console.warn("Không load được TKB:", e);
  }

  // Nếu chưa có TKB → KHÔNG chuyển vắng
  if (!tkbLop) {
    console.log("Chưa có TKB → bỏ qua tuDongChuyenVang");
    return;
  }

  // Hàm kiểm tra tiết có học không theo TKB
  function tietCoHoc(buoi, tiet) {
    const day = new Date().getDay();
    if (day === 0) return false; // Chủ nhật
    const thu = `thu${day + 1}`;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoi === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  // Lấy các tiết đã kết thúc
  const tietSangDaHet = layTietDaKetThuc("sang");
  const tietChieuDaHet = layTietDaKetThuc("chieu");

  students.forEach((hs) => {
    if (!data[today][hs.id]) data[today][hs.id] = {};

    // Xử lý buổi sáng — CHỈ tiết có học
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

    // Xử lý buổi chiều — CHỈ tiết có học
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

/**
 * Tính điểm lớp theo tuần
 */
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

/**
 * Tính thống kê cho tất cả học sinh trong 1 tháng
 */
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