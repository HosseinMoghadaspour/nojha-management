
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    await destroySession();

    return NextResponse.json({
      message: "با موفقیت از حساب خارج شدی.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { message: "خروج از حساب انجام نشد." },
      { status: 500 },
    );
  }
}
