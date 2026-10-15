import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "backup", "firebase-backup.json");
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID || "diem-danh-11a3";

if (!serviceAccountRaw && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "Thiếu thông tin xác thực. Thiết lập FIREBASE_SERVICE_ACCOUNT hoặc GOOGLE_APPLICATION_CREDENTIALS trước khi chạy restore."
  );
}

if (serviceAccountRaw) {
  const serviceAccount = JSON.parse(serviceAccountRaw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });
} else {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

try {
  const content = JSON.parse(readFileSync(file, "utf-8"));
  const entries = content.data || {};

  for (const [path, value] of Object.entries(entries)) {
    if (path === "lop") {
      for (const [lopId, lopValue] of Object.entries(value || {})) {
        await db.collection("lop").doc(lopId).set(lopValue);
      }
      continue;
    }

    const [collectionName, docId] = path.split("/");
    if (!collectionName || !docId) continue;
    await db.collection(collectionName).doc(docId).set(value || {});
  }

  console.log(`✅ Restore Firestore hoàn tất từ ${file}`);
} catch (error) {
  console.warn("Không tìm thấy file backup hoặc dữ liệu không hợp lệ:", error.message);
  process.exitCode = 1;
}
