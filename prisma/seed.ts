
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const fullName = process.env.ADMIN_FULL_NAME?.trim();
const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!connectionString || !fullName || !username || !password) {
  throw new Error(
    "DATABASE_URL، ADMIN_FULL_NAME، ADMIN_USERNAME و ADMIN_PASSWORD باید در .env تنظیم شوند.",
  );
}

const adminFullName: string = fullName;
const adminUsername: string = username;
const adminPassword: string = password;

if (password.length < 12) {
  throw new Error("رمز مدیر باید حداقل ۱۲ کاراکتر داشته باشد.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const role = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: { title: "مدیر کل" },
    create: {
      name: "SUPER_ADMIN",
      title: "مدیر کل",
      description: "دسترسی کامل مدیریتی به سامانه نوژا",
    },
  });

 let user = await prisma.user.findUnique({
  where: { username: adminUsername },
});

  if (!user) {
    const passwordHash = await argon2.hash(adminPassword);

  user = await prisma.user.create({
  data: {
    fullName: adminFullName,
    username: adminUsername,
    passwordHash,
    isActive: true,
  },
});

    console.log("حساب مدیر کل ایجاد شد.");
  } else {
    console.log("این نام کاربری از قبل وجود دارد؛ رمز عبور تغییر نکرد.");
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log("نقش مدیر کل به کاربر متصل شد.");
}

main()
  .catch((error) => {
    console.error("خطا در ایجاد مدیر اولیه:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
