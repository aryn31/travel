import Link from "next/link";
import { Draft, LegalPage } from "../legal/LegalPage";

export const metadata = {
  title: "Privacy",
  description: "What this site knows about you, and who else sees it.",
};

const UPDATED = "3 October 2026";

/*
 * Written from the code rather than from a template.
 *
 * Every claim below is one the software actually honours -- the cookie
 * list is the cookies that exist, the subprocessors are the services that
 * genuinely hold data, and "we do not track you" is true because there is
 * no analytics in the bundle. A privacy policy describing a site other
 * than this one would be worse than none.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="What we know"
      title="Privacy"
      summary="An email address, what you write, and almost nothing else. No analytics, no advertising, no tracking."
      updated={UPDATED}
    >
      <Draft />

      <h2>What we collect</h2>
      <p>
        <strong>Your email address.</strong> To sign you in, to send a code
        when you reset a password or delete your account, and nothing else.
        No newsletter, because there is not one.
      </p>
      <p>
        <strong>Your password, hashed.</strong> Stored as a scrypt hash, which
        cannot be reversed. Nobody here can read it, including us.
      </p>
      <p>
        <strong>What you write.</strong> Stories, trips, comments, the places
        you name, the photographs you upload. That is the point of the site.
      </p>
      <p>
        <strong>What you do with other people&apos;s writing.</strong> Likes,
        saves and reports. Likes are public. Saves are private and no count
        of them is shown anywhere. A report is seen only by moderators.
      </p>
      <p>
        <strong>When you joined and when you accepted these terms.</strong>
      </p>

      <h2>What we do not collect</h2>
      <p>
        No analytics. No advertising. No tracking pixels, no fingerprinting,
        no third-party scripts of any kind — the site&apos;s content security
        policy blocks them, so this is enforced rather than promised. We do
        not know which stories you read, only which ones you liked or saved,
        because you told us.
      </p>

      <h2>Cookies</h2>
      <p>There are three, and none of them are for advertising.</p>
      <ul>
        <li>
          <strong>A session cookie</strong> — how the site knows you are
          signed in. Deleted when you sign out.
        </li>
        <li>
          <strong>A free-read cookie</strong> — remembers which story a
          signed-out visitor has already read, so re-opening it stays free.
          It holds story slugs, not an identity.
        </li>
        <li>
          <strong>A theme preference</strong> — light or dark. Stored in your
          browser and never sent to the server.
        </li>
      </ul>
      <p>
        None of these need a consent banner, because none of them track you
        across sites.
      </p>

      <h2>Who else holds it</h2>
      <p>These are the only companies with access to any of your data.</p>
      <ul>
        <li>
          <strong>Supabase</strong> — the database and the photograph storage.
          Everything you write lives there.
        </li>
        <li>
          <strong>Google (Gmail SMTP)</strong> — sends the sign-in codes,
          password resets and contact messages. It sees your email address and
          the contents of those messages.
        </li>
        <li>
          <strong>The hosting provider</strong> — runs the site and keeps
          ordinary server logs, which include IP addresses for a short period.
        </li>
      </ul>
      <p>
        Nobody buys this data, because it is not for sale. It is not shared
        with anyone else except where the law actually requires it.
      </p>

      <h2>What is public</h2>
      <p>
        Your handle, display name, avatar, bio and anything you publish.
        Likes are public. Your email address is never shown to anybody. A
        story set to <strong>private</strong> is visible only to you; one set
        to <strong>unlisted</strong> is visible to anybody holding the link,
        which is the point of that setting.
      </p>
      {/*
        Said because it is true and would otherwise be a surprise. The
        bucket is public and the keys are two random UUIDs, so a
        photograph cannot be found or guessed -- but a link to one works
        for whoever holds it, whatever the story around it is set to.
      */}
      <p>
        One honest caveat about photographs. They are served from a storage
        bucket by a web address containing two random identifiers. Nobody
        can guess or list those addresses, and nothing links to a photograph
        in a story you have not published — but if the address itself is
        shared, it works. Treat an image link as you would the photograph:
        private until you hand it to somebody.
      </p>

      <h2>Your rights</h2>
      <p>
        <strong>Take a copy.</strong> Settings has a{" "}
        <em>Download everything</em> button producing a file with your
        stories, trips, comments and a list of your photographs.
      </p>
      <p>
        <strong>Correct it.</strong> Edit your profile, or edit a story after
        taking it out of circulation.
      </p>
      <p>
        <strong>Delete it.</strong> Also in settings. It asks for a code from
        your email address and then removes the account, the writing and the
        photographs. Permanently — there is no recovery window.
      </p>
      <p>
        If you are in the UK or the EU you also have the right to complain to
        your data protection authority.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Until you delete it. Sign-in codes expire after ten minutes. Server
        logs are kept briefly by the host. Backups roll off on their own
        cycle and are not used to restore anything you deleted on purpose.
      </p>

      <h2>Children</h2>
      <p>
        The site is not for under-16s. If an account turns out to belong to
        one, it is deleted.
      </p>

      <h2>Asking about any of this</h2>
      <p>
        Through the <Link href="/contact">contact form</Link>.
      </p>
    </LegalPage>
  );
}
