"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doesSessionExist } from "supertokens-web-js/recipe/session";
import { useAccountRole } from "@/hooks/useAccountRole";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const { role, pending, loading: roleLoading } = useAccountRole();

  useEffect(() => {
    async function check() {
      let exists = false;
      try { exists = await doesSessionExist(); } catch { exists = false; }
      if (!exists) { router.replace("/auth/login"); return; }
      setHasSession(true);
      setSessionChecked(true);
    }
    check();
  }, [router]);

  useEffect(() => {
    if (!sessionChecked || !hasSession || roleLoading) return;
    if (pending) { router.replace("/auth/pending"); return; }
    if (role !== "pharmacy" && role !== "lab") { router.replace("/auth/login"); }
  }, [sessionChecked, hasSession, roleLoading, pending, role, router]);

  const checking =
    !sessionChecked || !hasSession || roleLoading || pending ||
    (role !== "pharmacy" && role !== "lab");

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
