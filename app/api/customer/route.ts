import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "SUPER_ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
]);

const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "نام مشتری باید حداقل ۲ حرف باشد.").max(150),
  phone: z.string().trim().min(10).max(15),
  province: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  customerType: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
});

function normalizePhone(value: string) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (digit) =>
      String(persianDigits.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(arabicDigits.indexOf(digit)),
    )
    .replace(/[\s\-()]/g, "");
}

async function getAuthorizedUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "برای ادامه ابتدا وارد حساب خود شوید." },
        { status: 401 },
      ),
    };
  }

  const hasPermission = user.userRoles.some(({ role }) =>
    allowedRoles.has(role.name),
  );

  if (!hasPermission) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "اجازه دسترسی به مدیریت مشتریان را ندارید." },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response!;
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim() ?? "";

    const parsedPage = Number(url.searchParams.get("page") ?? "1");
    const parsedPageSize = Number(url.searchParams.get("pageSize") ?? "10");

    const page =
      Number.isInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const pageSize =
      Number.isInteger(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 50)
        : 10;

    const normalizedSearch = normalizePhone(search);

    const where: Prisma.CustomerWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: normalizedSearch,
                },
              },
              {
                city: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                province: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          phone: true,
          province: true,
          city: true,
          customerType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/customers failed:", error);

    return NextResponse.json(
      { message: "دریافت فهرست مشتریان با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response!;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "بدنه درخواست معتبر نیست." },
        { status: 400 },
      );
    }

    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "اطلاعات مشتری معتبر نیست.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const phone = normalizePhone(data.phone);

    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json(
        { message: "شماره موبایل باید به شکل 09123456789 باشد." },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone,
        province: data.province || null,
        city: data.city || null,
        customerType: data.customerType || null,
        description: data.description || null,
        createdById: auth.user.id,
        assignedToId: auth.user.id,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        province: true,
        city: true,
        customerType: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "مشتری با موفقیت ثبت شد.",
        customer,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "مشتری دیگری با این شماره موبایل ثبت شده است." },
        { status: 409 },
      );
    }

    console.error("POST /api/customers failed:", error);

    return NextResponse.json(
      { message: "ثبت مشتری با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
