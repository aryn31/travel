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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        One more thing
      </h1>
      <p className="mb-8 text-sm opacity-70">
        Signed in as {viewer.email}. Choose how you&apos;ll appear.
      </p>
      <OnboardingForm suggestedHandle={suggestHandle(viewer.email)} />
    </main>
  );
}
