
import { createHmac, randomInt } from "node:crypto";

export function normalizePhone(value: string): string | null {
  const digits = value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    )
    .replace(/[\s()-]/g, "");

  const phone = digits.startsWith("+98")
    ? `0${digits.slice(3)}`
    : digits.startsWith("98")
      ? `0${digits.slice(2)}`
      : digits;

  return /^09\d{9}$/.test(phone) ? phone : null;
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(phone: string, code: string): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET تنظیم نشده یا معتبر نیست.");
  }

  return createHmac("sha256", secret)
    .update(`${phone}:${code}`)
    .digest("hex");
}
