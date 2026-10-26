
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function hashIdentifier(identifier: string): string {
  return createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("hex");
}

function getWindowStart(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

export async function isLoginRateLimited(
  identifier: string,
): Promise<boolean> {
  const identifierHash = hashIdentifier(identifier);

  const attempts = await prisma.authAttempt.count({
    where: {
      identifierHash,
      createdAt: { gte: getWindowStart() },
    },
  });

  return attempts >= MAX_ATTEMPTS;
}

export async function recordFailedLogin(
  identifier: string,
): Promise<void> {
  const identifierHash = hashIdentifier(identifier);
  const windowStart = getWindowStart();

  await prisma.authAttempt.deleteMany({
    where: {
      identifierHash,
      createdAt: { lt: windowStart },
    },
  });

  await prisma.authAttempt.create({
    data: { identifierHash },
  });
}

export async function clearLoginAttempts(
  identifier: string,
): Promise<void> {
  await prisma.authAttempt.deleteMany({
    where: {
      identifierHash: hashIdentifier(identifier),
    },
  });
}
