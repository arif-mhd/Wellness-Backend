"use client";

import SharedDashboardLayout from "@/components/DashboardLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SharedDashboardLayout>{children}</SharedDashboardLayout>
  );
}
