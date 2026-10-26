
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("خروج ناموفق بود.");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      window.alert("خروج انجام نشد؛ لطفاً دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className="ml-2 size-4" />
      {loading ? "در حال خروج..." : "خروج"}
    </Button>
  );
}
