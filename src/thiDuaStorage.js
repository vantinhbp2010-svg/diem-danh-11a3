import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DIEM_BAN_DAU } from "./diemThiDua";

const DOC_REF = doc(db, "diemdanh", "thiDua");

/**
 * Lấy toàn bộ dữ liệu thi đua
 */
export async function getThiDuaAll() {
  const snap = await getDoc(DOC_REF);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveThiDuaAll(data) {
  await setDoc(DOC_REF, { data });
}

/**
 * Lấy dữ liệu thi đua 1 tuần của 1 lớp
 * @param maLop "11A3"
 * @param tuanISO "2026-W05"
 */
export async function getThiDuaTuan(maLop, tuanISO) {
  const all = await getThiDuaAll();
  const cuaLop = all[maLop] || {};
  if (!cuaLop[tuanISO]) {
    return {
      lop: { diem: DIEM_BAN_DAU, viPham: [], khenThuong: [] },
      caNhan: {},
    };
  }
  return cuaLop[tuanISO];
}

/**
 * Thêm vi phạm/khen thưởng cho LỚP
 */
export async function themChoLop(maLop, tuanISO, item) {
  const all = await getThiDuaAll();

  if (!all[maLop]) all[maLop] = {};
  if (!all[maLop][tuanISO]) {
    all[maLop][tuanISO] = {
      lop: { diem: DIEM_BAN_DAU, viPham: [], khenThuong: [] },
      caNhan: {},
    };
  }
  if (!all[maLop][tuanISO].lop) {
    all[maLop][tuanISO].lop = {
      diem: DIEM_BAN_DAU,
      viPham: [],
      khenThuong: [],
    };
  }

  const lop = all[maLop][tuanISO].lop;
  if (item.diem < 0) {
    lop.viPham.push(item);
  } else {
    lop.khenThuong.push(item);
  }

  let diem = DIEM_BAN_DAU;
  lop.viPham.forEach((v) => (diem += v.diem));
  lop.khenThuong.forEach((k) => (diem += k.diem));
  lop.diem = diem;

  await saveThiDuaAll(all);
  return lop;
}

/**
 * Thêm vi phạm/khen thưởng cho CÁ NHÂN
 */
export async function themChoCaNhan(maLop, tuanISO, studentId, item) {
  const all = await getThiDuaAll();

  if (!all[maLop]) all[maLop] = {};
  if (!all[maLop][tuanISO]) {
    all[maLop][tuanISO] = {
      lop: { diem: DIEM_BAN_DAU, viPham: [], khenThuong: [] },
      caNhan: {},
    };
  }
  if (!all[maLop][tuanISO].caNhan) all[maLop][tuanISO].caNhan = {};
  if (!all[maLop][tuanISO].caNhan[studentId]) {
    all[maLop][tuanISO].caNhan[studentId] = {
      diem: DIEM_BAN_DAU,
      viPham: [],
      khenThuong: [],
    };
  }

  const hs = all[maLop][tuanISO].caNhan[studentId];
  if (item.diem < 0) {
    hs.viPham.push(item);
  } else {
    hs.khenThuong.push(item);
  }

  let diem = DIEM_BAN_DAU;
  hs.viPham.forEach((v) => (diem += v.diem));
  hs.khenThuong.forEach((k) => (diem += k.diem));
  hs.diem = diem;

  await saveThiDuaAll(all);
  return hs;
}

/**
 * Xóa 1 vi phạm/khen thưởng của lớp
 */
export async function xoaCuaLop(maLop, tuanISO, index, loai) {
  const all = await getThiDuaAll();
  if (!all[maLop] || !all[maLop][tuanISO] || !all[maLop][tuanISO].lop) return;

  const lop = all[maLop][tuanISO].lop;
  if (loai === "viPham") lop.viPham.splice(index, 1);
  else lop.khenThuong.splice(index, 1);

  let diem = DIEM_BAN_DAU;
  lop.viPham.forEach((v) => (diem += v.diem));
  lop.khenThuong.forEach((k) => (diem += k.diem));
  lop.diem = diem;

  await saveThiDuaAll(all);
}

/**
 * Xóa 1 vi phạm/khen thưởng của cá nhân
 */
export async function xoaCuaCaNhan(maLop, tuanISO, studentId, index, loai) {
  const all = await getThiDuaAll();
  if (
    !all[maLop] ||
    !all[maLop][tuanISO] ||
    !all[maLop][tuanISO].caNhan ||
    !all[maLop][tuanISO].caNhan[studentId]
  )
    return;

  const hs = all[maLop][tuanISO].caNhan[studentId];
  if (loai === "viPham") hs.viPham.splice(index, 1);
  else hs.khenThuong.splice(index, 1);

  let diem = DIEM_BAN_DAU;
  hs.viPham.forEach((v) => (diem += v.diem));
  hs.khenThuong.forEach((k) => (diem += k.diem));
  hs.diem = diem;

  await saveThiDuaAll(all);
}