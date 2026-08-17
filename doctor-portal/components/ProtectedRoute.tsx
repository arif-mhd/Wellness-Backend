"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Wrap any page that requires login with this component.
 * If no session exists it redirects to /auth/login automatically.
 *
 * The check hits the backend (`/auth/me`) rather than trusting the local
 * front-token cookie alone — a locally-present token doesn't mean the
 * session is still valid server-side (e.g. the account was deleted, or
 * signed out from elsewhere), and a client-only check would let a stale
 * dashboard render before that ever surfaces.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (res.ok) {
        setChecking(false);
      } else {
        router.replace("/auth/login");
      }
    } catch {
      router.replace("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    checkSession();

    // A bfcache restore (browser Back/Forward landing on this page) fires
    // `pageshow` with persisted:true but does NOT rerun this effect — so
    // without this listener, a stale authenticated view could be shown
    // straight from cache without ever re-asking the backend.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setChecking(true);
        checkSession();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [checkSession]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Checking session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
