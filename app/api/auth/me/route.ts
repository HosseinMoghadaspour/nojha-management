import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "وارد حساب نشده‌ای." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      roles: user.userRoles.map(({ role }) => role.name),
    },
  });
}
