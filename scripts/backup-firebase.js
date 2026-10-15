import admin from "firebase-admin";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const backupDir = join(process.cwd(), "backup");
mkdirSync(backupDir, { recursive: true });

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID || "diem-danh-11a3";

if (serviceAccountRaw) {
  const serviceAccount = JSON.parse(serviceAccountRaw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
} else {
  throw new Error(
    "Thiếu thông tin xác thực. Thiết lập FIREBASE_SERVICE_ACCOUNT hoặc GOOGLE_APPLICATION_CREDENTIALS trước khi chạy backup."
  );
}

const db = admin.firestore();

const backupFile = join(backupDir, `firebase-backup-${new Date().toISOString().slice(0, 16).replace(":", "").replace(":", "")}.json`);
const snapshot = {
  generatedAt: new Date().toISOString(),
  app: "diem-danh-11a3",
  data: {},
};

const diemdanhDocs = ["all", "faces", "thiDua", "thoiKhoaBieu", "ngayNghi"];
for (const docId of diemdanhDocs) {
  const ref = db.collection("diemdanh").doc(docId);
  const result = await ref.get();
  snapshot.data[`diemdanh/${docId}`] = result.exists ? result.data() : null;
}

const lopSnap = await db.collection("lop").get();
snapshot.data.lop = {};
lopSnap.forEach((doc) => {
  snapshot.data.lop[doc.id] = doc.data();
});

writeFileSync(backupFile, JSON.stringify(snapshot, null, 2));
console.log(`✅ Backup Firestore đã được tạo tại ${backupFile}`);
