import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
]);

const createContactSchema = z
  .object({
    type: z.enum(["PHONE", "IN_PERSON", "OTHER"], {
      message: "نوع تماس معتبر نیست.",
    }),

    occurredAt: z.string().datetime().optional(),

    summary: z
      .string()
      .trim()
      .max(500, "خلاصه تماس نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.")
      .nullable()
      .optional(),

    notes: z
      .string()
      .trim()
      .max(5000, "توضیحات نمی‌تواند بیشتر از ۵۰۰۰ کاراکتر باشد.")
      .nullable()
      .optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    // 1. بررسی ورود کاربر
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "برای ثبت سابقه تماس ابتدا وارد حساب خود شوید.",
        401,
      );
    }

    // 2. بررسی نقش کاربر
    const hasPermission = user.userRoles.some(({ role }) =>
      ALLOWED_ROLES.has(role.name),
    );

    if (!hasPermission) {
      return errorResponse(
        "شما اجازه ثبت سابقه تماس را ندارید.",
        403,
      );
    }

    // 3. دریافت شناسه مشتری
    const { id: customerId } = await params;

    if (!customerId?.trim()) {
      return errorResponse("شناسه مشتری معتبر نیست.", 400);
    }

    // 4. خواندن بدنه درخواست
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "اطلاعات ارسالی معتبر نیست یا قالب JSON ندارد.",
        400,
      );
    }

    // 5. اعتبارسنجی اطلاعات
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "اطلاعات تماس را بررسی کنید.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 6. بررسی تاریخ تماس
    const occurredAt = data.occurredAt
      ? new Date(data.occurredAt)
      : new Date();

    if (Number.isNaN(occurredAt.getTime())) {
      return errorResponse("تاریخ تماس معتبر نیست.", 400);
    }

    if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return errorResponse(
        "تاریخ تماس نمی‌تواند بیشتر از پنج دقیقه در آینده باشد.",
        400,
      );
    }

    // 7. بررسی وجود و فعال بودن مشتری
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!customer) {
      return errorResponse("مشتری موردنظر پیدا نشد.", 404);
    }

    if (!customer.isActive) {
      return errorResponse(
        "امکان ثبت تماس برای مشتری غیرفعال وجود ندارد.",
        409,
      );
    }

    // 8. ثبت سابقه تماس
    const contact = await prisma.customerContact.create({
      data: {
        customerId: customer.id,
        type: data.type,
        occurredAt,
        summary: data.summary || null,
        notes: data.notes || null,
        createdById: user.id,
      },
      select: {
        id: true,
        type: true,
        occurredAt: true,
        summary: true,
        notes: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // 9. پاسخ موفق
    return NextResponse.json(
      {
        message: "سابقه تماس با موفقیت ثبت شد.",
        contact,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/customer/[id]/contacts failed:",
      error,
    );

    return errorResponse(
      "هنگام ثبت سابقه تماس خطایی رخ داد.",
      500,
    );
  }
}
