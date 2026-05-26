"use client";

import SharedDashboardLayout from "@/components/DashboardLayout";

export default function AppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SharedDashboardLayout>{children}</SharedDashboardLayout>;
}
