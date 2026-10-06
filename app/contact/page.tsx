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
                  Every story, trip and comment has a{" "}
                  <strong className="font-medium text-foreground">Report</strong>{" "}
                  link — that reaches the moderation queue directly, which is
                  faster than this form.
                </dd>
              </div>
              <div>
                <dt className="font-medium">Want your account deleted?</dt>
                <dd className="mt-1 text-muted">
                  You can do it yourself in{" "}
                  <Link href="/settings" className="text-accent underline underline-offset-2">
                    settings
                  </Link>
                  , and download everything first.
                </dd>
              </div>
            </dl>
          </div>
          {/*
            Its own block rather than a line in the list above. A copyright
            claim is a formal thing with required contents, and burying it
            among "can't sign in?" would mean the first few arrive missing
            half of what is needed.
          */}
          <div className="mt-6 rounded-2xl border-2 border-dashed border-rule p-6">
            <h2 className="font-display text-xl font-semibold">
              Copyright claims
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              If something here is your work, published without your
              permission, send a notice through this form with{" "}
              <strong className="font-medium text-foreground">
                “Copyright”
              </strong>{" "}
              as the first word.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Include: a link to the page, enough about the original for us
              to identify it, your contact details, a statement that you
              believe in good faith the use is unauthorised, and a statement
              that the notice is accurate and you are the owner or
              authorised to act for them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Material is taken down while it is looked at. If yours was
              removed and you think that was wrong, reply the same way and
              say so — a person reads it.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
