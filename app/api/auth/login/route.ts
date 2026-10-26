
import { NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import {
  isLoginRateLimited,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "درخواست نامعتبر است." },
      { status: 400 },
    );
  }


  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
      return NextResponse.json(
          { message: "نام کاربری یا رمز عبور معتبر نیست." },
          { status: 400 },
        );
    }

    const { username, password } = parsed.data;

  if (await isLoginRateLimited(username)) {
  return Response.json(
    { message: "تعداد تلاش‌ها بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید." },
    { status: 429 },
  );
}


  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive || !user.passwordHash) {
        await recordFailedLogin(username);
      return NextResponse.json(
        { message: "نام کاربری یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      password,
    );

    if (!passwordIsValid) {
        await recordFailedLogin(username);
      return NextResponse.json(
        { message: "نام کاربری یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    await createSession(user.id);
    await clearLoginAttempts(username);

    return NextResponse.json({
      message: "ورود با موفقیت انجام شد.",
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "خطای داخلی سرور رخ داد." },
      { status: 500 },
    );
  }
}
