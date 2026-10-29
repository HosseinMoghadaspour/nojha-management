
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileAudio,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShoppingBasket,
  UserRound,
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

type CustomerContact = {
  id: string;
  type: "PHONE" | "IN_PERSON" | "OTHER";
  occurredAt: string;
  summary: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  audioRecordings: AudioRecording[];
};

type AudioRecording = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus: "UPLOADED" | "TRANSCRIBING" | "TRANSCRIBED" | "FAILED";
  transcript: string | null;
  processingError: string | null;
  createdAt: string;
};

type CustomerRequest = {
  id: string;
  productName: string;
  variety: string | null;
  quantity: string | number | null;
  unit: string | null;
  deliveryDate: string | null;
  status:
    | "NEW"
    | "UNDER_REVIEW"
    | "WAITING_FOR_CUSTOMER"
    | "FOLLOW_UP_REQUIRED"
    | "APPROVED"
    | "CANCELLED";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  followUps: {
    id: string;
    dueAt: string;
    completedAt: string | null;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    result: string | null;
    notes: string | null;
  }[];
  approvals: {
    id: string;
    fieldName: string;
    proposedValue: unknown;
    reason: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }[];
};

type FollowUp = {
  id: string;
  dueAt: string;
  completedAt: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  result: string | null;
  notes: string | null;
  createdAt: string;
  assignedTo: {
    id: string;
    fullName: string;
  } | null;
  request: {
    id: string;
    productName: string;
  } | null;
};

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
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  assignedTo: {
    id: string;
    fullName: string;
  } | null;
  contacts: CustomerContact[];
  requests: CustomerRequest[];
  followUps: FollowUp[];
};

type CustomerForm = {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  customerType: string;
  description: string;
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} بایت`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} کیلوبایت`;
  }

  return `${(size / (1024 * 1024)).toLocaleString("fa-IR", {
    maximumFractionDigits: 1,
  })} مگابایت`;
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

function getContactTypeLabel(type: CustomerContact["type"]) {
  switch (type) {
    case "PHONE":
      return "تماس تلفنی";
    case "IN_PERSON":
      return "مراجعه حضوری";
    case "OTHER":
      return "سایر";
    default:
      return type;
  }
}

function getRequestStatusLabel(status: CustomerRequest["status"]) {
  switch (status) {
    case "NEW":
      return "جدید";
    case "UNDER_REVIEW":
      return "در حال بررسی";
    case "WAITING_FOR_CUSTOMER":
      return "در انتظار مشتری";
    case "FOLLOW_UP_REQUIRED":
      return "نیازمند پیگیری";
    case "APPROVED":
      return "تأیید شده";
    case "CANCELLED":
      return "لغو شده";
    default:
      return status;
  }
}

function getFollowUpStatusLabel(status: FollowUp["status"]) {
  switch (status) {
    case "PENDING":
      return "در انتظار";
    case "COMPLETED":
      return "انجام شده";
    case "CANCELLED":
      return "لغو شده";
    default:
      return status;
  }
}

function getAudioStatusLabel(status: AudioRecording["processingStatus"]) {
  switch (status) {
    case "UPLOADED":
      return "بارگذاری شده";
    case "TRANSCRIBING":
      return "در حال تبدیل به متن";
    case "TRANSCRIBED":
      return "تبدیل به متن انجام شده";
    case "FAILED":
      return "پردازش ناموفق";
    default:
      return status;
  }
}

