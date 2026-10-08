import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_TKB = doc(db, "diemdanh", "thoiKhoaBieu");

/**
 * Chuyển mảng boolean thành object để Firestore lưu được
 * [true, false, true] → { t0: true, t1: false, t2: true }
 */
function mangSangObject(mang) {
  const obj = {};
  mang.forEach((v, i) => {
    obj[`t${i}`] = v;
  });
  return obj;
}

/**
 * Chuyển object về mảng
 * { t0: true, t1: false } → [true, false]
 */
function objectSangMang(obj, doDai) {
  const arr = [];
  for (let i = 0; i < doDai; i++) {
    arr.push(obj[`t${i}`] === true);
  }
  return arr;
}

/**
 * Chuẩn bị TKB để lưu Firestore (chuyển mảng → object)
 */
function chuanBiLuu(tkb) {
  const ketQua = {};
  Object.keys(tkb).forEach((thu) => {
    ketQua[thu] = {
      sang: mangSangObject(tkb[thu].sang),
      chieu: mangSangObject(tkb[thu].chieu),
    };
  });
  return ketQua;
}

/**
 * Chuẩn bị TKB để đọc (chuyển object → mảng)
 */
function chuanBiDoc(tkb) {
  const ketQua = {};
  Object.keys(tkb).forEach((thu) => {
    ketQua[thu] = {
      sang: objectSangMang(tkb[thu].sang || {}, 5),
      chieu: objectSangMang(tkb[thu].chieu || {}, 4),
    };
  });
  return ketQua;
}

/**
 * Lấy TKB của 1 lớp
 */
export async function getTKB(maLop) {
  if (!maLop) return null;
  const snap = await getDoc(DOC_TKB);
  if (!snap.exists()) return null;
  const all = snap.data().data || {};
  const tkbCuaLop = all[maLop];
  if (!tkbCuaLop) return null;
  return chuanBiDoc(tkbCuaLop);
}

/**
 * Lấy TKB tất cả các lớp
 */
export async function getTKBAll() {
  const snap = await getDoc(DOC_TKB);
  if (!snap.exists()) return {};
  const all = snap.data().data || {};
  const ketQua = {};
  Object.keys(all).forEach((maLop) => {
    ketQua[maLop] = chuanBiDoc(all[maLop]);
  });
  return ketQua;
}

/**
 * Lưu TKB cho 1 lớp
 */
export async function saveTKB(maLop, tkb) {
  if (!maLop) throw new Error("Thiếu mã lớp");

  const snap = await getDoc(DOC_TKB);
  const all = snap.exists() ? snap.data().data || {} : {};

  all[maLop] = chuanBiLuu(tkb);

  await setDoc(DOC_TKB, { data: all });
}

/**
 * Xóa TKB của 1 lớp
 */
export async function xoaTKB(maLop) {
  const snap = await getDoc(DOC_TKB);
  const all = snap.exists() ? snap.data().data || {} : {};
  delete all[maLop];
  await setDoc(DOC_TKB, { data: all });
}