"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";
import { loginSchema, type LoginInput } from "./schema";

const initialState: LoginState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  // Re-hydrate server-side field errors into RHF.
  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key as keyof LoginInput, { message });
    }
  }, [state, setError]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Bezig…" : "Inloggen"}
      </Button>
    </form>
  );
}
