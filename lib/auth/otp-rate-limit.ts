import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 10;

function hashIdentifier(identifier: string): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET تنظیم نشده است.");
  }

  return createHmac("sha256", secret)
    .update(identifier)
    .digest("hex");
}

export async function isOtpIpRateLimited(
  ip: string,
): Promise<boolean> {
  const identifierHash = hashIdentifier(`otp-request-ip:${ip}`);
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const attempts = await prisma.authAttempt.count({
    where: {
      identifierHash,
      createdAt: { gte: windowStart },
    },
  });

  return attempts >= MAX_REQUESTS_PER_IP;
}

export async function recordOtpIpAttempt(
  ip: string,
): Promise<void> {
  const identifierHash = hashIdentifier(`otp-request-ip:${ip}`);

  await prisma.authAttempt.create({
    data: { identifierHash },
  });
}

const MAX_VERIFY_ATTEMPTS_PER_IP = 20;

export async function isOtpVerifyIpRateLimited(
  ip: string,
): Promise<boolean> {
  const identifierHash = hashIdentifier(`otp-verify-ip:${ip}`);
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const attempts = await prisma.authAttempt.count({
    where: {
      identifierHash,
      createdAt: { gte: windowStart },
    },
  });

  return attempts >= MAX_VERIFY_ATTEMPTS_PER_IP;
}

export async function recordOtpVerifyIpAttempt(
  ip: string,
): Promise<void> {
  const identifierHash = hashIdentifier(`otp-verify-ip:${ip}`);

  await prisma.authAttempt.create({
    data: { identifierHash },
  });
}
