import { requireAdmin } from "../_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authorization = await requireAdmin(req, res);
  if (!authorization) return;

  const uid = typeof req.body?.uid === "string" ? req.body.uid.trim() : "";
  if (!uid) {
    return res.status(400).json({ error: "Thiếu UID tài khoản giáo viên." });
  }
  if (uid === authorization.decodedToken.uid) {
    return res.status(400).json({ error: "Không thể tự xóa tài khoản quản trị." });
  }

  try {
    const user = await authorization.auth.getUser(uid);
    if (user.customClaims?.admin === true) {
      return res.status(403).json({ error: "Không thể xóa tài khoản quản trị." });
    }
    if (user.customClaims?.teacher !== true) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản giáo viên." });
    }

    await authorization.auth.deleteUser(uid);
    return res.status(200).json({ message: "Đã xóa tài khoản giáo viên." });
  } catch (error) {
    console.error("Không thể xóa tài khoản giáo viên:", error.code || error.message);
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    }
    return res.status(500).json({ error: "Không thể xóa tài khoản giáo viên." });
  }
}
