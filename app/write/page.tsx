import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { createDraft } from "./actions";

export const metadata = { title: "Write" };

export default async function NewStoryPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 text-center shadow-[var(--shadow)] sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">New story</h1>
        <p className="mx-auto mt-2 max-w-xs text-muted">
          It starts as a private draft. Nothing is public until you publish it.
        </p>

        {/* Creating the draft on GET would mean every crawler, prefetch and
            back button left an empty story behind, so it takes a POST. */}
        <form
          action={async () => {
            "use server";
            await createDraft();
          }}
          className="mt-8"
        >
          <Button type="submit" size="lg" className="w-full">
            Start writing
          </Button>
        </form>
      </div>
    </main>
  );
}
