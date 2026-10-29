"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  province: string | null;
  city: string | null;
  customerType: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

type CustomersResponse = {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type CustomerForm = {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  customerType: string;
  description: string;
};

const initialForm: CustomerForm = {
  fullName: "",
  phone: "",
  province: "",
  city: "",
  customerType: "INDIVIDUAL",
  description: "",
};

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    );
}

function getCustomerTypeLabel(type: string | null) {
  switch (type) {
    case "INDIVIDUAL":
      return "حقیقی";
    case "COMPANY":
      return "حقوقی";
    case "WHOLESALE":
      return "عمده‌فروش";
    case "RETAILER":
      return "خرده‌فروش";
    default:
      return type || "تعیین نشده";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageSize = 10;

  const loadCustomers = useCallback(
    async (query: string, currentPage: number) => {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(pageSize),
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(
          `/api/customers?${params.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || data.message || "دریافت فهرست مشتریان ناموفق بود.",
          );
        }

        const result = data as CustomersResponse;

        setCustomers(result.customers ?? []);
        setTotal(result.total ?? 0);
        setTotalPages(Math.max(1, result.totalPages ?? 1));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت اطلاعات مشتریان.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCustomers(search, page);
    }, search.trim() ? 350 : 0);

    return () => window.clearTimeout(timeout);
  }, [loadCustomers, search, page]);

  function updateForm<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const phone = normalizeDigits(form.phone).trim();

    if (!fullName) {
      setError("نام مشتری را وارد کن.");
      return;
    }

    if (!/^09\d{9}$/.test(phone)) {
      setError("شماره موبایل باید ۱۱ رقم و با 09 شروع شود.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          province: form.province.trim() || undefined,
          city: form.city.trim() || undefined,
          customerType: form.customerType,
          description: form.description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "ثبت مشتری ناموفق بود.",
        );
      }

      setForm(initialForm);
      setIsFormOpen(false);
      setPage(1);
      setSearch("");
      setSuccess("مشتری جدید با موفقیت ثبت شد.");

      await loadCustomers("", 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "خطا در ثبت مشتری.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/admin"
                className="transition-colors hover:text-foreground"
              >
                پنل مدیریت
              </Link>
              <span>/</span>
              <span>مشتریان</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              مدیریت مشتریان
            </h1>

            <p className="text-sm text-muted-foreground">
              اطلاعات مشتریان، شهر محل فعالیت و نوع همکاری را مدیریت کن.
            </p>
          </div>

          <Button
            onClick={() => {
              setError("");
              setSuccess("");
              setIsFormOpen((current) => !current);
            }}
            className="gap-2"
          >
            {isFormOpen ? (
              <X className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {isFormOpen ? "بستن فرم" : "افزودن مشتری"}
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {/* Summary */}
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                تعداد مشتریان مطابق جست‌وجو
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {isLoading ? "—" : total.toLocaleString("fa-IR")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Create form */}
        {isFormOpen && (
          <Card>
            <CardHeader>
              <CardTitle>ثبت مشتری جدید</CardTitle>
              <CardDescription>
                نام و شماره موبایل الزامی هستند. سایر اطلاعات را می‌توانی بعداً تکمیل کنی.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      نام و نام خانوادگی *
                    </Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) =>
                        updateForm("fullName", event.target.value)
                      }
                      placeholder="مثلاً علی رضایی"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">شماره موبایل *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      className="text-left"
                      value={form.phone}
                      onChange={(event) =>
                        updateForm("phone", event.target.value)
                      }
                      placeholder="09123456789"
                      autoComplete="tel"
                      maxLength={11}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerType">نوع مشتری</Label>
                    <select
                      id="customerType"
                      value={form.customerType}
                      onChange={(event) =>
                        updateForm("customerType", event.target.value)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="INDIVIDUAL">حقیقی</option>
                      <option value="COMPANY">حقوقی</option>
                      <option value="WHOLESALE">عمده‌فروش</option>
                      <option value="RETAILER">خرده‌فروش</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">استان</Label>
                    <Input
                      id="province"
                      value={form.province}
                      onChange={(event) =>
                        updateForm("province", event.target.value)
                      }
                      placeholder="نام استان"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">شهر</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(event) =>
                        updateForm("city", event.target.value)
                      }
                      placeholder="نام شهر"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="description">توضیحات</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      placeholder="توضیحات اولیه درباره مشتری..."
                      rows={2}
                      className="resize-y"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSaving}
                  >
                    انصراف
                  </Button>

                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {isSaving ? "در حال ثبت..." : "ثبت مشتری"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customers table */}
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div>
              <CardTitle>فهرست مشتریان</CardTitle>
              <CardDescription className="mt-1">
                برای مشاهده اطلاعات تکمیلی هر مشتری، وارد صفحه جزئیات او شو.
              </CardDescription>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="جست‌وجوی نام، موبایل یا شهر..."
                className="pr-9"
                aria-label="جست‌وجوی مشتریان"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">موبایل</TableHead>
                    <TableHead className="text-right">موقعیت</TableHead>
                    <TableHead className="text-right">نوع مشتری</TableHead>
                    <TableHead className="text-right">تاریخ ثبت</TableHead>
                    <TableHead className="text-left">جزئیات</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users className="size-8 opacity-50" />
                          <p>
                            {search.trim()
                              ? "مشتری‌ای با این مشخصات پیدا نشد."
                              : "هنوز مشتری‌ای ثبت نشده است."}
                          </p>
                          {!search.trim() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsFormOpen(true)}
                            >
                              <Plus className="ml-2 size-4" />
                              افزودن اولین مشتری
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="min-w-32 space-y-1">
                            <p className="font-medium">
                              {customer.fullName}
                            </p>
                            <Badge
                              variant={
                                customer.isActive ? "secondary" : "outline"
                              }
                            >
                              {customer.isActive ? "فعال" : "غیرفعال"}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span dir="ltr" className="inline-block text-sm">
                            {customer.phone}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {[customer.city, customer.province]
                              .filter(Boolean)
                              .join("، ") || "—"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {getCustomerTypeLabel(customer.customerType)}
                          </Badge>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(customer.createdAt)}
                        </TableCell>

                        <TableCell className="text-left">
                          <Button variant="ghost" size="sm">
                            <Link href={`/customers/${customer.id}`}>
                              مشاهده
                              <ArrowLeft className="mr-2 size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {total.toLocaleString("fa-IR")} مشتری
                <span className="mx-2">·</span>
                صفحه {page.toLocaleString("fa-IR")} از{" "}
                {totalPages.toLocaleString("fa-IR")}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="gap-1"
                >
                  <ArrowRight className="size-4" />
                  قبلی
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="gap-1"
                >
                  بعدی
                  <ArrowLeft className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
