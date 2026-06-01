"use client";

import SharedDashboardLayout from "@/components/DashboardLayout";

export default function VideoCallsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SharedDashboardLayout>{children}</SharedDashboardLayout>;
}
