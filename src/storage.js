import { db } from "./firebase";
import {
  collection,
  doc,
  deleteField,
  FieldPath,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  tinhTrangThai,
  layTietDaKetThuc,
  layNgayHomNay,
  layGioPhutHienTai,
  layThuHienTai,
  TKB_SANG,
  TKB_CHIEU,
} from "./thoiKhoaBieu";

const ATTENDANCE_CACHE_TTL_MS = 5_000;
const attendanceCache = new Map();
const attendanceRequests = new Map();

function cloneAttendance(data) {
  return JSON.parse(JSON.stringify(data));
}

function invalidateAttendanceMonth(month) {
  attendanceCache.delete(month);
  attendanceRequests.delete(month);
}

function invalidateAllAttendance() {
  attendanceCache.clear();
  attendanceRequests.clear();
}

function validateMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Tháng không hợp lệ: ${month}`);
  }
}

function monthOfDate(date) {
  const month = String(date).slice(0, 7);
  validateMonth(month);
  return month;
}

function attendanceRef(month) {
  validateMonth(month);
  return doc(db, "diemdanh", `diemdanh_thang_${month}`);
}

function makeNestedAttendancePatch(updates) {
  const data = {};
  for (const { segments, value, remove } of updates) {
    if (remove) continue;
    let node = data;
    for (const segment of segments.slice(0, -1)) {
      if (!Object.hasOwn(node, segment)) {
        Object.defineProperty(node, segment, {
          value: {},
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      node = node[segment];
    }
    Object.defineProperty(node, segments.at(-1), {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return data;
}

async function updateAttendanceFields(month, updates) {
  if (updates.length === 0) return;

  const ref = attendanceRef(month);
  const fieldPaths = updates.map(({ segments }) => new FieldPath("data", ...segments));
  const updateArgs = updates.flatMap((update, index) => [
    fieldPaths[index],
    update.remove ? deleteField() : update.value,
  ]);

  try {
    await updateDoc(ref, ...updateArgs);
  } catch (error) {
    if (error.code !== "not-found") throw error;

    const createUpdates = updates.filter((update) => !update.remove);
    if (createUpdates.length === 0) {
      invalidateAttendanceMonth(month);
      return;
    }

    await setDoc(
      ref,
      { data: makeNestedAttendancePatch(createUpdates) },
      { mergeFields: createUpdates.map(({ segments }) => new FieldPath("data", ...segments)) }
    );
  }

  invalidateAttendanceMonth(month);
}

export async function getAttendance() {
  return getAttendanceByMonth(layNgayHomNay().slice(0, 7));
}

export async function getAttendanceByMonth(month) {
  const ref = attendanceRef(month);
  const cached = attendanceCache.get(month);
  if (cached && cached.expiresAt > Date.now()) {
    return cloneAttendance(cached.data);
  }
  if (cached) attendanceCache.delete(month);

  let request = attendanceRequests.get(month);
  if (!request) {
    request = getDoc(ref).then((snap) =>
      snap.exists() ? snap.data().data || {} : {}
    );
    attendanceRequests.set(month, request);
  }

  try {
    const data = await request;
    if (attendanceRequests.get(month) === request) {
      attendanceCache.set(month, {
        data: cloneAttendance(data),
        expiresAt: Date.now() + ATTENDANCE_CACHE_TTL_MS,
      });
      attendanceRequests.delete(month);
    }
    return cloneAttendance(data);
  } catch (error) {
    if (attendanceRequests.get(month) === request) {
      attendanceRequests.delete(month);
    }
    throw error;
  }
}

export async function getAttendanceBetween(startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      startDate > endDate) {
    throw new Error("Khoảng ngày điểm danh không hợp lệ");
  }

  const startMonth = monthOfDate(startDate);
  const endMonth = monthOfDate(endDate);
  const months = [];
  let [year, month] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);

  while (year < endYear || (year === endYear && month <= endMonthNumber)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month === 13) {
      year++;
      month = 1;
    }
  }

  const monthData = await Promise.all(months.map(getAttendanceByMonth));
  const attendance = Object.assign({}, ...monthData);
  return Object.entries(attendance).reduce((result, [date, data]) => {
    if (date >= startDate && date <= endDate) result[date] = data;
    return result;
  }, {});
}

export async function saveAttendance(data, month = layNgayHomNay().slice(0, 7)) {
  await setDoc(attendanceRef(month), { data });
  attendanceRequests.delete(month);
  attendanceCache.set(month, {
    data: cloneAttendance(data),
    expiresAt: Date.now() + ATTENDANCE_CACHE_TTL_MS,
  });
}

export async function removeStudentsFromAttendance(studentIds) {
  const studentIdSet = new Set(studentIds);
  const snapshots = await getDocs(collection(db, "diemdanh"));

  for (const snapshot of snapshots.docs) {
    const match = snapshot.id.match(/^diemdanh_thang_(\d{4}-\d{2})$/);
    if (!match) continue;

    const data = snapshot.data().data || {};
    const updates = [];
    for (const [date, day] of Object.entries(data)) {
      for (const studentId of studentIdSet) {
        if (Object.hasOwn(day, studentId)) {
          updates.push({ segments: [date, studentId], remove: true });
        }
      }
    }

    await updateAttendanceFields(match[1], updates);
  }
}

export async function clearAllAttendance() {
  const snapshots = await getDocs(collection(db, "diemdanh"));
  const monthlyDocs = snapshots.docs.filter(
    (snapshot) =>
      /^diemdanh_thang_\d{4}-(0[1-9]|1[0-2])$/.test(snapshot.id)
  );
  invalidateAllAttendance();
  await Promise.all(
    monthlyDocs.map((snapshot) =>
      setDoc(attendanceRef(snapshot.id.slice("diemdanh_thang_".length)), {
        data: {},
      })
    )
  );
  await setDoc(doc(db, "diemdanh", "all"), { data: {} });
  invalidateAllAttendance();
}

export async function markAttendance(
  studentId,
  buoi,
  tiet,
  attendanceRecord,
  date = layNgayHomNay()
) {
  const month = monthOfDate(date);
  const keyTiet = `tiet${tiet}`;
  const gioQuet = attendanceRecord?.gioVao || layGioPhutHienTai();
  const kq = tinhTrangThai(buoi, tiet, gioQuet);
  const record = attendanceRecord || {
    trangThai: kq.trangThai,
    gioVao: gioQuet,
    phutTre: kq.phutTre,
    diemTru: kq.diemTru,
  };

  const ref = attendanceRef(month);
  const fieldPath = new FieldPath("data", date, studentId, buoi, keyTiet);
  const inserted = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists() ? snapshot.data().data || {} : {};
    if (data[date]?.[studentId]?.[buoi]?.[keyTiet]) return false;

    if (snapshot.exists()) {
      transaction.update(ref, fieldPath, record);
    } else {
      transaction.set(
        ref,
        {
          data: makeNestedAttendancePatch([
            { segments: [date, studentId, buoi, keyTiet], value: record },
          ]),
        },
        { merge: true }
      );
    }
    return true;
  });
  invalidateAttendanceMonth(month);

  if (!inserted) {
    return {
      ok: false,
      message: `Học sinh này đã điểm danh tiết ${tiet} rồi!`,
    };
  }

  return {
    ok: true,
    ...record,
  };
}

export async function syncQueuedAttendance(payload) {
  const { studentId, date, buoi, tiet, record } = payload;
  if (!studentId || !date || !buoi || !tiet || !record) {
    throw new Error("Dữ liệu điểm danh ngoại tuyến không hợp lệ");
  }

  const month = monthOfDate(date);
  const keyTiet = `tiet${tiet}`;
  const ref = attendanceRef(month);
  const fieldPath = new FieldPath("data", date, studentId, buoi, keyTiet);
  const inserted = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists() ? snapshot.data().data || {} : {};
    if (data[date]?.[studentId]?.[buoi]?.[keyTiet]) return false;

    if (snapshot.exists()) {
      transaction.update(ref, fieldPath, record);
    } else {
      transaction.set(
        ref,
        {
          data: makeNestedAttendancePatch([
            { segments: [date, studentId, buoi, keyTiet], value: record },
          ]),
        },
        { merge: true }
      );
    }
    return true;
  });
  if (inserted) invalidateAttendanceMonth(month);
}

export async function restoreAttendanceSession(studentId, date, buoi, records) {
  const month = monthOfDate(date);
  const data = await getAttendanceByMonth(month);
  const currentRecords = data[date]?.[studentId]?.[buoi] || {};
  const restoredRecords = records || {};
  const updates = [
    ...Object.keys(currentRecords)
      .filter((keyTiet) => !Object.hasOwn(restoredRecords, keyTiet))
      .map((keyTiet) => ({
        segments: [date, studentId, buoi, keyTiet],
        remove: true,
      })),
    ...Object.entries(restoredRecords).map(([keyTiet, record]) => ({
      segments: [date, studentId, buoi, keyTiet],
      value: record,
    })),
  ];
  await updateAttendanceFields(month, updates);
}

export async function xoaDiemDanh(studentId, buoi, tiet) {
  const today = layNgayHomNay();
  const month = monthOfDate(today);
  const keyTiet = `tiet${tiet}`;
  await updateAttendanceFields(month, [
    { segments: [today, studentId, buoi, keyTiet], remove: true },
  ]);
}

export async function xoaTatCaCuaHocSinh(studentId, maLop) {
  if (!maLop) throw new Error("Thiếu mã lớp");
  const today = layNgayHomNay();
  const month = monthOfDate(today);
  await updateAttendanceFields(month, [
    { segments: [today, studentId], remove: true },
  ]);

  const { clearFaces } = await import("./faceStorage");
  await clearFaces(maLop, studentId);
}

export async function getAttendanceByDate(date) {
  const all = await getAttendanceByMonth(monthOfDate(date));
  return all[date] || {};
}

export async function getDanhSachNgay() {
  const all = await getAttendance();
  return Object.keys(all).sort().reverse();
}

export async function updateAttendance(studentId, date, buoi, tiet, trangThai, gioVao) {
  const month = monthOfDate(date);
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

  await updateAttendanceFields(month, [
    {
      segments: [date, studentId, buoi, keyTiet],
      value: { trangThai, gioVao: gioVao || null, phutTre, diemTru },
    },
  ]);
}

export async function xacNhanKhongVang(studentId, date, buoi, tiet) {
  const month = monthOfDate(date);
  const keyTiet = `tiet${tiet}`;
  const ref = attendanceRef(month);
  const fieldPath = new FieldPath("data", date, studentId, buoi, keyTiet);
  const confirmed = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists()
      ? snapshot.data().data?.[date]?.[studentId]?.[buoi]?.[keyTiet]
      : null;
    if (!current || current.trangThai !== "Vắng") return false;

    transaction.update(ref, fieldPath, {
      trangThai: "Có phép",
      gioVao: null,
      phutTre: 0,
      diemTru: -5,
      ghiChu: "GV xác nhận vắng có phép",
    });
    return true;
  });

  if (!confirmed) {
    return { ok: false, message: "Chỉ xác nhận được khi đang Vắng" };
  }
  invalidateAttendanceMonth(month);
  return { ok: true };
}

export async function xoaDiemDanhTheoNgay(studentId, date, buoi, tiet) {
  const month = monthOfDate(date);
  const segments = buoi && tiet
    ? [date, studentId, buoi, `tiet${tiet}`]
    : buoi
      ? [date, studentId, buoi]
      : [date, studentId];
  await updateAttendanceFields(month, [{ segments, remove: true }]);
}

export async function tuDongChuyenVang() {
  const today = layNgayHomNay();

  let tkbLop = null;
  let students = [];
  try {
    const maLop = localStorage.getItem("lop_dang_chon");
    if (maLop) {
      const [{ getTKB }, { getDSLop }] = await Promise.all([
        import("./tkbStorage"),
        import("./lopStorage"),
      ]);
      [tkbLop, students] = await Promise.all([
        getTKB(maLop),
        getDSLop(maLop),
      ]);
      students = students || [];
    }
  } catch (e) {
    console.warn("Không load được TKB:", e);
  }

  if (!tkbLop) {
    console.log("Chưa có TKB → bỏ qua tuDongChuyenVang");
    return;
  }

  function tietCoHoc(buoi, tiet) {
    const thu = layThuHienTai();
    if (!thu) return false;
    const tkbThu = tkbLop[thu];
    if (!tkbThu) return false;
    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    const index = buoi === "sang" ? tiet - 1 : tiet - 2;
    return mangTiet && mangTiet[index] === true;
  }

  const tietSangDaHet = layTietDaKetThuc("sang");
  const tietChieuDaHet = layTietDaKetThuc("chieu");

  const vangCanThem = [];
  students.forEach((hs) => {
    tietSangDaHet.forEach((t) => {
      if (!tietCoHoc("sang", t.tiet)) return;
      vangCanThem.push({
        segments: [today, hs.id, "sang", `tiet${t.tiet}`],
        value: { trangThai: "Vắng", gioVao: null, phutTre: null, diemTru: -10 },
      });
    });

    tietChieuDaHet.forEach((t) => {
      if (!tietCoHoc("chieu", t.tiet)) return;
      vangCanThem.push({
        segments: [today, hs.id, "chieu", `tiet${t.tiet}`],
        value: { trangThai: "Vắng", gioVao: null, phutTre: null, diemTru: -10 },
      });
    });
  });

  if (vangCanThem.length === 0) return;

  const month = monthOfDate(today);
  const ref = attendanceRef(month);
  const inserted = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists() ? snapshot.data().data || {} : {};
    const missing = vangCanThem.filter(({ segments }) => {
      const [date, studentId, buoi, keyTiet] = segments;
      return !data[date]?.[studentId]?.[buoi]?.[keyTiet];
    });
    if (missing.length === 0) return false;

    if (snapshot.exists()) {
      const updateArgs = missing.flatMap(({ segments, value }) => [
        new FieldPath("data", ...segments),
        value,
      ]);
      transaction.update(ref, ...updateArgs);
    } else {
      transaction.set(
        ref,
        { data: makeNestedAttendancePatch(missing) },
        { merge: true }
      );
    }
    return true;
  });
  if (inserted) invalidateAttendanceMonth(month);
}

export async function tinhThongKeThang(thang, students) {
  const all = await getAttendanceByMonth(thang);
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