import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="bg-card w-full max-w-md space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">DataScope</p>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to explore your authorized datasets.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="text-muted-foreground text-sm">
          New to DataScope?{" "}
          <Link
            className="text-foreground font-medium underline"
            href="/register"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
