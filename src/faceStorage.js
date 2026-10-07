import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_REF = doc(db, "diemdanh", "faces");

/**
 * Lấy dữ liệu khuôn mặt
 * Trả về: { HS001: [[...], [...]], HS002: [[...]] }
 */
export async function getFaces() {
  const snap = await getDoc(DOC_REF);
  if (!snap.exists()) return {};
  const raw = snap.data().data || {};

  // Chuyển từ object sang array
  const result = {};
  for (const id of Object.keys(raw)) {
    const item = raw[id];
    if (Array.isArray(item)) {
      result[id] = item;
    } else {
      // Dạng object: { d0: [...], d1: [...] }
      result[id] = Object.keys(item)
        .sort()
        .map((k) => item[k]);
    }
  }
  return result;
}

/**
 * Lưu dữ liệu khuôn mặt lên Firebase
 */
async function saveFaces(data) {
  // Chuyển từ array sang object để Firestore chấp nhận
  const wrapped = {};
  for (const id of Object.keys(data)) {
    const arr = data[id];
    const obj = {};
    arr.forEach((desc, i) => {
      obj["d" + i] = desc;
    });
    wrapped[id] = obj;
  }
  await setDoc(DOC_REF, { data: wrapped });
}

export async function saveFace(studentId, descriptor) {
  const data = await getFaces();
  if (!data[studentId]) data[studentId] = [];
  data[studentId].push(Array.from(descriptor));
  await saveFaces(data);
}

export async function clearFaces(studentId) {
  const data = await getFaces();
  delete data[studentId];
  await saveFaces(data);
}