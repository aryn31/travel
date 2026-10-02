import Link from "next/link";
import { getViewer } from "@/lib/session";
import { ContactForm } from "./ContactForm";

export const metadata = {
  title: "Contact us",
  description: "Questions, problems, or a story you think we should read.",
};

export default async function ContactPage() {
  // Open to everyone -- the people most likely to need it are the ones who
  // cannot get in. Prefilled when we already know who is asking.
  const viewer = await getViewer();

  return (
    <main className="flex-1">
      <section className="band topo bg-tint-sand">
        <div className="page py-12">
          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">Get in touch</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>
          <h1 className="font-display mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Say hello, or tell us
            <span className="text-accent"> what broke.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Questions, trouble signing in, a story that shouldn&apos;t be here,
            or something you think we should read.
          </p>
        </div>
      </section>

      <section className="page grid gap-12 py-14 pb-24 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div className="max-w-xl">
          <ContactForm
            defaultName={viewer?.profile?.displayName ?? ""}
            defaultEmail={viewer?.email ?? ""}
          />
        </div>

        <aside className="lg:pt-2">
          <div className="rounded-2xl border-2 border-rule bg-surface p-6">
            <h2 className="font-display text-xl font-semibold">
              Before you write
            </h2>
            <dl className="mt-5 space-y-5 text-sm leading-relaxed">
              <div>
                <dt className="font-medium">Can&apos;t sign in?</dt>
                <dd className="mt-1 text-muted">
                  Try <Link href="/forgot" className="text-accent underline underline-offset-2">resetting your password</Link> first — it
                  arrives in a minute or two, and it fixes most of it.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Something wrong with a story?</dt>
                <dd className="mt-1 text-muted">
                  Send us the link. We read every one of these.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Want your account deleted?</dt>
                <dd className="mt-1 text-muted">
                  Ask here and we&apos;ll do it — your stories go with it.
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}
