import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="bg-card w-full max-w-md space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">DataScope</p>
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-muted-foreground text-sm">
            New accounts start with the read-only Viewer role.
          </p>
        </div>
        <RegisterForm />
        <p className="text-muted-foreground text-sm">
          Already registered?{" "}
          <Link className="text-foreground font-medium underline" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
