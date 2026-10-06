import Link from "next/link";
import { Draft, LegalPage } from "../legal/LegalPage";

export const metadata = {
  title: "Terms",
  description: "What you agree to by writing here.",
};

const UPDATED = "3 October 2026";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The agreement"
      title="Terms"
      summary="You keep what you write. We get just enough permission to show it to people."
      updated={UPDATED}
    >
      <Draft />

      <h2>What this is</h2>
      <p>
        Wendfolk is a place to publish long-form travel writing. Using it
        means agreeing to what is on this page. If you do not agree, do not
        use it — and if you have an account, you can close it at any time
        from your settings.
      </p>

      <h2>Your account</h2>
      <p>
        You need to be at least 16 to have one. One person, one account;
        keep your password to yourself and tell us if you think somebody
        else has it. You are responsible for what happens under your
        account.
      </p>

      <h2>What you write stays yours</h2>
      <p>
        You keep ownership and copyright of everything you write and
        photograph here. Nothing on this page changes that.
      </p>

      {/*
        The clause this whole page exists for. It is written to describe
        what the software actually does, which is why it says "derivative
        works" -- every upload is resized to 2560px before it is stored --
        and why it does not promise instant deletion everywhere, because
        lib/media-gc.ts sweeps on a delay and the host keeps backups.
      */}
      <p>
        To show your work to anybody, we need your permission to handle it.
        So by publishing here you grant Wendfolk a{" "}
        <strong>non-exclusive, worldwide, royalty-free licence</strong> to
        store, reproduce, display and distribute your content, and to{" "}
        <strong>create derivative works of it</strong> — meaning resizing,
        re-encoding and generating preview images — for the sole purpose of
        operating and promoting the site.
      </p>
      <p>
        This licence ends when you delete the content or your account. Two
        honest exceptions: copies already made by caches and content
        delivery networks expire on their own schedule, and routine
        encrypted backups roll off on theirs. Neither is used to keep
        showing your work after you have removed it.
      </p>
      <p>
        We do not sell your writing, licence it to anybody else, or use it
        to train machine-learning models.
      </p>

      <h2>What you are promising us</h2>
      <p>
        That the work is yours to publish — that you wrote the words and
        took the photographs, or have permission for anything you did not.
        That is the whole of it, and it is the promise most likely to be
        broken by accident: a photograph found online is somebody else&apos;s
        work even when it is uncredited.
      </p>
      <p>
        What is not allowed is on the{" "}
        <Link href="/content-policy">content policy</Link> page, and it is part of
        this agreement.
      </p>

      <h2>What we can do about it</h2>
      <p>
        We can remove anything that breaks the content policy, and suspend
        or close an account that keeps breaking it. When something of yours
        is removed you are told, in your notifications, with a way to reply.
        We try to explain; we do not promise to argue.
      </p>
      <p>
        If you believe something here infringes your copyright, the takedown
        procedure is on the <Link href="/contact">contact</Link> page.
      </p>

      <h2>Leaving</h2>
      <p>
        You can delete your account from settings. It asks for a code from
        your email address, and then it is permanent: the stories, the
        trips, the photographs, the comments. There is no undo and no copy
        kept for us. Before you do it, you can{" "}
        <strong>download everything</strong> from the same page.
      </p>

      <h2>The boring but necessary part</h2>
      <p>
        The site is provided as it is. It is run by one person and may be
        unavailable, lose data, or stop existing. Keep your own copy of
        anything you would be sorry to lose — the export button is there for
        exactly that.
      </p>
      <p>
        To the extent the law allows, Wendfolk is not liable for indirect or
        consequential loss arising from using it. Nothing here limits
        liability for death, personal injury, or fraud, because that cannot
        be limited.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change in a way that matters, the date at the top
        changes and account holders are told before it takes effect.
        Continuing to use the site after that means accepting the new
        version.
      </p>

      <h2>Getting in touch</h2>
      <p>
        Through the <Link href="/contact">contact form</Link>. It reaches a person,
        not a queue.
      </p>
    </LegalPage>
  );
}
