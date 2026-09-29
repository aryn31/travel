import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { suggestHandle } from "@/lib/handles";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Pick your handle" };

export default async function OnboardingPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (viewer.profile) redirect(`/@${viewer.profile.handle}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          One more thing
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Choose how you&apos;ll appear
        </h1>
        <p className="mb-8 mt-2 truncate text-sm text-muted">
          Signed in as {viewer.email}
        </p>
        <OnboardingForm suggestedHandle={suggestHandle(viewer.email)} />
      </div>
    </main>
  );
}
