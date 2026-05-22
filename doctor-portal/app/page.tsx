import { redirect } from "next/navigation";

// Root "/" → always go to login.
// ProtectedRoute on the dashboard will redirect logged-in users back.
export default function HomePage() {
  redirect("/auth/login");
}
