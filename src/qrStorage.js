import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DOC_REF = doc(db, "diemdanh", "qr");

export async function getQRs() {
  const snap = await getDoc(DOC_REF);
  return snap.exists() ? snap.data().data || {} : {};
}

async function saveQRs(data) {
  await setDoc(DOC_REF, { data });
}

export async function saveQR(studentId, qrText) {
  const data = await getQRs();
  data[studentId] = qrText;
  await saveQRs(data);
}

export async function deleteQR(studentId) {
  const data = await getQRs();
  delete data[studentId];
  await saveQRs(data);
}

export async function findStudentByQR(qrText) {
  const data = await getQRs();
  const cleaned = qrText.trim();

  let found = Object.keys(data).find((id) => data[id] === cleaned);
  if (found) return found;

  found = Object.keys(data).find((id) => {
    const saved = data[id];
    if (!saved || saved.length < 6) return false;
    return cleaned.includes(saved) || saved.includes(cleaned);
  });
  if (found) return found;

  const match = cleaned.match(/\d{9,12}/);
  if (match) {
    const cccd = match[0];
    found = Object.keys(data).find((id) => {
      const saved = data[id];
      return saved && saved.includes(cccd);
    });
  }
  return found || null;
}