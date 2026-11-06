import { auth, db } from "./firebase";
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const COL = collection(db, "news");

/**
 * Upload ảnh lên ImgBB — miễn phí, không cần thẻ
 * Trả về URL ảnh
 */
export async function uploadAnh(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("File tải lên không phải ảnh hợp lệ.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Cần đăng nhập giáo viên để tải ảnh.");
  }
  const idToken = await user.getIdToken();

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error("Không thể đọc dữ liệu ảnh."));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.readAsDataURL(file);
  });

  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ image: base64 }),
  });

  let data;
  try {
    data = await res.json();
  } catch (error) {
    throw new Error("Máy chủ trả về phản hồi tải ảnh không hợp lệ.", {
      cause: error,
    });
  }

  if (!res.ok || typeof data.url !== "string") {
    throw new Error(data.error || "Upload ảnh thất bại.");
  }

  return data.url;
}

export async function getAllNews(includePending = false) {
  const newsQuery = includePending
    ? COL
    : query(COL, where("daDuyet", "==", true));
  const snap = await getDocs(newsQuery);
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

export async function addNews({ ten, tieuDe, noiDung, anhUrl }) {
  const tin = {
    ten: ten.trim(),
    tieuDe: tieuDe.trim(),
    noiDung: noiDung.trim(),
    vaiTro: "giaovien",
    daDuyet: true,
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