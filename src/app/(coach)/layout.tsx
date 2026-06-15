import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "@/lib/auth";

/**
 * Coach app shell + auth guard. Every (coach) route re-checks the session here;
 * mutating actions re-check independently (convention 2).
 */
export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        className="hidden md:flex"
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <MobileNav
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
