import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return JSON.parse(raw);

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  const absolutePath = resolve(credentialsPath);
  if (!existsSync(absolutePath)) {
    throw new Error("Firebase Admin credentials file was not found.");
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function getAdminAuth() {
  if (getApps().length === 0) {
    const serviceAccount = readServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.project_id ||
        process.env.FIREBASE_PROJECT_ID ||
        "diem-danh-11a3",
    });
  }
  return getAuth();
}

export async function requireAdmin(req, res) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer (.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Cần đăng nhập để thực hiện thao tác này." });
    return null;
  }

  let auth;
  try {
    auth = getAdminAuth();
  } catch (error) {
    console.error("Khởi tạo Firebase Admin thất bại:", error.code || error.message);
    res.status(500).json({ error: "Máy chủ chưa được cấu hình xác thực quản trị." });
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(match[1], true);
    if (decodedToken.admin !== true) {
      res.status(403).json({ error: "Bạn không có quyền quản trị." });
      return null;
    }
    return { auth, decodedToken };
  } catch (error) {
    console.error("Xác thực yêu cầu quản trị thất bại:", error.code || error.message);
    res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    return null;
  }
}

export function getAdminAuthInstance() {
  return getAdminAuth();
}
