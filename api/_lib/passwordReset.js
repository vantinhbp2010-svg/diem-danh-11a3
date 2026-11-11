import { Buffer } from "node:buffer";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

export const RESET_CODE_TTL_MS = 10 * 60 * 1000;
export const RESET_CODE_MAX_ATTEMPTS = 5;

export function getPasswordResetSecret() {
  const secret = process.env.PASSWORD_RESET_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("PASSWORD_RESET_SECRET must be at least 32 characters.");
  }
  return secret;
}

export function hashResetCode(uid, code, secret) {
  return createHmac("sha256", secret).update(`${uid}:${code}`).digest("hex");
}

export function hashRateLimitKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function matchesResetCode(expectedHash, actualHash) {
  if (
    typeof expectedHash !== "string" ||
    !/^[a-f\d]{64}$/i.test(expectedHash) ||
    typeof actualHash !== "string" ||
    !/^[a-f\d]{64}$/i.test(actualHash)
  ) {
    return false;
  }
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function consumeResetCode({ db, uid, code, secret, now }) {
  const ref = db.collection("password_reset_codes").doc(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;

    const data = snapshot.data();
    const attempts = Number.isInteger(data.attempts) ? data.attempts : 0;
    if (
      typeof data.expiresAt !== "number" ||
      data.expiresAt <= now ||
      data.consumedAt ||
      attempts >= RESET_CODE_MAX_ATTEMPTS
    ) {
      return false;
    }

    const valid = matchesResetCode(
      data.codeHash,
      hashResetCode(uid, code, secret)
    );
    if (!valid) {
      const nextAttempts = attempts + 1;
      transaction.update(ref, {
        attempts: nextAttempts,
        consumedAt: nextAttempts >= RESET_CODE_MAX_ATTEMPTS ? now : null,
      });
      return false;
    }

    transaction.update(ref, { consumedAt: now });
    return true;
  });
}
