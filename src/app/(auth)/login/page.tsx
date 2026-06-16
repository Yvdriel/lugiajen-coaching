import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LanguageToggle } from "@/components/layout/language-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages } from "@/i18n/server";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  const nl = await getMessages();

  return (
    <main className="relative flex flex-1 items-center justify-center p-8">
      <div className="absolute left-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="font-heading text-xl">{nl.app.name}</h1>
          </CardTitle>
          <CardDescription>{nl.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
