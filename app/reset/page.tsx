import Link from "next/link";
import { checkToken } from "@/lib/password-reset";
import { ResetForm } from "./ResetForm";

export const metadata = {
  title: "Choose a new password",
  // A page reachable only with a secret in the URL should never be indexed.
  robots: { index: false, follow: false },
};

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const check = await checkToken(token);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 shadow-[var(--shadow)] sm:p-10">
        {/* The heading belongs to ResetForm, not here: once the password is
            set it has to change too, and a server component cannot know
            that happened. Leaving it here said "Choose a new password /
            Then you're back in" above a notice explaining that you are in
            fact signed out. */}
        {check.ok ? (
          <ResetForm token={token} />
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {check.reason === "expired" ? "That link has expired" : "That link isn't valid"}
            </h1>
            <p className="mb-8 mt-2 leading-relaxed text-muted">
              {check.reason === "expired"
                ? "Reset links last an hour, and only work once."
                : "It may already have been used, or been cut short in an email."}
            </p>
            <Link
              href="/forgot"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
            >
              Send a new link
            </Link>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/signin" className="transition-colors hover:text-foreground">
          ← Back to sign in
        </Link>
      </p>
    </main>
  );
}
