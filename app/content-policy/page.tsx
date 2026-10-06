import Link from "next/link";
import { Draft, LegalPage } from "../legal/LegalPage";

export const metadata = {
  title: "What is allowed",
  description: "What belongs here, what does not, and what happens then.",
};

const UPDATED = "3 October 2026";

export default function ContentPolicyPage() {
  return (
    <LegalPage
      eyebrow="House rules"
      title="What is allowed"
      summary="Write about where you went. Mean it, and make it yours."
      updated={UPDATED}
    >
      <Draft />

      <h2>What belongs here</h2>
      <p>
        Long-form writing about places you have been and what they were
        actually like. The site is built around that one thing: a story has
        a place, a length and photographs, and the whole archive is arranged
        by where people went.
      </p>

      <h2>What does not</h2>
      <p>
        <strong>Other people&apos;s work.</strong> Writing you did not write,
        photographs you did not take and do not have permission for. This is
        the rule broken most often by accident — a picture found online is
        somebody&apos;s work even when nothing on the page says so.
      </p>
      <p>
        <strong>Writing made to sell something.</strong> Affiliate reviews,
        link-building, search-engine filler, and anything generated in bulk.
        Travel writing is a favourite target for this, and it is the fastest
        way to lose an account here.
      </p>
      <p>
        <strong>Attacks on people.</strong> Harassment, hate directed at
        anybody for who they are, threats, or publishing somebody&apos;s
        private details.
      </p>
      <p>
        <strong>Anything illegal</strong>, and anything sexual involving
        children — which is reported to the authorities, not merely removed.
      </p>
      <p>
        <strong>Deception.</strong> Impersonating somebody, or presenting a
        trip you did not take as one you did.
      </p>

      <h2>A note on photographs of people</h2>
      <p>
        Travel writing is mostly about people, and most of the good
        photographs have strangers in them. Use judgement: somebody in a
        market square is one thing, a recognisable person in a situation they
        would not want published is another. If you would not show them the
        photograph, do not publish it.
      </p>

      <h2>Reporting something</h2>
      <p>
        Every story, trip and comment has a <strong>Report</strong> link.
        Choose the reason, add a sentence if it helps, and it goes to the
        moderation queue. You are not told what was decided, which is
        deliberate — reporting somebody should not become a way to find out
        anything about them.
      </p>
      <p>
        Copyright claims have their own route, on the{" "}
        <Link href="/contact">contact</Link> page.
      </p>

      <h2>What happens then</h2>
      <p>
        A moderator reads it. Something that breaks this policy is taken
        down: it disappears from the archive, the home page and search, and
        its link stops working for everyone but its author.
      </p>
      <p>
        <strong>The author is always told.</strong> It arrives in their
        notifications with a link to reply. Removal is reversible, and a
        moderator who got it wrong can put it back.
      </p>
      <p>
        An account that keeps breaking this policy loses the ability to
        publish. One posting the fourth category above is closed at once and
        reported.
      </p>

      <h2>If we got it wrong</h2>
      <p>
        Reply through the <Link href="/contact">contact form</Link>. A person reads
        it. Removals are undone when they should not have happened.
      </p>
    </LegalPage>
  );
}
