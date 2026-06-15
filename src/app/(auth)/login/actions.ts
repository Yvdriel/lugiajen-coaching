"use server";

import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginSchema } from "./schema";

export type LoginState = {
  ok: boolean;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  message?: string;
};

/**
 * Login server action (convention 2). Validates with zod, signs in via
 * auth.api.signInEmail (nextCookies sets the session cookie since this runs in
 * request scope), and redirects on success. Never throws for validation/bad
 * creds — returns a typed result the form re-hydrates into RHF.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "email" || key === "password") && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (err) {
    if (err instanceof APIError) {
      return { ok: false, message: "Onjuiste inloggegevens." };
    }
    throw err;
  }

  // redirect() throws NEXT_REDIRECT — must stay outside the try/catch.
  redirect("/dashboard");
}
