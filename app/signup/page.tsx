import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { safeNext } from "@/lib/next-path";
import { SignUpForm } from "./SignUpForm";

export const metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/signup">) {
  if (await getViewer()) redirect("/");
  const next = safeNext(
    (await searchParams).next as string | undefined,
    "",
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 shadow-[var(--shadow)] sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mb-8 mt-2 text-muted">
          Then pick a handle, and write something.
        </p>
        <SignUpForm next={next} />

        <p className="mt-6 border-t border-rule pt-5 text-sm text-muted">
          Already have one?{" "}
          <Link href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"} className="text-accent underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Back to stories
        </Link>
      </p>
    </main>
  );
}
