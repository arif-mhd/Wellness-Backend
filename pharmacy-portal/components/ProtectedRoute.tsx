"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doesSessionExist } from "supertokens-web-js/recipe/session";

async function getAccessToken(): Promise<string> {
  try {
    const Session = (await import("supertokens-web-js/recipe/session")).default;
    return (await Session.getAccessToken()) ?? "";
  } catch { return ""; }
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      if (!(await doesSessionExist())) { router.replace("/auth/login"); return; }
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${await getAccessToken()}` },
        });
        if (!res.ok) { router.replace("/auth/login"); return; }
        const { roles }: { roles: string[] } = await res.json();
        if (roles.includes("pharmacy"))         setChecking(false);
        else if (roles.includes("pharmacy_pending")) router.replace("/auth/pending");
        else router.replace("/auth/login");
      } catch { router.replace("/auth/login"); }
    }
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#22c55e]" />
          <p className="text-sm text-gray-500 font-outfit">Checking session…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
