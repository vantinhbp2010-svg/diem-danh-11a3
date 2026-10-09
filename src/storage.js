import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { students } from "./data";
import { tinhTrangThai, tietDaHet, layTietDaKetThuc, TKB_SANG, TKB_CHIEU } from "./thoiKhoaBieu";

function layNgayHomNay() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function getAttendance() {
  const ref = doc(db, "diemdanh", "all");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().data || {} : {};
}

export async function saveAttendance(data) {
  const ref = doc(db, "diemdanh", "all");
  await setDoc(ref, { data });
}

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

export async function tuDongChuyenVang() {
  const today = layNgayHomNay();
  const data = await getAttendance();

  if (!data[today]) data[today] = {};

  let coThayDoi = false;

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

  if (!tkbLop) {
    console.log("Chưa có TKB → bỏ qua tuDongChuyenVang");
    return;
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