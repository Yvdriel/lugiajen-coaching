import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { nl } from "@/messages/nl";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-heading text-5xl font-semibold">404</p>
      <h1 className="text-xl font-medium">{nl.error.notFound}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {nl.error.notFoundBody}
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline" })}
      >
        {nl.error.backToDashboard}
      </Link>
    </div>
  );
}
