"use client";

import React, { useEffect, useState } from "react";

interface DesktopOnlyWrapperProps {
  children: React.ReactNode;
  /** Minimum viewport width (px) considered "desktop". Default: 1024 */
  minWidth?: number;
}

/**
 * Renders children on desktop screens.
 * On smaller screens, shows a friendly "please use a desktop" message.
 */
export default function DesktopOnlyWrapper({
  children,
  minWidth = 768,
}: DesktopOnlyWrapperProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= minWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [minWidth]);

  // Avoid flash on initial render — wait until we know the viewport size
  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-16 text-center select-none">
        {/* Monitor icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #e4edff 0%, #c7d8ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            boxShadow: "0 4px 20px rgba(106,139,255,0.15)",
          }}
        >
          <svg
            width={38}
            height={38}
            fill="none"
            stroke="#6A8BFF"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <rect x={2} y={3} width={20} height={14} rx={2} />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: "Outfit, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#1e293b",
            marginBottom: 12,
            lineHeight: 1.3,
          }}
        >
          Desktop View Required
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#64748b",
            maxWidth: 300,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          This section is optimised for tablet and larger screens. Please open
          it on a tablet, laptop, or desktop to manage schedules and settings.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 999,
            background: "#f1f5f9",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <svg
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx={12} cy={12} r={10} />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          Tip: Rotate to landscape or use a tablet/larger device
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
