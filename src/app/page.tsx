import { redirect } from "next/navigation";

// Root entry — the coach app lives under /dashboard (which guards to /login).
export default function RootPage() {
  redirect("/dashboard");
}
