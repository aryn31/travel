import { ButtonLink } from "@/components/ui/Button";
import { HeroMountains } from "@/components/HeroMountains";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* The generated landscape the home page used before the photograph
          arrived. Kept, rather than deleted, because a 404 about places is
          exactly where it still earns its place. */}
      {/* Masked at the top: the slice crop cuts the sky mid-gradient and
          leaves a hard horizontal seam otherwise. */}
      <HeroMountains className="absolute inset-x-0 bottom-0 -z-10 h-72 w-full opacity-40 [mask-image:linear-gradient(to_bottom,transparent_0%,black_45%)]" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-72 bg-gradient-to-t from-background via-background/70 to-transparent"
      />

      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        No such place
      </h1>
      <p className="mt-4 max-w-sm leading-relaxed text-muted">
        This page doesn&apos;t exist — or it&apos;s a draft that isn&apos;t
        yours to read.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Back to stories</ButtonLink>
      </div>
    </main>
  );
}
