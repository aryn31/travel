export const metadata = { title: "Check your terminal" };

export default function CheckPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">
        Your link is in the terminal
      </h1>
      <p className="text-sm leading-relaxed opacity-70">
        This is local development, so no email was sent. Look at the terminal
        running <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">npm run dev</code>{" "}
        — the sign-in link is printed there. It expires in 15 minutes.
      </p>
      <p className="mt-6 text-xs opacity-50">
        Configure a real email provider to send these for real (PLAN.md §10.4).
      </p>
    </main>
  );
}
