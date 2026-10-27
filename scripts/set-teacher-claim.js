import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const teacherUid = process.env.FIREBASE_TEACHER_UID;
const projectId = process.env.FIREBASE_PROJECT_ID || "diem-danh-11a3";

function readServiceAccount() {
  if (serviceAccountRaw) return JSON.parse(serviceAccountRaw);
  if (!credentialsPath) {
    throw new Error(
      "Thiếu FIREBASE_TEACHER_UID hoặc thông tin xác thực. Thiết lập FIREBASE_SERVICE_ACCOUNT hoặc GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  const absolutePath = resolve(credentialsPath);
  if (existsSync(absolutePath)) {
    return JSON.parse(readFileSync(absolutePath, "utf8"));
  }

  const likelyPaths = [`${absolutePath}.json`, `${absolutePath}.txt`];
  const existingLikelyPath = likelyPaths.find((path) => existsSync(path));
  if (existingLikelyPath) {
    throw new Error(
      `Không tìm thấy file tại "${absolutePath}". Có thể Windows đã thêm đuôi file: "${existingLikelyPath}". Cập nhật GOOGLE_APPLICATION_CREDENTIALS theo đúng tên file hoặc bật hiển thị phần mở rộng trong File Explorer.`
    );
  }

  throw new Error(
    `Không tìm thấy file service account tại "${absolutePath}". Kiểm tra đường dẫn và tên file (Windows có thể ẩn phần mở rộng .txt).`
  );
}

async function main() {
  if (!teacherUid) {
    throw new Error("Thiếu biến môi trường FIREBASE_TEACHER_UID.");
  }

  const serviceAccount = readServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });

  const auth = getAuth();
  const teacher = await auth.getUser(teacherUid);
  await auth.setCustomUserClaims(teacherUid, {
    ...teacher.customClaims,
    teacher: true,
  });
  await auth.revokeRefreshTokens(teacherUid);
  console.log(`Đã cấp quyền giáo viên cho UID ${teacherUid}.`);
  console.log("Tài khoản cần đăng nhập lại để nhận custom claim mới.");
}

main().catch((error) => {
  console.error(`Lỗi cấp quyền giáo viên: ${error.message}`);
  process.exitCode = 1;
});
