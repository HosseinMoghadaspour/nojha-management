
type SendSmsInput = {
  phone: string;
  message: string;
};

export async function sendSms({
  phone,
  message,
}: SendSmsInput): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "سرویس ارسال پیامک هنوز پیکربندی نشده است.",
    );
  }

  // حالت آزمایشی فقط در محیط توسعه
  console.info("[SMS DEV MODE]", {
    phone,
    message,
  });
}
