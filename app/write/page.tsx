import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { createDraft } from "./actions";

export const metadata = { title: "Write" };

export default async function NewStoryPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  // Creating the draft on GET would mean every crawler, prefetch and back
  // button left an empty story behind, so it takes a deliberate POST.
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">New story</h1>
      <p className="mb-8 text-sm opacity-70">
        Starts as a private draft. Nothing is public until you publish it.
      </p>
      <form
        action={async () => {
          "use server";
          await createDraft();
        }}
      >
        <button
          type="submit"
          className="w-full rounded-lg bg-foreground px-3 py-2.5 font-medium text-background hover:opacity-85"
        >
          Start writing
        </button>
      </form>
    </main>
  );
}
