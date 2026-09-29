import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        No such place
      </h1>
      <p className="mt-3 leading-relaxed text-muted">
        This page doesn&apos;t exist — or it&apos;s a draft that isn&apos;t
        yours to read.
      </p>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/">Back to stories</ButtonLink>
      </div>
    </main>
  );
}
