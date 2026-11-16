"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmation = String(formData.get("confirmPassword"));

    if (password !== confirmation) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
        }),
      });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Unable to create account.");
        return;
      }

      router.replace("/login?registered=1");
    } catch {
      setError("Unable to create account right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium">
        Name
        <input
          autoComplete="name"
          className="bg-background w-full rounded-md border px-3 py-2 font-normal"
          maxLength={200}
          minLength={2}
          name="name"
          required
        />
      </label>
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
          autoComplete="new-password"
          className="bg-background w-full rounded-md border px-3 py-2 font-normal"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        Confirm password
        <input
          autoComplete="new-password"
          className="bg-background w-full rounded-md border px-3 py-2 font-normal"
          minLength={12}
          name="confirmPassword"
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
