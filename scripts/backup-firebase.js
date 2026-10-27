import admin from "firebase-admin";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

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

for (const collectionName of ["diemdanh", "lop", "news"]) {
  const collectionSnap = await db.collection(collectionName).get();
  for (const entry of collectionSnap.docs) {
    snapshot.data[`${collectionName}/${entry.id}`] = entry.data();

    if (collectionName === "lop") {
      for (const subcollectionName of ["faces", "thoiKhoaBieu"]) {
        const subcollectionSnap = await entry.ref
          .collection(subcollectionName)
          .get();
        for (const subdoc of subcollectionSnap.docs) {
          snapshot.data[
            `${collectionName}/${entry.id}/${subcollectionName}/${subdoc.id}`
          ] = subdoc.data();
        }
      }
    }
  }
}

writeFileSync(backupFile, JSON.stringify(snapshot, null, 2));
console.log(`✅ Backup Firestore đã được tạo tại ${backupFile}`);
