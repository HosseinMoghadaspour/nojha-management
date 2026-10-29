import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {z} from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma"

const allowedRoles = new Set([
    "SUPER_ADMIN",
    "SALES_MANAGER",
    "SALES_EMPLOYEE",
]);

const updateCustomerSchema = z.object({
    fullName: z
    .string()
    .trim()
    .min(2 , "تام مشتری باید حداقل 2 حرف باشد.")
    .max(150)
    .optional(),

    phone: z.string().trim().min(10).max(15).optional(),

    province: z.string().trim().max(100).nullable().optional(),

    city: z.string().trim().max(100).nullable().optional(),

    customerType: z.string().trim().max(100).nullable().optional(),

    description: z.string().trim().max(2000).nullable().optional(),
})
.strict()
.refine((data) => Object.keys(data).length > 0 , {
    message: "حداقل یک فیلد برای ویرایش باید ارسال شود.",
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

// دریافت جزئیات مشتری
export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response!;
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { message: "شناسه مشتری معتبر نیست." },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        province: true,
        city: true,
        customerType: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },

        assignedTo: {
          select: {
            id: true,
            fullName: true,
          },
        },

        contacts: {
          orderBy: { occurredAt: "desc" },
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

            audioRecordings: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                processingStatus: true,
                transcript: true,
                processingError: true,
                createdAt: true,
              },
            },
          },
        },

        requests: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            productName: true,
            variety: true,
            quantity: true,
            unit: true,
            deliveryDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,

            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },

            followUps: {
              orderBy: { dueAt: "desc" },
              select: {
                id: true,
                dueAt: true,
                completedAt: true,
                status: true,
                result: true,
                notes: true,
              },
            },

            approvals: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                fieldName: true,
                proposedValue: true,
                reason: true,
                status: true,
                reviewNote: true,
                reviewedAt: true,
                createdAt: true,
              },
            },
          },
        },

        followUps: {
          orderBy: { dueAt: "desc" },
          select: {
            id: true,
            dueAt: true,
            completedAt: true,
            status: true,
            result: true,
            notes: true,
            createdAt: true,

            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },

            request: {
              select: {
                id: true,
                productName: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { message: "مشتری موردنظر پیدا نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("GET /api/customer/[id] failed:", error);

    return NextResponse.json(
      { message: "دریافت اطلاعات مشتری با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

// ویرایش اطلاعات اصلی مشتری
export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await getAuthorizedUser();

    if (!auth.user) {
      return auth.response!;
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { message: "شناسه مشتری معتبر نیست." },
        { status: 400 },
      );
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

    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "اطلاعات ارسال‌شده معتبر نیست.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { message: "مشتری موردنظر پیدا نشد." },
        { status: 404 },
      );
    }

    const updateData: Prisma.CustomerUpdateInput = {};

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
    }

    if (data.phone !== undefined) {
      const phone = normalizePhone(data.phone);

      if (!/^09\d{9}$/.test(phone)) {
        return NextResponse.json(
          {
            message: "شماره موبایل باید به شکل 09123456789 باشد.",
          },
          { status: 400 },
        );
      }

      updateData.phone = phone;
    }

    if (data.province !== undefined) {
      updateData.province = data.province || null;
    }

    if (data.city !== undefined) {
      updateData.city = data.city || null;
    }

    if (data.customerType !== undefined) {
      updateData.customerType = data.customerType || null;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        province: true,
        city: true,
        customerType: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "اطلاعات مشتری با موفقیت ویرایش شد.",
      customer,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message: "مشتری دیگری با این شماره موبایل ثبت شده است.",
        },
        { status: 409 },
      );
    }

    console.error("PATCH /api/customer/[id] failed:", error);

    return NextResponse.json(
      { message: "ویرایش اطلاعات مشتری با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
