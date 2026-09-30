import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getViewer()) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 shadow-[var(--shadow)] sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mb-8 mt-2 text-muted">
          To write and publish travel stories.
        </p>
        <SignInForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Back to stories
        </Link>
      </p>
    </main>
  );
}
