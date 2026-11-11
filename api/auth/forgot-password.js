import { randomInt } from "node:crypto";
import process from "node:process";
import {
  getAdminAuthInstance,
  getAdminFirestoreInstance,
} from "../_lib/firebaseAdmin.js";
import {
  hashRateLimitKey,
  hashResetCode,
  getPasswordResetSecret,
  RESET_CODE_TTL_MS,
} from "../_lib/passwordReset.js";

const GENERIC_MESSAGE =
  "Nếu email thuộc tài khoản giáo viên, mã xác nhận sẽ được gửi đến hộp thư.";
const EMAIL_COOLDOWN_MS = 60 * 1000;
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_WINDOW_MAX_REQUESTS = 10;

async function claimRequestSlots(db, email, ip, now) {
  const emailRef = db
    .collection("password_reset_rate_limits")
    .doc(hashRateLimitKey(`email:${email}`));
  const ipRef = db
    .collection("password_reset_rate_limits")
    .doc(hashRateLimitKey(`ip:${ip}`));

  return db.runTransaction(async (transaction) => {
    const [emailSnapshot, ipSnapshot] = await Promise.all([
      transaction.get(emailRef),
      transaction.get(ipRef),
    ]);
    const emailData = emailSnapshot.exists ? emailSnapshot.data() : {};
    const ipData = ipSnapshot.exists ? ipSnapshot.data() : {};

    if (now - (emailData.lastRequestedAt || 0) < EMAIL_COOLDOWN_MS) {
      return false;
    }

    const inWindow =
      Number.isFinite(ipData.windowStartedAt) &&
      now - ipData.windowStartedAt < IP_WINDOW_MS;
    const ipCount = inWindow && Number.isInteger(ipData.count) ? ipData.count : 0;
    if (ipCount >= IP_WINDOW_MAX_REQUESTS) return false;

    transaction.set(
      emailRef,
      { lastRequestedAt: now, expiresAt: now + 24 * 60 * 60 * 1000 },
      { merge: true }
    );
    transaction.set(ipRef, {
      windowStartedAt: inWindow ? ipData.windowStartedAt : now,
      count: ipCount + 1,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
    return true;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Vui lòng nhập email hợp lệ." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  let secret;
  let auth;
  let db;
  try {
    secret = getPasswordResetSecret();
    if (!resendApiKey || !resendFromEmail) {
      throw new Error("Resend environment variables are not configured.");
    }
    auth = getAdminAuthInstance();
    db = getAdminFirestoreInstance();
  } catch (error) {
    console.error("Cấu hình khôi phục mật khẩu chưa sẵn sàng:", error.message);
    return res.status(500).json({
      error: "Dịch vụ khôi phục mật khẩu hiện chưa được cấu hình.",
    });
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : "") ||
    req.headers["x-real-ip"] ||
    "unknown";
  const now = Date.now();

  try {
    const allowed = await claimRequestSlots(db, email, String(ip), now);
    if (!allowed) {
      return res.status(202).json({ message: GENERIC_MESSAGE });
    }

    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(202).json({ message: GENERIC_MESSAGE });
      }
      throw error;
    }

    if (
      user.customClaims?.teacher !== true &&
      user.customClaims?.admin !== true
    ) {
      return res.status(202).json({ message: GENERIC_MESSAGE });
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashResetCode(user.uid, code, secret);
    const codeRef = db.collection("password_reset_codes").doc(user.uid);
    await codeRef.set({
      codeHash,
      attempts: 0,
      consumedAt: null,
      createdAt: now,
      expiresAt: now + RESET_CODE_TTL_MS,
    });

    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from: resendFromEmail,
          to: [email],
          subject: "Mã xác nhận đặt lại mật khẩu",
          text: `Mã xác nhận của bạn là ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
          html: `<p>Mã xác nhận đặt lại mật khẩu của bạn:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${code}</p><p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
        }),
      });
    } catch (error) {
      const latestCode = await codeRef.get();
      if (latestCode.data()?.codeHash === codeHash) await codeRef.delete();
      throw error;
    }

    if (!response.ok) {
      const latestCode = await codeRef.get();
      if (latestCode.data()?.codeHash === codeHash) await codeRef.delete();
      console.error("Resend từ chối gửi email đặt lại mật khẩu:", response.status);
      return res.status(502).json({
        error: "Không thể gửi email lúc này. Vui lòng thử lại sau.",
      });
    }

    return res.status(202).json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error(
      "Không thể khởi tạo yêu cầu đặt lại mật khẩu:",
      error.code || error.message
    );
    return res.status(500).json({
      error: "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.",
    });
  }
}
