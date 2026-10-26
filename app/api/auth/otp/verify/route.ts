
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import { hashOtp, normalizePhone } from "@/lib/auth/otp";
import {
  isOtpVerifyIpRateLimited,
  recordOtpVerifyIpAttempt,
} from "@/lib/auth/otp-rate-limit";

const MAX_ATTEMPTS = 5;

function invalidCodeResponse() {
  return Response.json(
    { message: "کد واردشده معتبر نیست یا منقضی شده است." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {

    const forwardedFor = request.headers.get("x-forwarded-for");
const ip = forwardedFor?.split(",")[0]?.trim();

if (!ip) {
  return Response.json(
    { message: "امکان بررسی درخواست وجود ندارد." },
    { status: 400 },
  );
}

if (await isOtpVerifyIpRateLimited(ip)) {
  return Response.json(
    {
      message:
        "تعداد تلاش‌ها بیش از حد مجاز است. بعداً دوباره تلاش کنید.",
    },
    { status: 429 },
  );
}

await recordOtpVerifyIpAttempt(ip);

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("phone" in body) ||
      typeof body.phone !== "string" ||
      !("code" in body) ||
      typeof body.code !== "string"
    ) {
      return Response.json(
        { message: "شماره موبایل یا کد واردشده معتبر نیست." },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);
    const code = body.code.trim();

    if (!phone || !/^\d{6}$/.test(code)) {
      return invalidCodeResponse();
    }

    const now = new Date();

    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        purpose: "LOGIN",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.attempts >= MAX_ATTEMPTS) {
      return invalidCodeResponse();
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return invalidCodeResponse();
    }

    const submittedHash = hashOtp(phone, code);

    if (submittedHash !== otp.codeHash) {
      // افزایش اتمیک تعداد تلاش‌ها؛ فقط تا سقف مجاز
      await prisma.otpCode.updateMany({
        where: {
          id: otp.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
        data: { attempts: { increment: 1 } },
      });

      return invalidCodeResponse();
    }

    // کد را فقط یک بار مصرف کن؛ از تأیید هم‌زمان جلوگیری می‌کند.
    const consumed = await prisma.otpCode.updateMany({
      where: {
        id: otp.id,
        codeHash: submittedHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      data: { consumedAt: new Date() },
    });

    if (consumed.count !== 1) {
      return invalidCodeResponse();
    }

    await createSession(user.id);

    return Response.json({
      message: "ورود با موفقیت انجام شد.",
      user: { id: user.id },
    });
  } catch (error) {
    console.error("OTP verification failed:", error);

    return Response.json(
      { message: "در حال حاضر امکان تأیید کد وجود ندارد." },
      { status: 500 },
    );
  }
}
