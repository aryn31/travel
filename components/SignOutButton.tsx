import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
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
