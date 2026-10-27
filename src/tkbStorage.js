import { db } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

function tkbRef(maLop) {
  if (!maLop || maLop.includes("/")) throw new Error("Mã lớp không hợp lệ");
  return doc(db, "lop", maLop, "thoiKhoaBieu", "data");
}

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
  const snap = await getDoc(tkbRef(maLop));
  if (!snap.exists()) return null;
  const tkb = snap.data().data;
  return tkb ? chuanBiDoc(tkb) : null;
}

/**
 * Lấy TKB tất cả các lớp
 */
export async function getTKBAll() {
  const ketQua = {};
  const snap = await getDocs(collection(db, "lop"));
  await Promise.all(snap.docs.map(async (classDoc) => {
    const tkb = await getTKB(classDoc.id);
    if (tkb) ketQua[classDoc.id] = tkb;
  }));
  return ketQua;
}

/**
 * Lưu TKB cho 1 lớp
 */
export async function saveTKB(maLop, tkb) {
  await setDoc(tkbRef(maLop), { data: chuanBiLuu(tkb) });
}

/**
 * Xóa TKB của 1 lớp
 */
export async function xoaTKB(maLop) {
  await deleteDoc(tkbRef(maLop));
}