"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginMethod, setLoginMethod] = useState<"password" | "otp">(
    "password",
  );

  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");

  async function handleRequestOtp() {
    setOtpLoading(true);
    setOtpMessage("");

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.message ?? "درخواست کد انجام نشد.");
        return;
      }

      setOtpSent(true);
      setOtpMessage(
        data.message ?? "اگر شماره متعلق به حساب فعال باشد، کد ارسال می‌شود.",
      );
    } catch {
      setOtpMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpLoading(true);
    setOtpMessage("");

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.message ?? "کد واردشده معتبر نیست.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setOtpMessage("ارتباط با سرور برقرار نشد.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "ورود انجام نشد.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
            <Sprout className="size-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            مدیریت فروش نشاء نوژا
          </h1>

          <p className="text-sm text-muted-foreground">
            برای ورود به پنل مدیریت، اطلاعات خود را وارد کن.
          </p>
        </div>

        {loginMethod === "password" && (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-center">ورود به حساب</CardTitle>
              <CardDescription className="text-center">
                با نام کاربری و رمز عبور وارد شوید.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    placeholder="نام کاربری خود را وارد کن"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    maxLength={100}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="رمز عبور خود را وارد کن"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    maxLength={200}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-900"
                  disabled={loading}
                >
                  <LockKeyhole className="ml-2 size-4" />
                  {loading ? "در حال ورود..." : "ورود به پنل"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        {loginMethod === "otp" && (
          <Card className="border-border/70 shadow-sm">
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-phone">شماره موبایل</Label>
                  <Input
                    id="otp-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={otpSent || otpLoading}
                  />
                </div>

                {otpSent && (
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">کد شش‌رقمی</Label>
                    <Input
                      id="otp-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      dir="ltr"
                      maxLength={6}
                      placeholder="کد پیامک‌شده"
                      value={otpCode}
                      onChange={(event) =>
                        setOtpCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      disabled={otpLoading}
                    />
                  </div>
                )}

                {otpMessage && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {otpMessage}
                  </p>
                )}

                {!otpSent ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={otpLoading || !phone.trim()}
                    onClick={handleRequestOtp}
                  >
                    {otpLoading ? "در حال ارسال..." : "دریافت کد ورود"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full"
                      disabled={otpLoading || otpCode.length !== 6}
                      onClick={handleVerifyOtp}
                    >
                      {otpLoading ? "در حال بررسی..." : "تأیید کد و ورود"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={otpLoading}
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                        setOtpMessage("");
                      }}
                    >
                      تغییر شماره موبایل
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button
            type="button"
            variant={loginMethod === "password" ? "default" : "outline"}
            onClick={() => setLoginMethod("password")}
          >
            ورود با رمز عبور
          </Button>

          <Button
            type="button"
            variant={loginMethod === "otp" ? "default" : "outline"}
            onClick={() => setLoginMethod("otp")}
          >
            ورود پیامکی
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          سامانه داخلی مدیریت تولید و فروش نشاء نوژا
        </p>
      </div>
    </main>
  );
}
