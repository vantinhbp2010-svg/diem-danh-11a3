import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const adminUid = process.env.FIREBASE_ADMIN_UID;
const projectId = process.env.FIREBASE_PROJECT_ID || "diem-danh-11a3";

function readServiceAccount() {
  if (serviceAccountRaw) return JSON.parse(serviceAccountRaw);
  if (!credentialsPath) {
    throw new Error(
      "Thiếu thông tin xác thực. Thiết lập FIREBASE_SERVICE_ACCOUNT hoặc GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  const absolutePath = resolve(credentialsPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Không tìm thấy file service account tại "${absolutePath}".`);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

async function main() {
  if (!adminUid) throw new Error("Thiếu biến môi trường FIREBASE_ADMIN_UID.");

  const serviceAccount = readServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });

  const auth = getAuth();
  const user = await auth.getUser(adminUid);
  await auth.setCustomUserClaims(adminUid, {
    ...user.customClaims,
    teacher: true,
    admin: true,
  });
  await auth.revokeRefreshTokens(adminUid);
  console.log(`Đã cấp quyền quản trị cho UID ${adminUid}.`);
  console.log("Tài khoản cần đăng nhập lại để nhận custom claim mới.");
}

main().catch((error) => {
  console.error(`Lỗi cấp quyền quản trị: ${error.message}`);
  process.exitCode = 1;
});