function getApprovalStatusLabel(status: CustomerRequest["approvals"][number]["status"]) {
  switch (status) {
    case "PENDING":
      return "در انتظار بررسی";
    case "APPROVED":
      return "تأیید شده";
    case "REJECTED":
      return "رد شده";
    default:
      return status;
  }
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
    case "TRANSCRIBED":
      return "default";
    case "CANCELLED":
    case "REJECTED":
    case "FAILED":
      return "destructive";
    case "PENDING":
    case "NEW":
    case "UPLOADED":
    case "UNDER_REVIEW":
    case "TRANSCRIBING":
      return "secondary";
    default:
      return "outline";
  }
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <Users className="size-8 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customer/${encodeURIComponent(customerId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "دریافت اطلاعات مشتری ناموفق بود.",
        );
      }

      const result = data as { customer: Customer };
      const currentCustomer = result.customer;

      setCustomer(currentCustomer);

      setForm({
        fullName: currentCustomer.fullName,
        phone: currentCustomer.phone,
        province: currentCustomer.province ?? "",
        city: currentCustomer.city ?? "",
        customerType: currentCustomer.customerType ?? "INDIVIDUAL",
        description: currentCustomer.description ?? "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات مشتری.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
  const controller = new AbortController();
  let active = true;

  async function fetchCustomer() {
    try {
      const response = await fetch(`/api/customer/${customerId}`, {
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "خطا در دریافت اطلاعات مشتری");
      }

      if (!active) return;

      // اینجا اطلاعات مشتری را در state قرار بده.
      // برای مثال:
      // setCustomer(data.customer);
      // setForm(...);
    } catch (error) {
      if (!active || controller.signal.aborted) return;

      setError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت اطلاعات مشتری"
      );
    } finally {
      if (active) {
        setIsLoading(false);
      }
    }
  }

  void fetchCustomer();

  return () => {
    active = false;
    controller.abort();
  };
}, [customerId]);
  function updateForm<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  function cancelEditing() {
    if (!customer) return;

    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      province: customer.province ?? "",
      city: customer.city ?? "",
      customerType: customer.customerType ?? "INDIVIDUAL",
      description: customer.description ?? "",
    });

    setIsEditing(false);
    setError("");
    setSuccess("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer || !form) return;

    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const phone = normalizeDigits(form.phone).trim();

    if (fullName.length < 2) {
      setError("نام مشتری باید حداقل دو حرف باشد.");
      return;
    }

    if (!/^09\d{9}$/.test(phone)) {
      setError("شماره موبایل باید ۱۱ رقم و با 09 شروع شود.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/customer/${encodeURIComponent(customer.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            phone,
            province: form.province.trim() || null,
            city: form.city.trim() || null,
            customerType: form.customerType.trim() || null,
            description: form.description.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const validationErrors = data.errors as
          | Record<string, string[] | undefined>
          | undefined;

        const firstValidationError = validationErrors
          ? Object.values(validationErrors).flat().find(Boolean)
          : undefined;

        throw new Error(
          firstValidationError ||
            data.message ||
            "ذخیره اطلاعات مشتری ناموفق بود.",
        );
      }

      setSuccess(data.message || "اطلاعات مشتری ذخیره شد.");
      setIsEditing(false);

      await loadCustomer();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره اطلاعات مشتری.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-muted/30 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </main>
    );
  }

  if (!customer || !form) {
    return (
      <main dir="rtl" className="min-h-screen bg-muted/30 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <Button variant="ghost">
            <Link href="/customers">
              <ArrowRight className="ml-2 size-4" />
              بازگشت به مشتریان
            </Link>
          </Button>

          <ErrorMessage
            message={error || "اطلاعات مشتری در دسترس نیست."}
          />

          <Button
            variant="outline"
            onClick={() => void loadCustomer()}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            تلاش دوباره
          </Button>
        </div>
      </main>
    );
  }

  const totalAudioCount = customer.contacts.reduce(
    (total, contact) => total + contact.audioRecordings.length,
    0,
  );

  const pendingFollowUps = customer.followUps.filter(
    (followUp) => followUp.status === "PENDING",
  ).length;

  return (
    <main dir="rtl" className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* مسیر صفحه */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="transition-colors hover:text-foreground">
            پنل مدیریت
          </Link>
          <span>/</span>
          <Link
            href="/customers"
            className="transition-colors hover:text-foreground"
          >
            مشتریان
          </Link>
          <span>/</span>
          <span className="text-foreground">{customer.fullName}</span>
        </div>

        {/* پیام‌ها */}
        {error && <ErrorMessage message={error} />}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            {success}
          </div>
        )}

        {/* سربرگ مشتری */}
        <Card>
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-16">
                  <UserRound className="size-8" />
                </div>

                <div className="min-w-0 space-y-2">
                  <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {customer.fullName}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={customer.isActive ? "default" : "outline"}
                    >
                      {customer.isActive ? "مشتری فعال" : "مشتری غیرفعال"}
                    </Badge>

                    <Badge variant="secondary">
                      {getCustomerTypeLabel(customer.customerType)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Phone className="size-4" />
                      <span dir="ltr">{customer.phone}</span>
                    </span>

                    <span className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      {[customer.city, customer.province]
                        .filter(Boolean)
                        .join("، ") || "موقعیت ثبت نشده"}
                    </span>

                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4" />
                      ثبت در {formatDate(customer.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline">
                  <Link href="/customers">
                    <ArrowRight className="ml-2 size-4" />
                    بازگشت
                  </Link>
                </Button>

                {!isEditing && (
                  <Button
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setIsEditing(true);
                    }}
                    className="gap-2"
                  >
                    <Pencil className="size-4" />
                    ویرایش اطلاعات
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* آمار سریع */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">سوابق تماس</p>
                <p className="text-xl font-bold">
                  {customer.contacts.length.toLocaleString("fa-IR")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBasket className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">درخواست‌های خرید</p>
                <p className="text-xl font-bold">
                  {customer.requests.length.toLocaleString("fa-IR")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock3 className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">پیگیری‌های باز</p>
                <p className="text-xl font-bold">
                  {pendingFollowUps.toLocaleString("fa-IR")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileAudio className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">فایل‌های صوتی</p>
                <p className="text-xl font-bold">
                  {totalAudioCount.toLocaleString("fa-IR")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* فرم ویرایش */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>ویرایش اطلاعات مشتری</CardTitle>
              <CardDescription>
                اطلاعات اصلی مشتری را تغییر بده و ذخیره کن.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">نام و نام خانوادگی *</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) =>
                        updateForm("fullName", event.target.value)
                      }
                      required
                      maxLength={150}
                      autoComplete="name"
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
                      maxLength={15}
                      autoComplete="tel"
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
                      maxLength={100}
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
                      maxLength={100}
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
                      maxLength={2000}
                      rows={2}
                      className="resize-y"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    <X className="ml-2 size-4" />
                    انصراف
                  </Button>

                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* اطلاعات تکمیلی */}
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات تکمیلی</CardTitle>
            <CardDescription>
              اطلاعات ثبت و مسئولیت مشتری
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ثبت‌کننده</p>
                <p className="font-medium">
                  {customer.createdBy?.fullName || "مشخص نشده"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">کارشناس مسئول</p>
                <p className="font-medium">
                  {customer.assignedTo?.fullName || "تعیین نشده"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">آخرین به‌روزرسانی</p>
                <p className="font-medium">
                  {formatDateTime(customer.updatedAt)}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted-foreground">توضیحات</p>
                <p className="whitespace-pre-wrap leading-7">
                  {customer.description || "توضیحی ثبت نشده است."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* سوابق تماس */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-5" />
              تاریخچه تماس‌ها
            </CardTitle>
            <CardDescription>
              تماس‌های تلفنی، مراجعات حضوری و یادداشت‌های ثبت‌شده
            </CardDescription>
          </CardHeader>

          <CardContent>
            {customer.contacts.length === 0 ? (
              <EmptyState
                title="هنوز سابقه تماسی ثبت نشده"
                description="سوابق تماس این مشتری در این بخش نمایش داده خواهند شد."
              />
            ) : (
              <div className="space-y-4">
                {customer.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="space-y-4 rounded-xl border p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {getContactTypeLabel(contact.type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(contact.occurredAt)}
                          </span>
                        </div>

                        <h3 className="font-semibold">
                          {contact.summary || "بدون عنوان"}
                        </h3>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        ثبت‌کننده: {contact.createdBy?.fullName || "نامشخص"}
                      </p>
                    </div>

                    {contact.notes && (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {contact.notes}
                      </p>
                    )}

                    {contact.audioRecordings.length > 0 && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold">
                          <FileAudio className="size-4" />
                          فایل‌های صوتی این تماس
                        </h4>

                        {contact.audioRecordings.map((audio) => (
                          <div
                            key={audio.id}
                            className="space-y-3 rounded-lg bg-muted/40 p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <FileAudio className="size-5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="break-all text-sm font-medium">
                                    {audio.originalName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(audio.sizeBytes)}
                                    {" · "}
                                    {formatDateTime(audio.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <Badge
                                variant={getStatusVariant(
                                  audio.processingStatus,
                                )}
                              >
                                {getAudioStatusLabel(audio.processingStatus)}
                              </Badge>
                            </div>

                            {audio.transcript && (
                              <div className="space-y-2 rounded-lg border bg-background p-3">
                                <p className="text-sm font-semibold">
                                  متن استخراج‌شده
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-7">
                                  {audio.transcript}
                                </p>
                              </div>
                            )}

                            {audio.processingError && (
                              <p className="text-sm text-destructive">
                                خطای پردازش: {audio.processingError}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* درخواست‌های خرید */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBasket className="size-5" />
              درخواست‌های خرید
            </CardTitle>
            <CardDescription>
              محصولات موردنیاز مشتری و وضعیت بررسی هر درخواست
            </CardDescription>
          </CardHeader>

          <CardContent>
            {customer.requests.length === 0 ? (
              <EmptyState
                title="درخواستی ثبت نشده"
                description="درخواست‌های خرید مشتری در این قسمت نمایش داده می‌شوند."
              />
            ) : (
              <div className="space-y-4">
                {customer.requests.map((request) => (
                  <div key={request.id} className="space-y-4 rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold">
                          {request.productName}
                        </h3>

                        {request.variety && (
                          <p className="text-sm text-muted-foreground">
                            رقم یا گونه: {request.variety}
                          </p>
                        )}
                      </div>

                      <Badge variant={getStatusVariant(request.status)}>
                        {getRequestStatusLabel(request.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">مقدار</p>
                        <p className="mt-1 font-medium">
                          {formatNumber(request.quantity)}
                          {request.unit ? ` ${request.unit}` : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          تاریخ تحویل موردنیاز
                        </p>
                        <p className="mt-1 font-medium">
                          {formatDate(request.deliveryDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">تاریخ ثبت</p>
                        <p className="mt-1 font-medium">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">ثبت‌کننده</p>
                        <p className="mt-1 font-medium">
                          {request.createdBy?.fullName || "نامشخص"}
                        </p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="mb-1 text-sm font-medium">توضیحات</p>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                          {request.notes}
                        </p>
                      </div>
                    )}

                    {request.approvals.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-sm font-semibold">
                          درخواست‌های تأیید تغییرات
                        </p>

                        {request.approvals.map((approval) => (
                          <div
                            key={approval.id}
                            className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                فیلد: {approval.fieldName}
                              </p>
                              {approval.reason && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  دلیل: {approval.reason}
                                </p>
                              )}
                              {approval.reviewNote && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  توضیح بررسی: {approval.reviewNote}
                                </p>
                              )}
                            </div>

                            <Badge variant={getStatusVariant(approval.status)}>
                              {getApprovalStatusLabel(approval.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {request.followUps.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-sm font-semibold">
                          پیگیری‌های این درخواست
                        </p>

                        {request.followUps.map((followUp) => (
                          <div
                            key={followUp.id}
                            className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                موعد: {formatDateTime(followUp.dueAt)}
                              </p>

                              {followUp.result && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  نتیجه: {followUp.result}
                                </p>
                              )}

                              {followUp.notes && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  یادداشت: {followUp.notes}
                                </p>
                              )}
                            </div>

                            <Badge variant={getStatusVariant(followUp.status)}>
                              {getFollowUpStatusLabel(followUp.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* پیگیری‌های مشتری */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5" />
              پیگیری‌های مشتری
            </CardTitle>
            <CardDescription>
              برنامه پیگیری، موعد انجام و نتیجه پیگیری‌ها
            </CardDescription>
          </CardHeader>

          <CardContent>
            {customer.followUps.length === 0 ? (
              <EmptyState
                title="پیگیری‌ای ثبت نشده"
                description="پیگیری‌های مستقل یا مرتبط با درخواست‌ها در این بخش نمایش داده می‌شوند."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">موعد پیگیری</TableHead>
                      <TableHead className="text-right">درخواست مرتبط</TableHead>
                      <TableHead className="text-right">مسئول</TableHead>
                      <TableHead className="text-right">وضعیت</TableHead>
                      <TableHead className="text-right">نتیجه</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {customer.followUps.map((followUp) => (
                      <TableRow key={followUp.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(followUp.dueAt)}
                        </TableCell>

                        <TableCell>
                          {followUp.request?.productName || "پیگیری عمومی"}
                        </TableCell>

                        <TableCell>
                          {followUp.assignedTo?.fullName || "تعیین نشده"}
                        </TableCell>

                        <TableCell>
                          <Badge variant={getStatusVariant(followUp.status)}>
                            {getFollowUpStatusLabel(followUp.status)}
                          </Badge>
                        </TableCell>

                        <TableCell className="min-w-48">
                          <div className="space-y-1">
                            <p className="text-sm">
                              {followUp.result || "نتیجه ثبت نشده"}
                            </p>

                            {followUp.notes && (
                              <p className="text-xs text-muted-foreground">
                                {followUp.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* دکمه‌های انتهای صفحه */}
        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
          <Button variant="outline">
            <Link href="/customers">
              <ArrowRight className="ml-2 size-4" />
              بازگشت به فهرست مشتریان
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => void loadCustomer()}
            disabled={isLoading || isSaving}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            به‌روزرسانی اطلاعات
          </Button>
        </div>
      </div>
    </main>
  );
}
