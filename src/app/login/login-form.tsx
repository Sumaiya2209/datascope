"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const redirectTo = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
        redirectTo,
      });

      if (!result || result.error) {
        setError("Email or password is incorrect.");
        return;
      }

      window.location.assign(result.url ?? "/");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {registered ? (
        <p className="text-sm text-green-700" role="status">
          Account created. You can sign in now.
        </p>
      ) : null}
      <label className="block space-y-2 text-sm font-medium">
        Email
        <input
          autoComplete="email"
          className="bg-background w-full rounded-md border px-3 py-2 font-normal"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        Password
        <input
          autoComplete="current-password"
          className="bg-background w-full rounded-md border px-3 py-2 font-normal"
          name="password"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
