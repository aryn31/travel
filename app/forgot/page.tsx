import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot your password" };

export default async function ForgotPage() {
  if (await getViewer()) redirect("/settings");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 shadow-[var(--shadow)] sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Forgot your password
        </h1>
        <p className="mb-8 mt-2 text-muted">
          It happens. We&apos;ll send you a link.
        </p>
        <ForgotForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Back to stories
        </Link>
      </p>
    </main>
  );
}
