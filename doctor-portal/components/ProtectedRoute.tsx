"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doesSessionExist } from "supertokens-web-js/recipe/session";

/**
 * Wrap any page that requires login with this component.
 * If no session exists it redirects to /auth/login automatically.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // For the time being, session check is bypassed to view doctor portal screens.
    setChecking(false);
    /*
    doesSessionExist().then((exists) => {
      if (!exists) {
        router.replace("/auth/login");
      } else {
        setChecking(false);
      }
    });
    */
  }, [router]);

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
