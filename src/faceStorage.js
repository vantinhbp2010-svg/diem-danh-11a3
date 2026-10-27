import { db } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

function facesRef(maLop) {
  if (!maLop || maLop.includes("/")) throw new Error("Mã lớp không hợp lệ");
  return doc(db, "lop", maLop, "faces", "data");
}

/**
 * Lấy dữ liệu khuôn mặt của một lớp.
 * Trả về: { HS001: [[...], [...]], HS002: [[...]] }
 */
export async function getFaces(maLop) {
  const snap = await getDoc(facesRef(maLop));
  if (!snap.exists()) return {};
  const raw = snap.data().data || {};

  const result = {};
  for (const id of Object.keys(raw)) {
    const item = raw[id];
    if (Array.isArray(item)) {
      result[id] = item;
    } else {
      result[id] = Object.keys(item)
        .sort()
        .map((key) => item[key]);
    }
  }
  return result;
}

async function saveFaces(maLop, data) {
  const wrapped = {};
  for (const id of Object.keys(data)) {
    const obj = {};
    data[id].forEach((descriptor, index) => {
      obj[`d${index}`] = descriptor;
    });
    wrapped[id] = obj;
  }
  await setDoc(facesRef(maLop), { data: wrapped });
}

export async function saveFace(maLop, studentId, descriptor) {
  const data = await getFaces(maLop);
  if (!data[studentId]) data[studentId] = [];
  data[studentId].push(Array.from(descriptor));
  await saveFaces(maLop, data);
}

export async function clearFaces(maLop, studentId) {
  const data = await getFaces(maLop);
  delete data[studentId];
  await saveFaces(maLop, data);
}

export async function clearAllFaces() {
  const classes = await getDocs(collection(db, "lop"));
  await Promise.all(
    classes.docs.map((classDoc) =>
      deleteDoc(doc(db, "lop", classDoc.id, "faces", "data"))
    )
  );
  await setDoc(doc(db, "diemdanh", "faces"), { data: {} });
}
