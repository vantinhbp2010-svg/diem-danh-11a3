import { requireAdmin } from "../_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authorization = await requireAdmin(req, res);
  if (!authorization) return;

  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      error: "Mật khẩu phải có từ 8 đến 128 ký tự.",
    });
  }

  let user;
  try {
    user = await authorization.auth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });
    await authorization.auth.setCustomUserClaims(user.uid, { teacher: true });

    return res.status(201).json({
      message: "Tạo tài khoản giáo viên thành công.",
      uid: user.uid,
    });
  } catch (error) {
    console.error("Không thể tạo tài khoản giáo viên:", error.code || error.message);
    if (user) {
      try {
        await authorization.auth.deleteUser(user.uid);
      } catch (cleanupError) {
        console.error(
          "Không thể dọn tài khoản tạo dở:",
          cleanupError.code || cleanupError.message
        );
        return res.status(500).json({
          error:
            "Không thể gán quyền sau khi tạo tài khoản. Tài khoản có thể cần được quản trị viên kiểm tra thủ công.",
        });
      }
    }
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email này đã được đăng ký." });
    }
    if (error.code === "auth/invalid-email") {
      return res.status(400).json({ error: "Địa chỉ email không hợp lệ." });
    }
    if (error.code === "auth/invalid-password") {
      return res.status(400).json({ error: "Mật khẩu không đạt yêu cầu." });
    }
    return res.status(500).json({ error: "Không thể tạo tài khoản giáo viên." });
  }
}
