import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        // ?flash= is read by components/FlashNotice.tsx, which says so
        // out loud and then strips the parameter.
        await signOut({ redirectTo: "/?flash=signedout" });
      }}
    >
      <button
        type="submit"
        className="rounded-full px-3 py-1.5 text-sm text-foreground/75 transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
