import Link from "next/link";
import { getViewer } from "@/lib/session";

export default async function Home() {
  const viewer = await getViewer();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Travel stories, told properly.
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed opacity-70">
        Long-form writing about places, with the photos that belong to it.
      </p>

      <div className="mt-8">
        {viewer ? (
          viewer.profile ? (
            <p className="text-sm opacity-70">
              Signed in as{" "}
              <Link href={`/@${viewer.profile.handle}`} className="underline">
                @{viewer.profile.handle}
              </Link>
              . The story editor arrives in Week 2.
            </p>
          ) : (
            <Link
              href="/onboarding"
              className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-85"
            >
              Finish setting up your profile
            </Link>
          )
        ) : (
          <Link
            href="/signin"
            className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background hover:opacity-85"
          >
            Start writing
          </Link>
        )}
      </div>
    </main>
  );
}
