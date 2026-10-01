import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { suggestHandle } from "@/lib/handles";
import { safeNext } from "@/lib/next-path";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Pick your handle" };

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (viewer.profile) redirect(`/@${viewer.profile.handle}`);
  const next = safeNext((await searchParams).next as string | undefined, "");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-20">
      <div className="rounded-2xl border border-rule bg-surface p-8 shadow-[var(--shadow)] sm:p-10">
        <p className="eyebrow">
          One more thing
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Choose how you&apos;ll appear
        </h1>
        <p className="mb-8 mt-2 truncate text-sm text-muted">
          Signed in as {viewer.email}
        </p>
        <OnboardingForm suggestedHandle={suggestHandle(viewer.email)} next={next} />
      </div>
    </main>
  );
}
