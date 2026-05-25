import { redirect } from "next/navigation";

// Root "/" → go to dashboard while auth session check is bypassed.
export default function HomePage() {
  redirect("/dashboard");
}
