export const metadata = { title: "Check your terminal" };

export default function CheckPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 sm:p-10">
        <span
          aria-hidden
          className="mb-5 inline-flex size-11 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"
        >
          ✉
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your link is in the terminal
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          This is local development, so no email was sent. Look at the terminal
          running{" "}
          <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-sm">
            npm run dev
          </code>{" "}
          — the sign-in link is printed there. It expires in 15 minutes.
        </p>
      </div>
      <p className="mt-6 text-center text-xs text-faint">
        Configure a real email provider to send these for real (PLAN.md §10.4).
      </p>
    </main>
  );
}
