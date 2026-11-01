import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const ANNOUNCEMENT_DOC = doc(db, "diemdanh", "thongBaoToanTruong");

export async function getThongBaoAdmin() {
  const snap = await getDoc(ANNOUNCEMENT_DOC);
  return snap.exists() ? snap.data() : null;
}

export function subscribeThongBaoAdmin(onData, onError) {
  return onSnapshot(
    ANNOUNCEMENT_DOC,
    (snap) => onData(snap.exists() ? snap.data() : null),
    onError
  );
}

export async function setThongBaoAdmin(data) {
  await setDoc(ANNOUNCEMENT_DOC, data);
}
