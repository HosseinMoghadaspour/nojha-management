
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms/sms-provider";
import {
  generateOtp,
  hashOtp,
  normalizePhone,
} from "@/lib/auth/otp";
import {
  isOtpIpRateLimited,
  recordOtpIpAttempt,
} from "@/lib/auth/otp-rate-limit";

const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const OTP_TTL_MS = 3 * 60 * 1000;

const genericResponse = {
  message: "کد ورود ارسال شد.",
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("phone" in body) ||
      typeof body.phone !== "string"
    ) {
      return Response.json(
        { message: "شماره موبایل معتبر نیست." },
        { status: 400 },
      );
    }


    const forwardedFor = request.headers.get("x-forwarded-for");

const ip = forwardedFor
  ?.split(",")[0]
  ?.trim();

if (!ip) {
  return Response.json(
    { message: "امکان بررسی درخواست وجود ندارد." },
    { status: 400 },
  );
}

if (await isOtpIpRateLimited(ip)) {
  return Response.json(
    { message: "تعداد درخواست‌ها بیش از حد مجاز است. بعداً دوباره تلاش کنید." },
    { status: 429 },
  );
}

await recordOtpIpAttempt(ip);

    const phone = normalizePhone(body.phone);

    if (!phone) {
      return Response.json(
        { message: "شماره موبایل معتبر نیست." },
        { status: 400 },
      );
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MS);

    const recentRequests = await prisma.otpCode.count({
      where: {
        phone,
        purpose: "LOGIN",
        createdAt: { gte: windowStart },
      },
    });

    if (recentRequests >= MAX_REQUESTS) {
      return Response.json(
        { message: "درخواست‌های شما بیش از حد مجاز است. بعداً دوباره تلاش کنید." },
        { status: 429 },
      );
    }

    const latestRequest = await prisma.otpCode.findFirst({
      where: { phone, purpose: "LOGIN" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (
      latestRequest &&
      now.getTime() - latestRequest.createdAt.getTime() < COOLDOWN_MS
    ) {
      return Response.json(
        { message: "لطفاً پیش از درخواست دوباره کمی صبر کنید." },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isActive: true },
    });

    // پاسخ عمومی برای جلوگیری از افشای وجود حساب
    if (!user || !user.isActive) {
      return Response.json(genericResponse);
    }

    const code = generateOtp();
    const otpRecord = await prisma.otpCode.create({
      data: {
        phone,
        purpose: "LOGIN",
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    });

    // کدهای قبلی دیگر نباید قابل استفاده باشند.
    await prisma.otpCode.updateMany({
      where: {
        phone,
        purpose: "LOGIN",
        id: { not: otpRecord.id },
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    try {
      await sendSms({
        phone,
        message: `کد ورود نوژا: ${code}`,
      });
    } catch (error) {
      await prisma.otpCode.deleteMany({
        where: { id: otpRecord.id },
      });
      throw error;
    }

    return Response.json(genericResponse);
  } catch (error) {
    console.error("OTP request failed:", error);

    return Response.json(
      { message: "در حال حاضر امکان درخواست کد وجود ندارد." },
      { status: 500 },
    );
  }
}
