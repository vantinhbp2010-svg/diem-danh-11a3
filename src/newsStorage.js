import { db } from "./firebase";
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
} from "firebase/firestore";

const COL = collection(db, "news");
const IMGBB_KEY = "cb666bfbd86cca03a6552cf77a3d0e55";

/**
 * Upload ảnh lên ImgBB — miễn phí, không cần thẻ
 * Trả về URL ảnh
 */
export async function uploadAnh(file) {
  // Chuyển file thành base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result.split(",")[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Gửi lên ImgBB
  const formData = new FormData();
  formData.append("key", IMGBB_KEY);
  formData.append("image", base64);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message || "Upload ảnh thất bại");
  }

  return data.data.url;
}

export async function getAllNews() {
  const snap = await getDocs(COL);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  list.sort((a, b) => {
    if (a.ghim && !b.ghim) return -1;
    if (!a.ghim && b.ghim) return 1;
    return (b.thoiGian || 0) - (a.thoiGian || 0);
  });
  return list;
}

export async function addNews({ ten, tieuDe, noiDung, vaiTro, anhUrl }) {
  const tin = {
    ten: ten.trim(),
    tieuDe: tieuDe.trim(),
    noiDung: noiDung.trim(),
    vaiTro: vaiTro || "hocsinh",
    daDuyet: vaiTro === "giaovien",
    ghim: false,
    thoiGian: Date.now(),
    anhUrl: anhUrl || null,
  };
  const ref = await addDoc(COL, tin);
  return { id: ref.id, ...tin };
}

export async function duyetTin(id) {
  await updateDoc(doc(db, "news", id), { daDuyet: true });
}

export async function toggleGhim(id, ghim) {
  await updateDoc(doc(db, "news", id), { ghim: !ghim });
}

export async function xoaTin(id) {
  await deleteDoc(doc(db, "news", id));
}