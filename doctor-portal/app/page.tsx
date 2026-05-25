import { redirect } from "next/navigation";

// Root "/" → go to sign in page.
export default function HomePage() {
  redirect("/auth/login");
}
