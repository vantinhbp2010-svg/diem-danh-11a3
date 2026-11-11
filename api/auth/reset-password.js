import {
  getAdminAuthInstance,
  getAdminFirestoreInstance,
} from "../_lib/firebaseAdmin.js";
import {
  consumeResetCode,
  getPasswordResetSecret,
} from "../_lib/passwordReset.js";

const INVALID_CODE_MESSAGE = "Mã xác nhận không hợp lệ hoặc đã hết hạn.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Vui lòng nhập email hợp lệ." });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: INVALID_CODE_MESSAGE });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({
      error: "Mật khẩu mới phải có từ 8 đến 128 ký tự.",
    });
  }

  let auth;
  let db;
  let secret;
  try {
    secret = getPasswordResetSecret();
    auth = getAdminAuthInstance();
    db = getAdminFirestoreInstance();
  } catch (error) {
    console.error("Cấu hình khôi phục mật khẩu chưa sẵn sàng:", error.message);
    return res.status(500).json({
      error: "Dịch vụ khôi phục mật khẩu hiện chưa được cấu hình.",
    });
  }

  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(400).json({ error: INVALID_CODE_MESSAGE });
      }
      throw error;
    }

    if (
      user.customClaims?.teacher !== true &&
      user.customClaims?.admin !== true
    ) {
      return res.status(400).json({ error: INVALID_CODE_MESSAGE });
    }

    const valid = await consumeResetCode({
      db,
      uid: user.uid,
      code,
      secret,
      now: Date.now(),
    });
    if (!valid) {
      return res.status(400).json({ error: INVALID_CODE_MESSAGE });
    }

    await auth.updateUser(user.uid, { password: newPassword });
    await auth.revokeRefreshTokens(user.uid);

    return res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
  } catch (error) {
    console.error(
      "Không thể đặt lại mật khẩu:",
      error.code || error.message
    );
    return res.status(500).json({
      error: "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.",
    });
  }
}
