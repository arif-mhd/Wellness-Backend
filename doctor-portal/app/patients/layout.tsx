"use client";

import SharedDashboardLayout from "@/components/DashboardLayout";

export default function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SharedDashboardLayout>{children}</SharedDashboardLayout>;
}
