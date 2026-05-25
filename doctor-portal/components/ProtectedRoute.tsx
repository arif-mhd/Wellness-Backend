"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doesSessionExist } from "supertokens-web-js/recipe/session";

/**
 * Wraps any page that requires an approved doctor session.
 *
 * Flow:
 *  1. No session         → /auth/login
 *  2. Session exists but role is "doctor_pending" (awaiting admin approval)
 *                        → /auth/pending
 *  3. Session + "doctor" role → render children
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      const sessionExists = await doesSessionExist();

      if (!sessionExists) {
        router.replace("/auth/login");
        return;
      }

      // Ask the backend for the session's roles
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            // supertokens-web-js stores the token in memory; retrieve it via the SDK
            Authorization: `Bearer ${await getAccessToken()}`,
          },
        });

        if (!res.ok) {
          router.replace("/auth/login");
          return;
        }

        const data = await res.json();
        const roles: string[] = data.roles ?? [];

        if (roles.includes("doctor")) {
          setChecking(false); // ✅ approved doctor — allow through
        } else if (roles.includes("doctor_pending")) {
          router.replace("/auth/pending"); // ⏳ awaiting admin approval
        } else {
          router.replace("/auth/login"); // ❌ wrong role
        }
      } catch {
        router.replace("/auth/login");
      }
    }

    checkAccess();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
          <p className="text-sm text-gray-500 font-outfit">Checking session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Helper: get the current access token from supertokens-web-js ─────────────
async function getAccessToken(): Promise<string> {
  try {
    const Session = (await import("supertokens-web-js/recipe/session")).default;
    const token = await Session.getAccessToken();
    return token ?? "";
  } catch {
    return "";
  }
}
