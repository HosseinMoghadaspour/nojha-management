import { redirect } from "next/navigation";
import { Sprout, Users, Package, ClipboardList, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";

const sections = [
  {
    title: "مدیریت مشتریان",
    description: "ثبت مشتری، جست‌وجو و مشاهده اطلاعات تماس",
    icon: Users,
    href: "/customers",
  },
  {
    title: "کاربران و دسترسی‌ها",
    description: "مدیریت کاربران، نقش‌ها و مجوزها",
    icon: Users,
    href: "#",
  },
  {
    title: "محصولات نشاء",
    description: "مدیریت انواع نشاء و اطلاعات محصولات",
    icon: Package,
    href: "#",
  },
  {
    title: "تولید و موجودی",
    description: "پیگیری دوره‌های تولید و موجودی انبار",
    icon: ClipboardList,
    href: "#",
  },
];

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isSuperAdmin = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: { name: "SUPER_ADMIN" },
    },
    select: { userId: true },
  });

  if (!isSuperAdmin) {
    redirect("/login");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white">
              <Sprout className="size-5" />
            </div>
            <div>
              <h1 className="font-bold">پنل مدیریت نوژا</h1>
              <p className="text-xs text-muted-foreground">
                مدیریت تولید و فروش نشاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">
              خوش آمدی، {user.fullName}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">داشبورد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            از اینجا می‌توانی بخش‌های مختلف سامانه را مدیریت کنی.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <div
                key={section.title}
                className="rounded-xl border bg-background p-5 shadow-sm"
              >
                <Link
                  key={section.title}
                  href={section.href}
                  className="block rounded-xl border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="font-semibold">{section.title}</h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
