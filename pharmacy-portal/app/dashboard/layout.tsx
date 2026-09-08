import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AccountRoleProvider } from "@/hooks/useAccountRole";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AccountRoleProvider>
      <ProtectedRoute>
        <DashboardLayout>{children}</DashboardLayout>
      </ProtectedRoute>
    </AccountRoleProvider>
  );
}
