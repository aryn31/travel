import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { DeleteAccount } from "./DeleteAccount";
import { deletionBlock, deletionSummary } from "@/lib/account";

export const metadata = { title: "Account" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  // Nothing to edit yet -- onboarding is where a profile gets created.
  if (!viewer.profile) redirect("/onboarding");

  const p = viewer.profile;
  /*
   * A staff account's identity is set on the server by admin:create and
   * is not its holder's to change. The fields the form offers -- bio,
   * website, where you are based, a cover photograph -- describe a travel
   * writer's public page, which a site account does not have.
   */
  const staff = viewer.role !== "user";

  const [summary, blocked] = await Promise.all([
    deletionSummary(viewer.userId),
    deletionBlock(viewer.userId),
  ]);

  return (
    <main className="flex-1">
      <section className="band topo bg-tint-sand">
        <div className="page py-12">
          <div className="flex items-baseline gap-4">
            <h2 className="eyebrow">Your account</h2>
            <span aria-hidden className="h-px flex-1 bg-rule" />
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                {staff ? "Your account" : "Edit your profile"}
              </h1>
              <p className="mt-3 truncate text-sm text-muted">
                Signed in as {viewer.email}
              </p>
            </div>
            <Link
              href={`/@${p.handle}`}
              className="rounded-full border-2 border-foreground/20 px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              View profile →
            </Link>
          </div>
        </div>
      </section>

      {!staff && (
      <section className="page py-12">
        <ProfileForm
          initial={{
            handle: p.handle,
            displayName: p.displayName,
            bio: p.bio ?? "",
            website: p.website ?? "",
            homeCountry: p.homeCountry ?? "",
          }}
          initialAvatarKey={p.avatarKey}
          initialCoverKey={p.coverKey}
        />
      </section>
      )}

      {staff && (
        <section className="page py-12">
          <div className="max-w-xl rounded-xl border-2 border-dashed border-rule p-6">
            <h2 className="font-display text-xl font-semibold">
              @{p.handle} is a site account
            </h2>
            <p className="mt-2 text-sm text-muted">
              Its name and handle are set when the account is made, with{" "}
              <code className="rounded bg-surface px-1">npm run admin:create</code>.
              There is nothing here to edit — the password below is the one
              thing that is yours to change.
            </p>
          </div>
        </section>
      )}

      <section className="page border-t border-rule py-12 pb-24">
        <div className="mb-8 flex items-baseline gap-4">
          <h2 className="eyebrow">
            {viewer.hasPassword ? "Password" : "Add a password"}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>
        <PasswordForm hasPassword={viewer.hasPassword} />
      </section>

      <section className="page border-t border-rule py-12 pb-24">
        <div className="mb-6 flex items-baseline gap-4">
          <h2 className="eyebrow">Leaving</h2>
          <span aria-hidden className="h-px flex-1 bg-rule" />
        </div>
        <DeleteAccount
          email={viewer.email}
          summary={summary}
          blocked={blocked}
        />
      </section>
    </main>
  );
}
